const importJSON=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function importHash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
const importText=(value,label,max=3000)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(label+' không hợp lệ.');return value.trim()};
const importId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{4,100}$/.test(value);
const importArray=(value,label,max)=>{if(!Array.isArray(value)||!value.length||value.length>max)throw Error(label+' không hợp lệ.');return value};
const originTypes=['Original','Adapted','Generated'];

export function validateImportBundle(input,file,reservedIds=new Set()) {
  if(input?.schema!==1||input.source?.id!==file.id||!/^[a-f0-9]{64}$/.test(input.source.sha256||''))throw Error('Nguồn và SHA-256 của PDF không hợp lệ.');
  const source={id:file.id,sha256:input.source.sha256,byteSize:Number(input.source.byteSize),pageCount:Number(input.source.pageCount)};
  if(!Number.isSafeInteger(source.byteSize)||source.byteSize<5||source.byteSize>500000000||!Number.isInteger(source.pageCount)||source.pageCount<1||source.pageCount>200)throw Error('Kích thước hoặc số trang PDF không hợp lệ.');
  const pipelineVersion=importText(input.pipelineVersion,'Phiên bản xử lý',80);
  const pages=importArray(input.pages,'Trang trích xuất',200).map(p=>{
    if(!Number.isInteger(p.number)||p.number<1||p.number>source.pageCount||!['native','ocr','manual'].includes(p.method))throw Error('Số trang hoặc phương pháp trích xuất không hợp lệ.');
    return {number:p.number,text:importText(p.text,'Văn bản trang',30000),method:p.method,reviewed:p.reviewed===true,roleSuggestion:['theory','exercises','answers','mixed'].includes(p.roleSuggestion)?p.roleSuggestion:'mixed'};
  });
  if(pages.length!==source.pageCount||new Set(pages.map(p=>p.number)).size!==pages.length)throw Error('Trang trích xuất bị trùng.');
  const pageIds=new Set(pages.map(p=>p.number)),lessonIds=new Set(),questionIds=new Set(),cardIds=new Set();
  function ref(value){if(value.sourceId!==file.id||!pageIds.has(value.page))throw Error('Nội dung phải trỏ tới đúng trang nguồn đã trích xuất.');return {sourceId:file.id,page:value.page}}
  if(!Array.isArray(input.lessons)||input.lessons.length>10)throw Error('Danh sách bài học không hợp lệ.');
  const lessons=input.lessons.map(raw=>{
    if(!importId(raw.id)||reservedIds.has(raw.id)||lessonIds.has(raw.id))throw Error('Mã bài học bị trùng hoặc trùng bài nền tảng.');lessonIds.add(raw.id);
    const origin=originTypes.includes(raw.origin)?raw.origin:null;if(!origin)throw Error('Cần nhãn Original / Adapted / Generated.');
    const summary=importArray(raw.summary,'Ý chính',12).map(t=>importText(t,'Ý chính',700));
    const sections=importArray(raw.lesson?.sections,'Nội dung bài học',30).map(s=>({heading:importText(s.heading,'Tiêu đề phần',200),points:importArray(s.points,'Nội dung phần',15).map(t=>importText(t,'Ý bài học',1500)),examples:(s.examples||[]).slice(0,12).map(e=>({en:importText(e.en,'Ví dụ',500),vi:importText(e.vi,'Nghĩa ví dụ',700),orderable:e.orderable!==false})),...ref(s)}));
    const questions=importArray(raw.questions,'Câu hỏi',200).map(q=>{
      if(!importId(q.id)||!q.id.startsWith(raw.id+'-')||questionIds.has(q.id)||!['choice','text'].includes(q.type))throw Error('Mã hoặc loại câu hỏi không hợp lệ.');questionIds.add(q.id);
      const result={id:q.id,type:q.type,activity:['choice','cloze','correction','translation'].includes(q.activity)?q.activity:q.type==='choice'?'choice':'cloze',prompt:importText(q.prompt,'Câu hỏi'),explanation:importText(q.explanation,'Giải thích',6000),origin:originTypes.includes(q.origin)?q.origin:origin,...ref(q)};
      if(q.type==='choice'){
        result.options=importArray(q.options,'Lựa chọn',8).map(t=>importText(t,'Lựa chọn',1000));
        if(result.options.length<2||new Set(result.options.map(s=>s.toLowerCase())).size!==result.options.length||!Number.isInteger(q.answer)||q.answer<0||q.answer>=result.options.length)throw Error('Đáp án trắc nghiệm chưa hợp lệ.');result.answer=q.answer;
      }else result.accept=[...new Set(importArray(q.accept,'Đáp án chấp nhận',20).map(t=>importText(t,'Đáp án',1000)))];
      return result;
    });
    const cards=(raw.cards||[]).slice(0,100).map(c=>{if(!importId(c.id)||!c.id.startsWith(raw.id+'-')||cardIds.has(c.id))throw Error('Mã thẻ từ không hợp lệ.');cardIds.add(c.id);return {id:c.id,front:importText(c.front,'Từ',200),back:importText(c.back,'Nghĩa',500),example:typeof c.example==='string'?c.example.slice(0,800):'',...ref(c)}});
    return {id:raw.id,title:importText(raw.title,'Tên bài',250),topic:importText(raw.topic||'Ngữ pháp','Chủ đề',120),courseId:file.course,folderId:file.parent,description:importText(raw.description||'Học nhanh từ tài liệu đã đối chiếu.','Mô tả',1000),origin,summary,sources:[{id:file.id,title:file.name,pages:[...new Set([...sections.map(s=>s.page),...questions.map(q=>q.page),...cards.map(c=>c.page)])].sort((a,b)=>a-b),url:'https://drive.google.com/file/d/'+file.id+'/view'}],lesson:{sections,pitfalls:(raw.lesson.pitfalls||[]).slice(0,15).map(t=>importText(t,'Lưu ý',1500))},questions,cards};
  });
  if(questionIds.size>300)throw Error('Mỗi lần nhập tối đa 300 câu hỏi.');
  const bundle={schema:1,source,pipelineVersion,pages,lessons,reviewNotes:typeof input.reviewNotes==='string'?input.reviewNotes.slice(0,4000):''};
  if(new TextEncoder().encode(JSON.stringify(bundle)).byteLength>850000)throw Error('Gói nhập vượt 850 KB; chia nhỏ nội dung trước khi nhập.');
  return bundle;
}

export function createDocumentImports({catalog,bank}) {
  const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const files=new Map((catalog?.items||[]).filter(f=>f.mime==='application/pdf'&&!/^(thong tin lien he|tai lieu on thi official|gioi thieu ve nhom|loi ich tham gia nhom)/.test(norm(f.name).replace(/^[^a-z0-9]+/g,''))).map(f=>[f.id,f]));
  const reservedIds=new Set(bank.sets.map(s=>s.id));
  async function loadPublished(env) {
    if(!env.DB)return {lessons:[],versions:{}};
    const rows=(await env.DB.prepare('SELECT lesson_id,version,payload FROM published_lessons ORDER BY lesson_id').all()).results;
    const lessons=[],versions={};
    for(const row of rows){const lesson=JSON.parse(row.payload);if(lesson){lessons.push(lesson);versions[lesson.id]=row.version}}
    return {lessons,versions};
  }
  const audit=(db,job,user,action,detail='')=>db.prepare('INSERT INTO import_audit(audit_id,job_id,actor_id,action,created_at,detail) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),job,user,action,new Date().toISOString(),detail);
  function register(db,file,status,job,sha=null,alias=null) {
    return db.prepare('INSERT INTO source_files(drive_id,title,mime,course_id,folder_id,status,latest_job_id,sha256,alias_of,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(drive_id) DO UPDATE SET status=excluded.status,latest_job_id=excluded.latest_job_id,sha256=coalesce(excluded.sha256,source_files.sha256),alias_of=excluded.alias_of,updated_at=excluded.updated_at').bind(file.id,file.name,file.mime,file.course,file.parent,status,job,sha,alias,new Date().toISOString());
  }
  async function handle(request,env,user,role,readJSON,loadCurrent) {
    if(!['admin','editor'].includes(role))return importJSON({error:'Tài khoản không có quyền nhập học liệu.'},user?403:401);
    if(!env.DB)return importJSON({error:'Lưu trữ chưa sẵn sàng.'},503);
    const url=new URL(request.url),path=url.pathname,db=env.DB;
    if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return importJSON({error:'Nguồn gửi không hợp lệ.'},403);
    if(path==='/api/admin/sources'&&request.method==='GET') {
      const query=norm(url.searchParams.get('q')||''),offset=Math.max(0,Math.trunc(Number(url.searchParams.get('offset'))||0));
      const registered=(await db.prepare('SELECT drive_id,status,latest_job_id,sha256,alias_of,updated_at FROM source_files').all()).results,known=new Map(registered.map(r=>[r.drive_id,r]));
      const coverage=new Map();for(const set of bank.sets)for(const source of set.sources)coverage.set(source.id,(coverage.get(source.id)||0)+1);for(const row of (await db.prepare('SELECT source_id,COUNT(*) AS n FROM published_lessons GROUP BY source_id').all()).results)coverage.set(row.source_id,(coverage.get(row.source_id)||0)+row.n);
      const results=[...files.values()].filter(f=>norm(f.name).includes(query)),counts={pending:files.size-registered.length};for(const row of registered)counts[row.status]=(counts[row.status]||0)+1;
      return importJSON({role,counts,learningCoveredFiles:[...files.keys()].filter(id=>coverage.has(id)).length,total:files.size,items:results.slice(offset,offset+20).map(f=>({id:f.id,title:f.name,courseId:f.course,status:known.get(f.id)?.status||'pending',jobId:known.get(f.id)?.latest_job_id||null,aliasOf:known.get(f.id)?.alias_of||null,publishedLessons:coverage.get(known.get(f.id)?.alias_of||f.id)||0})),nextOffset:results.length>offset+20?offset+20:null});
    }
    if(path==='/api/admin/imports'&&request.method==='GET') {
      const offset=Math.max(0,Math.trunc(Number(url.searchParams.get('offset'))||0)),status=url.searchParams.get('status');
      const valid=['pending','processing','needs_review','approved','published','failed','duplicate'];
      const filter=valid.includes(status)?' WHERE status=?':'',statement=db.prepare('SELECT job_id,source_id,status,error,created_at,updated_at,review_note FROM import_jobs'+filter+' ORDER BY updated_at DESC,job_id LIMIT 21 OFFSET ?');
      const rows=(await (filter?statement.bind(status,offset):statement.bind(offset)).all()).results;
      return importJSON({role,items:rows.slice(0,20).map(row=>({...row,title:files.get(row.source_id)?.name||row.source_id})),nextOffset:rows.length>20?offset+20:null});
    }
    if(path==='/api/admin/imports/queue'&&request.method==='POST') {
      const body=await readJSON(request),file=files.get(body.sourceId);if(!file)return importJSON({error:'Chọn PDF học tập trong danh mục Drive.'},400);
      const prior=await db.prepare("SELECT job_id,status FROM import_jobs WHERE source_id=? AND status IN ('pending','processing','needs_review','approved') ORDER BY updated_at DESC LIMIT 1").bind(file.id).first();if(prior)return importJSON({...prior,duplicate:true});
      const id=crypto.randomUUID(),now=new Date().toISOString();try{await db.batch([db.prepare('INSERT INTO import_jobs(job_id,source_id,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,file.id,'pending',user,now,now),register(db,file,'pending',id),audit(db,id,user,'queue')])}catch(error){const actual=await db.prepare("SELECT job_id,status FROM import_jobs WHERE source_id=? AND status IN ('pending','processing') ORDER BY updated_at DESC LIMIT 1").bind(file.id).first();if(actual)return importJSON({...actual,duplicate:true});throw error}return importJSON({job_id:id,status:'pending'},201);
    }
    const match=path.match(/^\/api\/admin\/imports\/([A-Za-z0-9_-]+)(?:\/(approve|publish|retry|start|fail))?$/);
    if(match&&request.method==='GET'&&!match[2]) {
      const row=await db.prepare('SELECT * FROM import_jobs WHERE job_id=?').bind(match[1]).first();if(!row)return importJSON({error:'Không tìm thấy lần nhập.'},404);
      const history=(await db.prepare('SELECT action,created_at,detail FROM import_audit WHERE job_id=? ORDER BY created_at,audit_id LIMIT 100').bind(row.job_id).all()).results;
      return importJSON({job:{...row,created_by:undefined,reviewed_by:undefined,publication_token:undefined,transition_token:undefined,payload:undefined,base_versions:undefined,base_revisions:undefined},bundle:row.payload?JSON.parse(row.payload):null,source:files.get(row.source_id),audit:history,role});
    }
    if(match&&['start','fail'].includes(match[2])&&request.method==='POST') {
      const action=match[2],body=action==='fail'?await readJSON(request):{},row=await db.prepare('SELECT * FROM import_jobs WHERE job_id=?').bind(match[1]).first();
      if(!row||(action==='start'?row.status!=='pending':!['pending','processing'].includes(row.status)))return importJSON({error:'Trạng thái lần nhập không phù hợp.'},409);
      if(action==='fail'&&(typeof body.detail!=='string'||body.detail.trim().length<8||body.detail.length>1000))return importJSON({error:'Cần ghi rõ lỗi xử lý.'},400);
      const next=action==='start'?'processing':'failed',token=crypto.randomUUID(),date=new Date().toISOString();
      const changed=await db.batch([
        db.prepare('UPDATE import_jobs SET status=?,error=?,transition_token=?,updated_at=? WHERE job_id=? AND status=?').bind(next,action==='fail'?body.detail.trim():null,token,date,row.job_id,row.status),
        db.prepare('UPDATE source_files SET status=?,updated_at=? WHERE drive_id=? AND EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)').bind(next,date,row.source_id,row.job_id,token),
        db.prepare('INSERT INTO import_audit(audit_id,job_id,actor_id,action,created_at,detail) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)').bind(crypto.randomUUID(),row.job_id,user,action,date,body.detail||'Local PDF extraction started',row.job_id,token)
      ]);return changed[0].meta.changes?importJSON({job_id:row.job_id,status:next}):importJSON({error:'Lần nhập vừa thay đổi.'},409);
    }
    if(match&&match[2]==='retry'&&request.method==='POST') {
      const row=await db.prepare('SELECT * FROM import_jobs WHERE job_id=?').bind(match[1]).first();if(!row||row.status!=='failed')return importJSON({error:'Chỉ xử lý lại lần nhập bị lỗi.'},409);
      const token=crypto.randomUUID(),date=new Date().toISOString();const changed=await db.batch([
        db.prepare("UPDATE import_jobs SET status='pending',error=NULL,updated_at=?,transition_token=? WHERE job_id=? AND status='failed'").bind(date,token,row.job_id),
        db.prepare("UPDATE source_files SET status='pending',updated_at=? WHERE drive_id=? AND EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)").bind(date,row.source_id,row.job_id,token),
        db.prepare("INSERT INTO import_audit(audit_id,job_id,actor_id,action,created_at,detail) SELECT ?,?,?,'retry',?,'Retry failed extraction' WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)").bind(crypto.randomUUID(),row.job_id,user,date,row.job_id,token)
      ]);return changed[0].meta.changes?importJSON({job_id:row.job_id,status:'pending'}):importJSON({error:'Lần nhập vừa thay đổi.'},409);
    }
    if((path==='/api/admin/imports'&&request.method==='POST')||(match&&!match[2]&&request.method==='PUT')) {
      const input=await readJSON(request),file=files.get(input.source?.id);if(!file)return importJSON({error:'Nguồn phải là PDF học tập trong danh mục Drive.'},400);
      const updating=match?await db.prepare('SELECT * FROM import_jobs WHERE job_id=?').bind(match[1]).first():null;
      if(match&&(!updating||updating.status==='published'||updating.source_id!==file.id||input.expectedPayloadHash!==updating.payload_hash))return importJSON({error:'Không thể ghi đè lần nhập đã xuất bản hoặc khác nguồn.'},409);
      let bundle;
      try {bundle=validateImportBundle(input,file,reservedIds)}catch(error) {
        const queued=updating||await db.prepare("SELECT * FROM import_jobs WHERE source_id=? AND version_id IS NULL AND status IN ('pending','processing','failed') ORDER BY updated_at DESC LIMIT 1").bind(file.id).first();
        const id=queued?.job_id||crypto.randomUUID(),now=new Date().toISOString(),token=crypto.randomUUID();
        const changed=await db.batch([
          db.prepare("INSERT INTO import_jobs(job_id,source_id,status,error,created_by,created_at,updated_at,transition_token) VALUES(?,?,'failed',?,?,?,?,?) ON CONFLICT(job_id) DO UPDATE SET status='failed',error=excluded.error,updated_at=excluded.updated_at,transition_token=excluded.transition_token,reviewed_by=NULL,reviewed_at=NULL,review_note=NULL WHERE import_jobs.status<>'published' AND coalesce(import_jobs.payload_hash,'')=?").bind(id,file.id,error.message,user,now,now,token,queued?.payload_hash||''),
          db.prepare("INSERT INTO source_files(drive_id,title,mime,course_id,folder_id,status,latest_job_id,updated_at) SELECT ?,?,?,?,?,'failed',?,? WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?) ON CONFLICT(drive_id) DO UPDATE SET status='failed',latest_job_id=excluded.latest_job_id,updated_at=excluded.updated_at").bind(file.id,file.name,file.mime,file.course,file.parent,id,now,id,token),
          db.prepare("INSERT INTO import_audit(audit_id,job_id,actor_id,action,created_at,detail) SELECT ?,?,?,'failed',?,? WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)").bind(crypto.randomUUID(),id,user,now,error.message,id,token)
        ]);if(!changed[0].meta.changes)return importJSON({error:'Lần nhập vừa thay đổi. Tải lại trước khi thử.'},409);
        return importJSON({error:error.message,job_id:id,status:'failed'},422);
      }
      const versionId=await importHash(file.id+':'+bundle.source.sha256+':'+bundle.pipelineVersion),payload=JSON.stringify(bundle),payloadHash=await importHash(payload);
      const duplicate=await db.prepare('SELECT j.job_id,j.source_id,j.payload_hash,j.status FROM import_jobs j JOIN source_versions v ON v.version_id=j.version_id WHERE v.sha256=? AND v.pipeline_version=? ORDER BY j.created_at LIMIT 1').bind(bundle.source.sha256,bundle.pipelineVersion).first();
      if(duplicate&&duplicate.source_id!==file.id) {await db.batch([register(db,file,duplicate.status,duplicate.job_id,bundle.source.sha256,duplicate.source_id),audit(db,duplicate.job_id,user,'duplicate_alias',file.id)]);return importJSON({...duplicate,payload_hash:undefined,duplicate:true,alias:true})}
      if(duplicate&&!updating) {
        if(duplicate.payload_hash!==payloadHash)return importJSON({error:'PDF này đã có lần nhập khác nội dung. Mở bản nháp để sửa hoặc tăng pipelineVersion cho phiên bản mới.'},409);
        const queued=await db.prepare("SELECT job_id FROM import_jobs WHERE source_id=? AND version_id IS NULL AND status IN ('pending','processing') ORDER BY updated_at DESC LIMIT 1").bind(file.id).first();
        if(queued){const token=crypto.randomUUID(),date=new Date().toISOString();await db.batch([
          db.prepare("UPDATE import_jobs SET status='duplicate',transition_token=?,updated_at=?,review_note=? WHERE job_id=? AND version_id IS NULL AND status IN ('pending','processing')").bind(token,date,'Nội dung đã có ở lần nhập '+duplicate.job_id,queued.job_id),
          db.prepare('UPDATE source_files SET status=?,latest_job_id=?,updated_at=? WHERE drive_id=? AND latest_job_id=? AND EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)').bind(duplicate.status,duplicate.job_id,date,file.id,queued.job_id,queued.job_id,token),
          db.prepare("INSERT INTO import_audit(audit_id,job_id,actor_id,action,created_at,detail) SELECT ?,?,?,'duplicate',?,? WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)").bind(crypto.randomUUID(),queued.job_id,user,date,duplicate.job_id,queued.job_id,token)
        ])}
        return importJSON({job_id:duplicate.job_id,status:duplicate.status,duplicate:true});
      }
      if(updating&&updating.payload_hash===payloadHash)return importJSON({job_id:updating.job_id,status:updating.status,unchanged:true});
      if(updating&&updating.version_id&&updating.version_id!==versionId)return importJSON({error:'Sửa nháp không được thay fingerprint hoặc phiên bản xử lý.'},409);
      const current=await loadCurrent(),baseVersions={},baseRevisions={};
      for(const lesson of bundle.lessons) {
        const existing=current.sets.get(lesson.id);if(existing&&existing.sources[0]?.id!==file.id)return importJSON({error:'Mã bài học đang thuộc tài liệu khác.'},409);
        baseVersions[lesson.id]=current.lessonVersions?.[lesson.id]||null;
        for(const q of lesson.questions)baseRevisions[q.id]=current.map.get(q.id)?._revisionId||null;
      }
      const queued=updating||await db.prepare("SELECT * FROM import_jobs WHERE source_id=? AND version_id IS NULL AND status IN ('pending','processing','failed') ORDER BY updated_at DESC LIMIT 1").bind(file.id).first();
      const id=queued?.job_id||'imp-'+versionId.slice(0,40),now=new Date().toISOString(),transitionToken=crypto.randomUUID();
      try {const changed=await db.batch([
        db.prepare("INSERT INTO import_jobs(job_id,source_id,version_id,status,payload,payload_hash,base_versions,base_revisions,created_by,created_at,updated_at,transition_token) VALUES(?,?,?,'needs_review',?,?,?,?,?,?,?,?) ON CONFLICT(job_id) DO UPDATE SET version_id=excluded.version_id,status='needs_review',payload=excluded.payload,payload_hash=excluded.payload_hash,base_versions=excluded.base_versions,base_revisions=excluded.base_revisions,error=NULL,reviewed_by=NULL,reviewed_at=NULL,review_note=NULL,publication_token=NULL,transition_token=excluded.transition_token,updated_at=excluded.updated_at WHERE import_jobs.status<>'published' AND coalesce(import_jobs.payload_hash,'')=?").bind(id,file.id,versionId,payload,payloadHash,JSON.stringify(baseVersions),JSON.stringify(baseRevisions),user,now,now,transitionToken,queued?.payload_hash||''),
        db.prepare('INSERT OR IGNORE INTO source_versions(version_id,drive_id,sha256,byte_size,page_count,pipeline_version,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)').bind(versionId,file.id,bundle.source.sha256,bundle.source.byteSize,bundle.source.pageCount,bundle.pipelineVersion,now,id,transitionToken),
        db.prepare("INSERT INTO source_files(drive_id,title,mime,course_id,folder_id,status,latest_job_id,sha256,updated_at) SELECT ?,?,?,?,?,'needs_review',?,?,? WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?) ON CONFLICT(drive_id) DO UPDATE SET status=excluded.status,latest_job_id=excluded.latest_job_id,sha256=excluded.sha256,alias_of=NULL,updated_at=excluded.updated_at").bind(file.id,file.name,file.mime,file.course,file.parent,id,bundle.source.sha256,now,id,transitionToken),
        db.prepare("INSERT INTO import_audit(audit_id,job_id,actor_id,action,created_at,detail) SELECT ?,?,?,'extract_to_review',?,'Validated page-linked bundle' WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)").bind(crypto.randomUUID(),id,user,now,id,transitionToken)
      ]);if(!changed[0].meta.changes)return importJSON({error:'Lần nhập vừa thay đổi. Tải lại trước khi sửa.'},409)}catch(error){const actual=await db.prepare('SELECT job_id,payload_hash,status FROM import_jobs WHERE version_id=?').bind(versionId).first();if(actual?.payload_hash===payloadHash)return importJSON({job_id:actual.job_id,status:actual.status,duplicate:true});throw error}
      return importJSON({job_id:id,status:'needs_review',pages:bundle.pages.length,lessons:bundle.lessons.length},201);
    }
    if(match&&match[2]==='approve'&&request.method==='POST') {
      if(role!=='admin')return importJSON({error:'Chỉ quản trị viên được duyệt học liệu.'},403);
      const body=await readJSON(request),row=await db.prepare('SELECT * FROM import_jobs WHERE job_id=?').bind(match[1]).first();
      if(!row||row.status!=='needs_review')return importJSON({error:'Lần nhập chưa ở trạng thái cần kiểm tra.'},409);
      const bundle=JSON.parse(row.payload);if(!bundle.lessons.length)return importJSON({error:'Cần biên soạn ít nhất một bài học và câu luyện trước khi duyệt xuất bản.'},400);const qids=bundle.lessons.flatMap(s=>s.questions.map(q=>q.id)),pages=bundle.pages.map(p=>p.number);
      const exact=(a,b)=>Array.isArray(a)&&new Set(a).size===b.length&&a.length===b.length&&b.every(id=>a.includes(id));
      if(body.payloadHash!==row.payload_hash)return importJSON({error:'Nội dung đã thay đổi sau khi mở trang kiểm duyệt.'},409);
      if(body.sourceChecked!==true||!bundle.pages.every(p=>p.reviewed)||!exact(body.reviewedPages,pages)||!exact(body.reviewedQuestionIds,qids)||typeof body.note!=='string'||body.note.trim().length<8||body.note.length>2000)return importJSON({error:'Cần đối chiếu tất cả trang, câu hỏi/đáp án và ghi chú kiểm duyệt.'},400);
      const date=new Date().toISOString(),reviewToken=crypto.randomUUID();const result=await db.batch([
        db.prepare("UPDATE import_jobs SET status='approved',reviewed_by=?,reviewed_at=?,review_note=?,updated_at=?,transition_token=? WHERE job_id=? AND status='needs_review' AND payload_hash=?").bind(user,date,body.note.trim(),date,reviewToken,row.job_id,row.payload_hash),
        db.prepare("UPDATE source_files SET status='approved',updated_at=? WHERE drive_id=? AND EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)").bind(date,row.source_id,row.job_id,reviewToken),
        db.prepare("INSERT INTO import_audit(audit_id,job_id,actor_id,action,created_at,detail) SELECT ?,?,?,'approve',?,? WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND transition_token=?)").bind(crypto.randomUUID(),row.job_id,user,date,body.note.trim(),row.job_id,reviewToken)
      ]);
      return result[0].meta.changes?importJSON({job_id:row.job_id,status:'approved'}):importJSON({error:'Bản nháp vừa thay đổi. Tải lại để kiểm tra.'},409);
    }
    if(match&&match[2]==='publish'&&request.method==='POST') {
      if(role!=='admin')return importJSON({error:'Chỉ quản trị viên được xuất bản học liệu.'},403);
      const row=await db.prepare('SELECT * FROM import_jobs WHERE job_id=?').bind(match[1]).first();if(!row||row.status!=='approved')return importJSON({error:'Học liệu phải được duyệt trước khi xuất bản.'},409);
      const bundle=JSON.parse(row.payload),versions=JSON.parse(row.base_versions),revisions=JSON.parse(row.base_revisions),token=crypto.randomUUID(),date=new Date().toISOString();
      const condition="NOT EXISTS(SELECT 1 FROM json_each(?) e LEFT JOIN published_lessons p ON p.lesson_id=e.key WHERE coalesce(p.version,'')<>coalesce(e.value,'')) AND NOT EXISTS(SELECT 1 FROM json_each(?) e LEFT JOIN active_questions a ON a.question_id=e.key WHERE coalesce(a.revision_id,'')<>coalesce(e.value,''))";
      const statements=[db.prepare("UPDATE import_jobs SET status='published',published_at=?,publication_token=?,updated_at=? WHERE job_id=? AND status='approved' AND payload_hash=? AND "+condition).bind(date,token,date,row.job_id,row.payload_hash,JSON.stringify(versions),JSON.stringify(revisions))];
      for(const lesson of bundle.lessons)statements.push(db.prepare("INSERT INTO published_lessons(lesson_id,job_id,source_id,version,payload,published_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND publication_token=?) ON CONFLICT(lesson_id) DO UPDATE SET job_id=excluded.job_id,source_id=excluded.source_id,version=excluded.version,payload=excluded.payload,published_at=excluded.published_at").bind(lesson.id,row.job_id,row.source_id,await importHash(lesson),JSON.stringify(lesson),date,row.job_id,token));
      statements.push(db.prepare('DELETE FROM active_questions WHERE question_id IN (SELECT key FROM json_each(?)) AND EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND publication_token=?)').bind(JSON.stringify(revisions),row.job_id,token));
      statements.push(db.prepare("UPDATE source_files SET status='published',latest_job_id=?,updated_at=? WHERE drive_id=? AND EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND publication_token=?)").bind(row.job_id,date,row.source_id,row.job_id,token));
      statements.push(db.prepare("INSERT INTO import_audit(audit_id,job_id,actor_id,action,created_at,detail) SELECT ?,?,?,'publish',?,'Source-reviewed lesson publication' WHERE EXISTS(SELECT 1 FROM import_jobs WHERE job_id=? AND publication_token=?)").bind(crypto.randomUUID(),row.job_id,user,date,row.job_id,token));
      const results=await db.batch(statements);return results[0].meta.changes?importJSON({job_id:row.job_id,status:'published',bankVersion:(await loadCurrent()).bankVersion}):importJSON({error:'Có phiên bản khác đã xuất bản hoặc câu hỏi vừa được sửa. Mở lại bản nháp và kiểm tra trên nội dung mới nhất.'},409);
    }
    return importJSON({error:'Không tìm thấy API nhập tài liệu.'},404);
  }
  return {loadPublished,handle};
}
