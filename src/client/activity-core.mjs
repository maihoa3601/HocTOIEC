import {answerText,gradeQuestion} from './learning-core.mjs';

export const activityOf=question=>question.activity||(question.type==='text'?'translation':'choice');

export function selectQuestions(set,mode='all'){
  const questions=Array.isArray(set?.questions)?set.questions:[];
  if(!mode||mode==='all')return questions.slice();
  return questions.filter(question=>activityOf(question)===mode);
}

export function shuffle(items,random=Math.random){
  const result=items.slice();
  for(let i=result.length-1;i>0;i--){
    const sample=Number(random());
    const j=Math.min(i,Math.max(0,Math.floor((Number.isFinite(sample)?sample:0)*(i+1))));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export function matchingRound(cards,count=6,random=Math.random){
  const seenIds=new Set(),seenFronts=new Set(),seenBacks=new Set();
  const unique=(Array.isArray(cards)?cards:[]).filter(card=>{
    const front=answerText(card?.front),back=answerText(card?.back);
    if(!card?.id||!front||!back||seenIds.has(card.id)||seenFronts.has(front)||seenBacks.has(back))return false;
    seenIds.add(card.id);seenFronts.add(front);seenBacks.add(back);return true;
  });
  const limit=Number.isFinite(Number(count))?Math.max(0,Math.floor(Number(count))):6;
  const pairs=shuffle(unique,random).slice(0,limit);
  return {
    pairs,
    left:shuffle(pairs.map(card=>({id:card.id,text:card.front})),random),
    right:shuffle(pairs.map(card=>({id:card.id,text:card.back})),random)
  };
}

const readableSentence=value=>String(value??'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();

export function lessonSentences(set){
  const sentences=[],seen=new Set();
  for(const section of set?.lesson?.sections||[]){
    for(const example of section.examples||[]){
      const answer=readableSentence(example.en),key=answerText(answer);
      // Teaching notes also contain comparison lists and mini-dialogues. They
      // make ambiguous ordering puzzles, so use only one sentence at a time.
      if(example.orderable===false||/[\/=→]/.test(answer)||/[.!?]\s+\S/.test(answer))continue;
      if(!key||seen.has(key))continue;
      const words=answer.replace(/[.!?]+$/,'').trim().split(/\s+/);
      if(words.length<2)continue;
      seen.add(key);
      sentences.push({
        id:`${set.id}-sentence-${sentences.length+1}`,
        words,answer,meaning:String(example.vi||''),
        sourceId:example.sourceId||section.sourceId||set.sources?.[0]?.id,
        page:example.page||section.page||set.sources?.[0]?.pages?.[0]
      });
    }
  }
  return sentences;
}

export function sentenceCorrect(tokens,expected){
  const response=Array.isArray(tokens)?tokens.join(' '):String(tokens??'');
  const answer=typeof expected==='object'&&expected!==null?expected.answer:expected;
  return Boolean(answerText(response))&&answerText(response)===answerText(answer);
}

function latestResponses(bank,attempts){
  const known=new Map();
  for(const set of bank?.sets||[])for(const question of set.questions||[])known.set(question.id,{question,setId:set.id});
  const latest=new Map();
  const ordered=(Array.isArray(attempts)?attempts:[]).map((attempt,index)=>{const parsed=Date.parse(attempt?.date);return {attempt,index,time:Number.isFinite(parsed)?parsed:Number.NEGATIVE_INFINITY}}).sort((a,b)=>{
    // Undated legacy entries precede dated records; saved array order breaks
    // ties without creating an inconsistent mixed-date comparison.
    return a.time===b.time?a.index-b.index:a.time<b.time?-1:1;
  });
  for(const {attempt}of ordered){
    const answers=attempt?.answers;
    if(!answers||typeof answers!=='object'||Array.isArray(answers))continue;
    for(const [id,answer]of Object.entries(answers)){
      const item=known.get(id);if(!item)continue;
      const result=gradeQuestion(item.question,answer);if(typeof attempt.outcomes?.[id]==='boolean')result.correct=attempt.outcomes[id];
      if(result.answered)latest.set(id,{...result,setId:item.setId});
    }
  }
  return latest;
}

export function topicStats(bank,attempts=[]){
  const latest=latestResponses(bank,attempts);
  return (bank?.sets||[]).map(set=>{
    const questions=set.questions||[],results=questions.map(question=>latest.get(question.id)).filter(Boolean);
    const attempted=results.length,graded=results.filter(result=>typeof result.correct==='boolean').length,correct=results.filter(result=>result.correct===true).length;
    return {setId:set.id,total:questions.length,attempted,correct,accuracy:graded?Math.round(100*correct/graded):null,wrong:results.filter(r=>r.correct===false).length,unseen:questions.length-attempted};
  });
}

export function pickPractice(bank,history=[],wrong=[],limit=10){
  const max=Number.isFinite(Number(limit))?Math.max(0,Math.floor(Number(limit))):10;
  if(!max)return [];
  const sets=bank?.sets||[],latest=latestResponses(bank,history),known=new Map();
  for(const set of sets)for(const question of set.questions||[])known.set(question.id,{...question,setId:set.id});
  const picked=[],seen=new Set();
  const add=id=>{const question=known.get(id);if(question&&!seen.has(id)&&picked.length<max){picked.push(question);seen.add(id)}};
  for(const id of wrong instanceof Set?wrong:Array.isArray(wrong)?wrong:[])add(id);
  const scores=topicStats(bank,history);
  const queues=scores.map((score,index)=>({score,index,set:sets[index]})).sort((a,b)=>{
    const breadthA=a.score.total?a.score.attempted/a.score.total:1,breadthB=b.score.total?b.score.attempted/b.score.total:1;
    return breadthA-breadthB||(a.score.accuracy??0)-(b.score.accuracy??0)||a.index-b.index;
  }).map(({set})=>(set.questions||[]).map(question=>question.id).filter(id=>!seen.has(id)));
  const responseRank=id=>!latest.has(id)?0:latest.get(id).correct?2:1;
  const activities=['cloze','correction','choice','translation'];
  let activityCursor=0;
  // Alternate topics so a short session covers several gaps instead of filling
  // the entire session with the first unstudied chapter in the catalog.
  while(picked.length<max&&queues.some(queue=>queue.length)){
    for(const queue of queues){
      if(queue.length){
        // Choose among unseen questions first, then previously wrong answers and
        // finally already-correct questions. Within that rank, rotate exercise
        // styles across topics instead of inheriting MCQ-first bank ordering.
        const bestRank=Math.min(...queue.map(responseRank));
        let selected=-1;
        for(let offset=0;offset<activities.length;offset++){
          const modeIndex=(activityCursor+offset)%activities.length;
          selected=queue.findIndex(id=>responseRank(id)===bestRank&&activityOf(known.get(id))===activities[modeIndex]);
          if(selected!==-1){activityCursor=(modeIndex+1)%activities.length;break}
        }
        if(selected===-1)selected=queue.findIndex(id=>responseRank(id)===bestRank);
        add(queue.splice(selected,1)[0]);
      }
      if(picked.length>=max)break;
    }
  }
  return picked;
}
