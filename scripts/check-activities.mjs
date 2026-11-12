import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {activityOf,selectQuestions,shuffle,matchingRound,lessonSentences,sentenceCorrect,topicStats,pickPractice} from '../dist/activity-core.mjs';
import {freshLearning,applyQuizResult,sanitizeLearning,learningHistory} from '../dist/learning-core.mjs';

const choice={id:'a1',type:'choice',options:['am','is'],answer:1};
const text={id:'a2',type:'text',accept:['They are ready.'],activity:'correction'};
const bank={sets:[{id:'a',questions:[choice,text]},{id:'b',questions:[{id:'b1',type:'text',accept:['work'],activity:'cloze'},{id:'b2',type:'choice',options:['go','goes'],answer:0}]}]};
assert.equal(activityOf(choice),'choice');assert.equal(activityOf({type:'text'}),'translation');
assert.deepEqual(selectQuestions(bank.sets[0],'correction'),[text]);
assert.deepEqual(selectQuestions(bank.sets[0],'cloze'),[]);
const selected=selectQuestions(bank.sets[0]);selected.pop();assert.equal(bank.sets[0].questions.length,2,'Selecting a mode must not mutate the bank');
const original=[1,2,3,4],shuffled=shuffle(original,()=>0);
assert.deepEqual(original,[1,2,3,4]);assert.deepEqual(shuffled,[2,3,4,1]);
assert.deepEqual(shuffle([],()=>0),[]);

const cards=[{id:'1',front:'desk',back:'bàn'},{id:'2',front:'chair',back:'ghế'},{id:'3',front:'table',back:'Bàn.'},{id:'1',front:'duplicate',back:'other'},{id:'4',front:' DESK ',back:'bàn học'},{id:'5',front:'',back:'empty'}];
const matching=matchingRound(cards,6,()=>0);
assert.equal(matching.pairs.length,2,'Ambiguous duplicate front/back text must not create multiple valid matches');
assert.deepEqual(matching.left.map(item=>item.id).sort(),matching.right.map(item=>item.id).sort());
assert.equal(new Set(matching.left.map(item=>item.id)).size,matching.pairs.length);
assert.equal(matchingRound(cards,0).pairs.length,0);

const sentenceSet={id:'demo',sources:[{id:'fallback',pages:[4]}],lesson:{sections:[{sourceId:'pdf',page:2,examples:[{en:'  She’s   a teacher. ',vi:'Cô ấy là giáo viên.'},{en:"She's a teacher!",vi:'trùng'},{en:'Are you ready?',vi:'Bạn sẵn sàng chưa?'},{en:'Hello!'}]}]}};
const sentences=lessonSentences(sentenceSet);
assert.equal(sentences.length,2);assert.deepEqual(sentences[0].words,["She's",'a','teacher']);
assert.equal(sentences[0].sourceId,'pdf');assert.equal(sentences[0].page,2);assert.equal(sentences[0].id,'demo-sentence-1');
assert.equal(sentenceCorrect(["she’s",'a','teacher'],sentences[0]),true);
assert.equal(sentenceCorrect(['a',"she's",'teacher'],sentences[0]),false);
assert.equal(sentenceCorrect('',sentences[0]),false);
const teachingNotes={id:'notes',sources:[{id:'pdf',pages:[1]}],lesson:{sections:[{examples:[
 {en:'They are ready.',orderable:false},
 {en:'I am ready. / We are students.'},
 {en:'He is not late. = He is not early.'},
 {en:'She is ready. → Is she ready?'},
 {en:'Are they ready? — Yes, they are.'},
 {en:'The office is open. We can enter.'},
 {en:'The lesson starts at 8.30 tomorrow.'}
]}]}};
assert.deepEqual(lessonSentences(teachingNotes).map(item=>item.answer),['The lesson starts at 8.30 tomorrow.'],'Exclude marked notes, comparison lists and multi-sentence dialogues; decimal times remain valid');

const attempts=[
 {setId:'a',date:'2026-11-13T10:00:00Z',answers:{a1:0,a2:'They are ready.',unknown:'x'}},
 {setId:'review',date:'2026-11-13T11:00:00Z',answers:{a1:1}},
 {setId:'a',date:'2026-11-13T09:00:00Z',answers:{a1:0}},
 {setId:'a',date:'2026-11-13T12:00:00Z',answers:{a2:''}},
 {setId:'a',date:'2026-11-13T13:00:00Z',total:100,correct:100}
];
assert.deepEqual(topicStats(bank,attempts),[
 {setId:'a',total:2,attempted:2,correct:2,accuracy:100,wrong:0,unseen:0},
 {setId:'b',total:2,attempted:0,correct:0,accuracy:null,wrong:0,unseen:2}
],'Review answers belong to their original topic; repeat attempts and legacy aggregate scores cannot inflate breadth');
const badStats=topicStats(bank,[...attempts,{date:'2026-11-13T14:00:00Z',answers:{a1:0}}]);
assert.equal(badStats[0].correct,1);assert.equal(badStats[0].wrong,1);assert.equal(badStats[0].accuracy,50);
assert.equal(topicStats(bank,[{answers:{a1:0}},{answers:{a1:1}}])[0].correct,1,'Older exports without timestamps follow saved order');
const practice=pickPractice(bank,attempts,['unknown','a2','a2'],4);
assert.equal(practice[0].id,'a2');assert.equal(practice[1].id,'b1');assert.equal(new Set(practice.map(q=>q.id)).size,4);
assert.equal(practice[0].setId,'a');assert.equal(practice[1].setId,'b');assert.equal(pickPractice(bank,attempts,[],0).length,0);
assert.deepEqual(pickPractice({sets:[]}),[]);
const mixedBank={sets:Array.from({length:4},(_,i)=>({id:'mixed-'+i,questions:[
 {id:'m'+i+'-choice',type:'choice',options:['A','B'],answer:0},
 {id:'m'+i+'-cloze',type:'text',activity:'cloze',accept:['word']},
 {id:'m'+i+'-correction',type:'text',activity:'correction',accept:['correct']},
 {id:'m'+i+'-translation',type:'text',activity:'translation',accept:['sentence']}
]}))};
const coldStart=pickPractice(mixedBank,[],[],4);
assert.deepEqual(coldStart.map(activityOf),['cloze','correction','choice','translation'],'A cold start must vary activity styles rather than only selecting the first MCQs');
assert.equal(new Set(coldStart.map(q=>q.setId)).size,4,'Activity rotation must preserve topic coverage');
assert.equal(pickPractice(mixedBank,[],['m2-choice'],4)[0].id,'m2-choice','Explicit mistakes stay before mixed-mode selections');
const practicedCloze={date:'2026-11-13T12:00:00Z',answers:{'m0-cloze':'word'}};
assert.notEqual(pickPractice(mixedBank,[practicedCloze],[],4).find(q=>q.setId==='mixed-0').id,'m0-cloze','Unseen responses outrank a preferred mode that was already correct');

const cumulative=freshLearning();
applyQuizResult(cumulative,'a',[choice],{a1:1});
const firstResponse={...cumulative.responses.a1};
for(let i=0;i<105;i++)applyQuizResult(cumulative,'b',[bank.sets[1].questions[0]],{b1:'work'});
assert.equal(cumulative.attempts.length,100,'Recent attempt details remain capped');
assert.ok(cumulative.attempts.every(attempt=>!Object.hasOwn(attempt.answers,'a1')),'The original attempt should have left the history window');
assert.deepEqual(cumulative.responses.a1,firstResponse,'A question response must survive more than100 repeated attempts elsewhere');
applyQuizResult(cumulative,'a',[choice],{a1:''});
assert.deepEqual(cumulative.responses.a1,firstResponse,'Skipping a previously answered question must preserve its last actual response');
const cumulativeStats=topicStats(bank,learningHistory(cumulative));
assert.equal(cumulativeStats[0].attempted,1);assert.equal(cumulativeStats[0].correct,1);
assert.equal(learningHistory(cumulative).length,cumulative.attempts.length+Object.keys(cumulative.responses).length);
cumulative.lessonRead.a='2026-11-13T12:00:00Z';
cumulative.games=[{setId:'a',type:'match',total:2,correct:2,tries:3,date:'2026-11-13T12:00:00Z'}];
const roundTrip=sanitizeLearning(JSON.parse(JSON.stringify(cumulative)),bank,new Set());
assert.deepEqual(roundTrip.responses,cumulative.responses,'Export/import must preserve cumulative responses');
assert.equal(topicStats(bank,learningHistory(roundTrip))[0].attempted,1);
assert.deepEqual(roundTrip.lessonRead,cumulative.lessonRead);assert.deepEqual(roundTrip.games,cumulative.games);

const legacyAttempts=[{setId:'a',date:'2026-11-13T00:00:00Z',total:1,correct:1,answers:{a1:1}},...Array.from({length:105},(_,i)=>({setId:'b',date:new Date(Date.UTC(2026,10,13,1,0,i)).toISOString(),total:1,correct:1,answers:{b1:'work'}}))];
const migrated=sanitizeLearning({attempts:legacyAttempts,responses:{
 a1:{answer:0,date:'2026-11-12T00:00:00Z'},
 b1:{answer:'wrong',date:'2026-11-14T00:00:00Z'},
 a2:{answer:'x'.repeat(1001),date:'2026-11-14T00:00:00Z'},
 b2:{answer:0,date:'invalid-date'},
 unknown:{answer:'x',date:'2026-11-14T00:00:00Z'}
}},bank,new Set());
assert.equal(migrated.attempts.length,100);assert.equal(migrated.responses.a1.answer,1,'Migrate older responses before trimming legacy attempt details; stale explicit records cannot overwrite them');
assert.equal(migrated.responses.b1.answer,'wrong','A newer explicit record must win over legacy attempt data');
assert.equal(Object.keys(migrated.responses).length,2,'Unknown IDs, oversized answers and invalid dates must not be imported');
const tied=sanitizeLearning({attempts:[legacyAttempts[0]],responses:{a1:{answer:0,date:legacyAttempts[0].date}}},bank,new Set());
assert.equal(tied.responses.a1.answer,0,'Explicit cumulative records win timestamp ties');
const skipped=sanitizeLearning({attempts:[legacyAttempts[0]],responses:{a1:{answer:' ',date:'2026-11-14T00:00:00Z'}}},bank,new Set());
assert.equal(skipped.responses.a1.answer,1,'Imported blank responses must not erase an answer');

const live=JSON.parse(await readFile(new URL('../dist/learning-bank.json',import.meta.url),'utf8'));
for(const set of live.sets){for(const mode of ['choice','cloze','correction','translation'])assert.ok(selectQuestions(set,mode).every(q=>activityOf(q)===mode));for(const sentence of lessonSentences(set)){assert.ok(sentence.sourceId&&sentence.page);assert.equal(sentenceCorrect(sentence.words,sentence),true)}}
const livePick=pickPractice(live,[],[],10);assert.equal(new Set(livePick.map(q=>q.id)).size,Math.min(10,live.sets.reduce((sum,s)=>sum+s.questions.length,0)));
const liveAvailable=new Set(live.sets.flatMap(s=>s.questions.map(activityOf))),liveModes=new Set(livePick.map(activityOf));
if(liveAvailable.size>=2&&livePick.length>=2)assert.ok(liveModes.size>=2,'Real-bank cold-start practice should include at least two available activity modes');
for(const q of livePick)assert.ok(live.sets.find(s=>s.id===q.setId).questions.some(original=>original.id===q.id),'Practice uses actual bank IDs');
console.log(JSON.stringify({ok:true,helpers:8,topics:live.sets.length,practiceQuestions:livePick.length,practiceModes:[...liveModes]}));
