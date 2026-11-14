import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),plan=await readFile(new URL('docs/TOEIC-STUDIO-V2-PLAN.md',root),'utf8');
const modules=[],requirements=[];let module=null,section='',cross='Overview',fenced=false;
for(const [index,line]of plan.split(/\r?\n/).entries()) {
  if(line.startsWith('```')){fenced=!fenced;continue}if(fenced)continue;
  const named=line.match(/^# MODULE (\d+) — (.+)$/);
  if(named){module={id:'M'+named[1],name:named[2],line:index+1,status:'partial',evidence:[]};modules.push(module);section='';continue}
  if(/^# [IVX]+\./.test(line)){module=null;cross=line.replace(/^# /,'');section='';continue}
  if(/^## / .test(line))section=line.replace(/^## /,'');
  const bullet=line.match(/^\s*(?:- |\d+\. )(.+)$/),heading=line.match(/^## (.+)$/);
  if(!bullet&&!heading)continue;
  const owner=module?.id||'X',items=requirements.filter(r=>r.module===owner),id=owner+'-R'+String(items.length+1).padStart(3,'0');
  requirements.push({id,module:owner,area:module?.name||cross,section,text:(bullet?.[1]||heading[1]).trim(),line:index+1,status:'unverified',evidence:[]});
}
const status={M01:['partial',['src/client/studio-v2.mjs','src/client/app.js']],M02:['in_progress',['scripts/extract-pdf.py','src/server/document-imports.mjs','tests/imports.test.mjs']],M03:['partial',['src/client/library-view.mjs','tests/hierarchy.test.mjs']],M04:['partial',['src/client/learning.mjs','tests/v2.test.mjs']],M05:['partial',['data/learning-bank.json','tests/learning.test.mjs']],M06:['partial',['src/client/learning.mjs','src/server/content-admin.mjs']],M07:['not_started',[]],M08:['partial',['src/client/learning.mjs']],M09:['partial',['src/client/app.js']],M10:['partial',['src/client/learning-core.mjs','tests/activities.test.mjs']],M11:['partial',['src/client/study-planner.mjs','tests/planner.test.mjs']],M12:['not_started',[]],M13:['partial',['src/client/active-learning.mjs']],M14:['not_started',[]],M15:['partial',['src/client/studio-v2.mjs']],M16:['in_progress',['src/client/import-ui.mjs','src/server/document-imports.mjs','tests/imports.test.mjs']]};
for(const m of modules){[m.status,m.evidence]=status[m.id]||['unverified',[]]}
const evidenceFile={scope:'Entire TOEIC Studio V2 master plan, including cross-cutting architecture, phases and MVP acceptance criteria.',goalComplete:false,rule:'Partial module coverage, existing green tests, or code presence do not prove all requirements complete. Each requirement needs direct current-state evidence and relevant UI/data validation.',modules,requirements};
await writeFile(new URL('data/master-plan-checklist.json',root),JSON.stringify(evidenceFile,null,2)+'\n');
let report='# Master Plan V2 — requirement audit\n\nFull goal remains active. This checklist preserves all 16 modules and the architecture/roadmap/MVP items. Unverified means completion has not been proved, including where a basic implementation exists.\n\n## Module delivery evidence\n\n| Module | Current status | Evidence to inspect |\n| --- | --- | --- |\n';
for(const m of modules)report+='| '+m.id+' '+m.name+' | '+m.status+' | '+m.evidence.map(file=>'['+file+'](../'+file+')').join(', ')+' |\n';
report+='\n## Detailed acceptance checklist\n\nRead each source requirement in TOEIC-STUDIO-V2-PLAN.md at the recorded line. Do not mark the goal complete until every requirement has sufficient evidence or an explicit user-approved scope change.\n';
let area='';for(const r of requirements){if(r.area!==area){area=r.area;report+='\n### '+area+'\n\n'}report+='- [ ] **'+r.id+'** '+r.text+' — '+r.status+'; plan line '+r.line+'.\n'}
report+='\n## Current next work\n\n1. Validate and finish PDF/OCR → review → publish → learn workflow with real files, including source updates and duplicate handling.\n2. Map verified grammar coverage to the intended 17-topic syllabus and expand source-read content; preserve reading/audio question groups.\n3. Build Listening/Dictation and Reading interactions from verified media/text.\n4. Complete analytics, personal vocabulary/mistake classification, adaptive plans, sync, mock tests, AI and gamification.\n5. Run each required data/API/UI/mobile/recovery gate; keep unresolved items explicit.\n\nNo estimated completion percentage is inferred from test counts.\n';
await writeFile(new URL('docs/MASTER-PLAN-AUDIT.md',root),report);
console.log(JSON.stringify({modules:modules.length,requirements:requirements.length,goalComplete:false}));
