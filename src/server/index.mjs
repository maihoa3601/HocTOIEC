import {createDocumentImports} from './document-imports.mjs';
import {createContentService,contentRole} from './content-admin.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const normalize=value=>String(value??'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/[,;:]/g,'').trim().replace(/[.!?]+$/g,'').trim().replace(/\s+/g,' ').toLowerCase();
export function scoreQuestions(questions,answers){const results=questions.map(q=>{const answer=answers[q.id],answered=answer!==undefined&&answer!==null&&String(answer).trim()!=='';return {id:q.id,answered,correct:answered&&(q.type==='text'?q.accept.some(x=>normalize(x)===normalize(answer)):Number(answer)===q.answer),answer:answered?answer:null}});const correct=results.filter(r=>r.correct).length;return {total:questions.length,correct,unanswered:results.filter(r=>!r.answered).length,percent:questions.length?Math.round(100*correct/questions.length):0,results}}
async function readJSON(request){const reader=request.body?.getReader();if(!reader)throw new Error('Thiếu dữ liệu gửi lên.');let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>5500000){await reader.cancel();throw new Error('Dữ liệu vượt quá 5 MB.')}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return JSON.parse(new TextDecoder().decode(bytes))}
const idOK=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(id);
export function createWorker({assets,bank,bankVersion,questionVersions}){
 const imports=createDocumentImports({catalog:assets['/catalog.json']?JSON.parse(assets['/catalog.json'].body):{items:[]},bank});
 const content=createContentService({bank,bankVersion,questionVersions,score:scoreQuestions,loadPublished:imports.loadPublished});
 const questions=new Map(bank.sets.flatMap(s=>s.questions.map(q=>[q.id,{...q,setId:s.id,topic:s.title,version:questionVersions[q.id]}]))),sets=new Set(bank.sets.map(s=>s.id));
 return {async fetch(request,env={}){try{const url=new URL(request.url),path=url.pathname,user=request.headers.get('oai-authenticated-user-id');
  if(path==='/learning-bank.json')return json(await content.publicBank(env));
  if(path==='/content-version.json'){const current=await content.load(env);return json({bankVersion:current.bankVersion,questionVersions:current.versions})}
  if(path==='/api/grade'&&request.method==='POST')return await content.grade(request,env,user,readJSON);
  if(path.startsWith('/api/admin/imports')||path.startsWith('/api/admin/sources'))return await imports.handle(request,env,user,contentRole(user,env),readJSON,()=>content.load(env));
  if(path.startsWith('/api/admin/'))return await content.admin(request,env,user,readJSON);
  if(path.startsWith('/api/')){
   if(path==='/api/session'&&request.method==='GET')return json({signedIn:Boolean(user),storage:Boolean(env.DB),role:contentRole(user,env),bankVersion});
   if(!user)return json({error:'Bạn cần đăng nhập ChatGPT để dùng dữ liệu theo tài khoản.'},401);
   if(!env.DB)return json({error:'Lưu trữ tài khoản chưa sẵn sàng.'},503);
   if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return json({error:'Nguồn gửi không hợp lệ.'},403);
   if(path==='/api/backup'&&request.method==='GET'){const row=await env.DB.prepare('SELECT revision,payload,updated_at FROM user_backups WHERE user_id=?').bind(user).first();return json(row?{revision:row.revision,data:JSON.parse(row.payload),updatedAt:row.updated_at}:{revision:0,data:null})}
   if(path==='/api/backup'&&request.method==='PUT'){
    const {revision,data}=await readJSON(request);if(!Number.isInteger(revision)||revision<0||!data||data.app!=='TOEIC Studio'||data.version!==1||!Array.isArray(data.saved)||!data.notes||!data.completed||!data.learning)return json({error:'Bản sao tiến độ không hợp lệ.'},400);
    const payload=JSON.stringify(data),date=new Date().toISOString();if(payload.length>5000000)return json({error:'Bản sao vượt quá 5 MB.'},413);
    const result=revision===0?await env.DB.prepare('INSERT OR IGNORE INTO user_backups(user_id,revision,payload,updated_at) VALUES(?,1,?,?)').bind(user,payload,date).run():await env.DB.prepare('UPDATE user_backups SET revision=revision+1,payload=?,updated_at=? WHERE user_id=? AND revision=?').bind(payload,date,user,revision).run();
    return result.meta.changes===1?json({revision:revision+1,updatedAt:date}):json({error:'Bản sao trên tài khoản đã thay đổi. Tải lại thông tin trước khi lưu để tránh ghi đè từ thiết bị khác.'},409);
   }
   if(path==='/api/attempts'&&request.method==='POST')return await content.grade(request,env,user,readJSON,true);
   if(path==='/api/attempts'&&request.method==='GET'){const offset=Math.max(0,Math.min(1000000,Math.trunc(Number(url.searchParams.get('offset'))||0))),limit=20;const data=await env.DB.prepare('SELECT attempt_id,created_at,set_id,snapshot FROM user_attempts WHERE user_id=? ORDER BY created_at DESC,attempt_id DESC LIMIT ? OFFSET ?').bind(user,limit+1,offset).all();const rows=data.results;return json({items:rows.slice(0,limit).map(r=>{const s=JSON.parse(r.snapshot);return {id:r.attempt_id,date:r.created_at,setId:r.set_id,correct:s.score.correct,total:s.score.total,bankVersion:s.bankVersion}}),nextOffset:rows.length>limit?offset+limit:null})}
   if(path.startsWith('/api/attempts/')&&request.method==='GET'){const id=decodeURIComponent(path.slice('/api/attempts/'.length));const row=await env.DB.prepare('SELECT snapshot FROM user_attempts WHERE user_id=? AND attempt_id=?').bind(user,id).first();return row?json(JSON.parse(row.snapshot)):json({error:'Không tìm thấy lượt làm.'},404)}
   if(path==='/api/reports'&&request.method==='POST'){const body=await readJSON(request),q=(await content.load(env)).map.get(body.questionId);if(!q||!idOK(body.id)||!['answer','question','explanation','source','other'].includes(body.reason)||typeof body.detail!=='string'||body.detail.length>1500)return json({error:'Báo lỗi không hợp lệ.'},400);await env.DB.prepare('INSERT OR IGNORE INTO question_reports(report_id,user_id,question_id,question_version,reason,detail,status,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(body.id,user,q.id,/^[a-f0-9]{64}$/.test(body.questionVersion||'')?body.questionVersion:q.version,body.reason,body.detail,'open',new Date().toISOString()).run();return json({id:body.id,status:'open'},201)}
   if(path==='/api/reports'&&request.method==='GET'){const rows=await env.DB.prepare('SELECT report_id,question_id,reason,detail,status,created_at FROM question_reports WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user).all();return json({items:rows.results})}
   return json({error:'Không tìm thấy API.'},404);
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const asset=assets[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.body,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff'}});
 }catch(error){return json({error:error instanceof SyntaxError?'Dữ liệu JSON không hợp lệ.':'Không xử lý được yêu cầu. Hãy thử lại; dữ liệu trên thiết bị vẫn được giữ.'},error instanceof SyntaxError?400:500)}}};
}
