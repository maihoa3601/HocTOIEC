import {readFile,writeFile} from 'node:fs/promises';
const catalog=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const byId=new Map(catalog.items.map(f=>[f.id,f]));
const source=(id,pages)=>({id,title:byId.get(id).name,pages,url:`https://drive.google.com/file/d/${id}/view`});
const MAI='1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD';
const sets=[];
function set(id,title,topic,sourceId,pages,summary){const file=byId.get(sourceId);const s={id,title,topic,courseId:file.course,folderId:file.parent,description:'Làm bài, xem giải thích rồi ôn lại câu sai.',origin:'Chuyển từ tài liệu / biên soạn theo nội dung đã đọc',sources:[source(sourceId,pages)],summary,questions:[],cards:[]};sets.push(s);return s}
function add(s,rows,page=1){for(const [prompt,options,answer,explanation,p=page]of rows)s.questions.push({id:s.id+'-'+String(s.questions.length+1).padStart(3,'0'),type:'choice',prompt,options,answer,explanation,sourceId:s.sources[0].id,page:p});}
const who=set('who-what','Who / What với động từ to be','Nền tảng','1OAAbYlzBi6H9rXSUyptNFg0T9n6tyoWJ',[1,2,3,4],['Who dùng để hỏi về người; What hỏi về vật hoặc sự việc.','This / that đi với is; these / those đi với are.','Trả lời số ít bằng It is; trả lời số nhiều bằng They are.']);
who.sources.push(source('1GFIEtmxAL004SdKMkJYi-60u6obtylfz',[1,2]),source('1Otzvfh5a48AI-NSmbacog6oHHfK3I9Al',[1,2]));
add(who,[
 ['Who ___ she? — She is my aunt.',['are','is'],1,'She là ngôi thứ ba số ít nên đi với is.',2],
 ['Who is this? — It ___ my daughter.',['is','are'],0,'It là chủ ngữ số ít, dùng is.',2],
 ['Who are ___? — They are our classmates.',['this','those'],1,'Are và They chỉ số nhiều; chọn those.',2],
 ['Who is ___? — It is Trang.',['that','these'],0,'Is đi với that, không đi với these.',2],
 ["What ___ this? — It’s my hat.",['are','is'],1,'This là số ít nên dùng is.',3],
 ['What is that? — It ___ a cake.',['is','are'],0,'It is + danh từ số ít.',3],
 ['What are these? — ___ are my bags.',['They','It'],0,'These và bags đều chỉ số nhiều; dùng They.',3],
 ['What are those? — ___ are his jeans.',['It','They'],1,'Those đi với câu trả lời They are.',3],
 ['Who ___ they?',['are','am'],0,'They đi với are; am chỉ đi với I.',3],
 ['What ___ that?',['are','is'],1,'That là số ít nên dùng is.',3],
 ["___ is this? — It’s my grandfather.",['What','Who'],1,'Grandfather là người nên hỏi bằng Who.',3],
 ['___ are those? — They are pillows.',['What','Who'],0,'Pillows là đồ vật nên dùng What.',3],
 ['What is that? — ___ is a chair.',['They','It'],1,'A chair là danh từ số ít; trả lời It is.',3],
 ['Who are these? — ___ are my cousins.',['They','It'],0,'These và cousins là số nhiều nên dùng They.',3]
]);
const matching=["It’s my grandfather.",'They are my children.','They are my socks.','She is my cousin.',"It’s a banana."];
const matches=[['Who is she?',3,'She tương ứng với câu trả lời She is my cousin.'],['Who is this?',0,'This hỏi một người; câu trả lời được nối là It’s my grandfather.'],['What is that?',4,'What hỏi đồ vật; that số ít tương ứng It’s a banana.'],['Who are these?',1,'Who hỏi người, these số nhiều; chọn They are my children.'],['What are they?',2,'What hỏi vật, they số nhiều; chọn They are my socks.']];
for(const [prompt,answer,explanation]of matches){add(who,[[prompt,matching,answer,explanation]],1);const q=who.questions.at(-1);q.sourceId='1GFIEtmxAL004SdKMkJYi-60u6obtylfz';}
const qa=[
 ["___ is this? — It’s a desk.",['What','Who'],0,'Desk là đồ vật nên dùng What.'],
 ['___ are these? — They are shirts.',['What','Who'],0,'Shirts là đồ vật số nhiều; dùng What.'],
 ['___ are these? — They are my children.',['What','Who'],1,'Children chỉ người nên dùng Who.'],
 ['___ is this? — It is my friend.',['What','Who'],1,'Friend chỉ người nên dùng Who.'],
 ['___ are those? — They are her jeans.',['What','Who'],0,'Jeans là đồ vật nên dùng What.'],
 ['What are ___? — They are her dogs.',['those','it','you'],0,'Are và They yêu cầu chủ ngữ số nhiều; those phù hợp với câu trả lời chỉ các con chó.'],
 ['Who are they? — They ___ our classmates.',['is','am','are'],2,'They đi với are.'],
 ['What is this? — ___ a chair.',['They’re','It’s','I’m'],1,'A chair là một đồ vật, trả lời It is / It’s.'],
 ['Who is this? — ___ is my friend.',['It','You','They'],0,'Đáp lại Who is this? có thể dùng It is + người được giới thiệu.'],
 ["Who ___ that? — It’s his grandmother.",['is','are','am'],0,'That là số ít nên đi với is.']
];
for(const row of qa){add(who,[row],2);who.questions.at(-1).sourceId='1GFIEtmxAL004SdKMkJYi-60u6obtylfz';}
for(const [prompt,accept,explanation]of [
 ['Viết câu trả lời tiếng Anh: “Đây là một cái bàn.”',['It is a desk',"It's a desk",'This is a desk'],'Cấu trúc It is + a + danh từ số ít.'],
 ['Viết câu trả lời tiếng Anh: “Họ là những người bạn của tôi.”',['They are my friends',"They're my friends"],'They are + danh từ số nhiều.'],
 ['Viết câu hỏi tiếng Anh: “Cô ấy là ai?”',['Who is she',"Who's she"],'Who + is + she?'],
 ['Viết câu hỏi tiếng Anh: “Những cái này là gì?”',['What are these'],'What + are + these?']
])who.questions.push({id:'who-what-'+String(who.questions.length+1).padStart(3,'0'),type:'text',prompt,accept,explanation,sourceId:who.sources[0].id,page:prompt.includes('bạn')||prompt.includes('Cô ấy')?2:3});
const basicWords=[['grandfather','ông'],['grandmother','bà'],['cousin','anh, chị hoặc em họ'],['classmate','bạn cùng lớp'],['banana','quả chuối'],['cake','bánh'],['bag','cặp, túi'],['desk','cái bàn'],['chair','cái ghế'],['shirt','áo sơ mi'],['hat','cái mũ'],['jeans','quần bò'],['pillow','cái gối'],['sock','cái tất']];
who.cards=basicWords.map(([front,back],i)=>({id:'who-word-'+i,front,back,sourceId:who.sources[0].id,page:1}));
const simple=set('present-simple','Thì hiện tại đơn','Ngữ pháp','1XPvtsqyfYBdPP8Q6thy3PA2Kc1lPvbUs',[3,4],['Dùng cho thói quen, sự thật hiện tại và lịch trình cố định.','He / she / it: động từ thêm s/es; phủ định dùng does not + động từ nguyên mẫu.','Trạng từ tần suất đứng trước động từ thường và sau to be.']);
add(simple,[
 ['I usually ___ up at 6.00.',['gets','get'],1,'I dùng động từ nguyên mẫu get.'],
 ['___ he often work at the weekend?',['Does','Do'],0,'He đi với trợ động từ Does.'],
 ['My son ___ like ice cream.',['doesn’t','don’t'],0,'My son là số ít; dùng doesn’t + like.'],
 ['Our children ___ active.',['is','are'],1,'Children là số nhiều nên dùng are.'],
 ['Water ___ at 100°C.',['boil','boils'],1,'Water là danh từ không đếm được, chia động từ số ít boils.'],
 ['___ your baby cry at night?',['Does','Do'],0,'Your baby là số ít nên dùng Does.'],
 ['They never ___ to work.',['cycles','cycle'],1,'They dùng động từ nguyên mẫu cycle.'],
 ['Her cats ___ cute.',['is','are'],1,'Cats là số nhiều, đi với are.'],
 ['It ___ hot in summer.',['am','is'],1,'It đi với is.'],
 ['He ___ a university student.',['isn’t','aren’t'],0,'He dùng is not / isn’t.'],
 ['We usually ___ dinner at 7.00.',['has','have'],1,'We dùng have, không dùng has.'],
 ['The train ___ at 4.30.',['leaves','leave'],0,'The train là số ít; lịch trình cố định dùng hiện tại đơn leaves.'],
 ['The Sun ___ in the West.',['sets','set'],0,'The Sun là số ít và câu nêu sự thật, dùng sets.'],
 ['My son sometimes ___ his bedroom.',['tidy','tidies'],1,'Ngôi thứ ba số ít: tidy đổi y thành ies.'],
 ['Our children often ___ around the park.',['runs','run'],1,'Children là số nhiều, dùng run.'],
 ['My brother-in-law doesn’t ___ at a bank.',['work','works'],0,'Sau doesn’t là động từ nguyên mẫu work.'],
 ['I ___ my grandmother twice a month.',['see','sees'],0,'I dùng see; twice a month diễn tả tần suất.'],
 ['Her bedroom ___ always tidy.',['is','are'],0,'Bedroom số ít dùng is; always đứng sau to be.'],
 ['___ trees usually turn yellow in the autumn?',['Do','Does'],0,'Trees là số nhiều nên dùng Do.']
],4);
const perfect=set('present-perfect','Thì hiện tại hoàn thành','Ngữ pháp','1wBQSgX1vRTwfLTojBWuxHzfGfwCCVI-S',[2,3,4],['Have / has + quá khứ phân từ (V3).','For đi với khoảng thời gian, since đi với mốc thời gian.','Yet thường gặp trong câu phủ định hoặc nghi vấn; just diễn tả việc vừa xảy ra.']);
add(perfect,[
 ['They ___ lived in Paris for 2 years.',['have','has'],0,'They đi với have + V3.'],
 ['___ she heard the story yet?',['Has','Have'],0,'She đi với Has trong câu nghi vấn.'],
 ['We ___ at this factory since 2020.',['worked','have worked'],1,'Since 2020 là mốc bắt đầu kéo dài tới hiện tại; dùng have worked.'],
 ['I ___ dinner yet.',['haven’t had','didn’t have'],0,'Yet trong câu phủ định ở ngữ cảnh hiện tại hoàn thành: haven’t had.'],
 ['I ___ just read her essay.',['have','has'],0,'I dùng have; just đứng giữa have và V3.'],
 ['My cousin ___ stayed in my flat for 2 days.',['has','have'],0,'My cousin là số ít, dùng has.'],
 ['They ___ since 2015.',['married','have been married'],1,'Trạng thái bắt đầu từ 2015 và còn tiếp diễn: have been married.'],
 ['She ___ for her book for 20 minutes.',['has searched','have searched'],0,'She đi với has + V3; for 20 minutes là khoảng thời gian.'],
 ['He ___ her message yet.',['haven’t received','hasn’t received'],1,'He đi với has not / hasn’t.'],
 ['I ___ my key.',['have lost','has lost'],0,'I dùng have lost, kết quả hiện tại là không có chìa khóa.']
],4);
const wordform=set('word-form','Chọn đúng từ loại trong câu','Ngữ pháp','1oc8t1Jz82dblqUom-wT1CWCbXnMcopLN',[1,2],['Xác định từ loại cần điền từ vị trí trong câu.','Sau mạo từ hoặc tính từ thường cần danh từ; sau be / seem / feel thường cần tính từ.','Phân biệt -ed diễn tả cảm nhận và -ing diễn tả điều gây ra cảm nhận.']);
add(wordform,[
 ["The company's recent ___ of advanced technologies has significantly boosted productivity.",['applying','apply','applicable','application'],3,'Sau tính từ recent và trước of cần danh từ: application.',1],
 ["His speech was both ___ and entertaining, capturing everyone's attention.",['inform','informative','information','informing'],1,'Both ... and ... nối hai tính từ; informative song song với entertaining.',1],
 ['She was deeply ___ by the unexpected failure of the project.',['disappointing','disappointed','disappoint','disappointment'],1,'She là người chịu cảm xúc; dùng tính từ disappointed.',1],
 ['The film was highly ___, attracting a large number of viewers on its opening weekend.',['entertain','entertained','entertaining','entertainment'],2,'Bộ phim gây hứng thú nên dùng entertaining.',1],
 ['He remained ___ during the entire argument, which helped resolve the conflict peacefully.',['calmly','calming','calmed','calm'],3,'Remain là linking verb; dùng tính từ calm.',1],
 ['His ___ to the charity has helped improve the lives of many underprivileged children.',['donate','donation','donated','donating'],1,'Sau tính từ sở hữu His cần danh từ: donation.',1],
 ['It took her months to ___ from the injuries she sustained in the accident.',['recover','recovery','recovering','recovered'],0,'To + động từ nguyên mẫu: recover.',1],
 ['His speech was full of technical terms and jargon, making it ___ for the audience to understand without prior knowledge of the subject.',['access','accessible','inaccessibly','inaccessible'],3,'Make + tân ngữ + tính từ; nội dung khó hiểu nên chọn inaccessible.',1],
 ["The speaker's ___ inspired everyone in the room to work harder.",['motivation','motivate','motivational','motivated'],0,'Sau sở hữu speaker’s, vị trí chủ ngữ cần danh từ motivation.',1],
 ['The increasing demand for eco-friendly products has prompted companies to focus on the ___ of biodegradable materials.',['produce','production','productive','producing'],1,'Cụm the ... of yêu cầu danh từ: production.',2],
 ["The ___ growth of the city's population has led to housing shortages.",['rapids','rapidly','rapidity','rapid'],3,'Trước danh từ growth cần tính từ rapid.',2],
 ['The new employee is extremely ___ about learning all aspects of the job.',['enthusiasm','enthusiastic','enthusiastically','enthuse'],1,'Be + trạng từ + tính từ: extremely enthusiastic.',2],
 ["The government's main focus is on the ___ of renewable energy sources.",['develop','developer','development','developing'],2,'The development of: sự phát triển. Developer là người/đơn vị phát triển.',2],
 ['His presentation was so ___ that everyone stayed focused until the very end.',['interested','interest','interesting','interests'],2,'Bài thuyết trình gây hứng thú nên dùng interesting.',2],
 ['The weather was so ___ that we decided to postpone the picnic until next week.',['disappointed','disappointing','disappoint','disappointment'],1,'Thời tiết gây thất vọng nên dùng disappointing.',2],
 ['The audience was ___ by the performance of the young pianist.',['amazing','amazed','amaze','amazement'],1,'Khán giả có cảm giác ngạc nhiên: amazed.',2],
 ['The company aims to ___ its market share by launching a new advertising campaign.',['expand','expansion','expanded','expanding'],0,'Aim to + động từ nguyên mẫu: expand.',2],
 ['The manager issued a formal apology for the ___ of customer complaints, promising immediate improvements in service quality.',['handle','handled','mishandling','handles'],2,'Sau the và trước of cần danh từ/danh động từ: mishandling.',2],
 ['The school will ___ a new policy to address the issue of student absenteeism.',['implemented','implementation','implementing','implement'],3,'Sau will là động từ nguyên mẫu implement.',2],
 ['His calm and ___ attitude during the crisis earned him great respect.',['professionalism','professionally','profession','professional'],3,'Calm and professional cùng bổ nghĩa cho attitude.',2]
]);
const vocab=set('study4-vocab','Từ vựng TOEIC · List 1','Từ vựng','1PetF-5NjsyD56y8BHMrJD2iejycjU1Bq',[1,2,3,4,5],['Học nghĩa theo ngữ cảnh công việc, đi lại và dịch vụ.','Lật thẻ để tự nhớ trước khi xem nghĩa.','Đánh dấu “Đã nhớ” hoặc “Cần ôn” để lên lịch nhắc lại trong góc học.']);
const words=[['accountant','kế toán viên','người phụ trách công việc tài chính, kế toán trong doanh nghiệp',1],['airport','sân bay','nơi hành khách đến để đi máy bay',2],['applicant','người nộp hồ sơ','người nộp đơn xin việc hoặc đăng ký một vị trí',2],['attendant','nhân viên phục vụ','người hỗ trợ hoặc phục vụ nhu cầu của người khác',2],['bicycle','xe đạp','phương tiện có hai bánh và bàn đạp',3],['brochure','tờ gấp giới thiệu','ấn phẩm nhỏ giới thiệu sản phẩm hoặc dịch vụ',3],['cafeteria','quán ăn tự phục vụ','nơi khách tự lấy món và trả tiền ở quầy',4],['caller','người gọi điện','người đang gọi điện đến cho bạn',4],['candidate','ứng viên được cân nhắc','người được cân nhắc cho công việc hoặc chức vụ',5],['chef','đầu bếp','người nấu ăn chuyên nghiệp',5]];
for(const [i,w]of words.entries()){
 const [word,meaning,definition,page]=w,correct=i%4;const distractors=words.filter(x=>x[0]!==word).filter(x=>!(word==='applicant'&&x[0]==='candidate'||word==='candidate'&&x[0]==='applicant')).slice((i*2)%5).slice(0,3).map(x=>x[1]);while(distractors.length<3)distractors.push(words[(i+distractors.length+2)%words.length][1]);const options=distractors.slice();options.splice(correct,0,meaning);
 add(vocab,[[`Trong danh sách từ vựng, “${word}” nghĩa là gì?`,options,correct,`${word}: ${meaning} — ${definition}.`,page]]);
 vocab.cards.push({id:'study4-word-'+word,front:word,back:meaning,example:definition,sourceId:vocab.sources[0].id,page});
}
const bank={version:1,reviewedDate:'12/11/2026',note:'Câu hỏi được chuyển hoặc biên soạn từ những trang tài liệu đã đọc. Giải thích do TOEIC Studio biên soạn; có liên kết nguồn để đối chiếu.',sets};
await writeFile(new URL('../data/learning-bank.json',import.meta.url),JSON.stringify(bank,null,2));
console.log(JSON.stringify({sets:sets.length,questions:sets.reduce((n,s)=>n+s.questions.length,0),cards:sets.reduce((n,s)=>n+s.cards.length,0),courses:new Set(sets.map(s=>s.courseId)).size}));

await import('./enrich-learning-bank.mjs');
