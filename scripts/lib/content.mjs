import {createHash} from 'node:crypto';

export function contentMetadata(bank) {
  const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
  return {
    bankVersion:hash(bank),
    questionVersions:Object.fromEntries(bank.sets.flatMap(set=>set.questions.map(q=>[q.id,hash(q)])))
  };
}

export function publicLearningBank(bank,metadata) {
  return {...bank,contentVersion:metadata.bankVersion,questionVersions:metadata.questionVersions,
    sets:bank.sets.map(set=>({...set,questions:set.questions.map(question=>{
      const safe={...question,setId:set.id,topic:set.title,version:metadata.questionVersions[question.id]};
      delete safe.answer;
      delete safe.accept;
      delete safe.explanation;
      return safe;
    })}))};
}
