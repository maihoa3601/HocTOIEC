import {readFile,writeFile} from 'node:fs/promises';
import {cleanTitle} from '../src/client/core.mjs';
const url=new URL('../data/learning-bank.json',import.meta.url);
const bank=JSON.parse(await readFile(url,'utf8'));
const baseIds=['who-what','present-simple','present-perfect','word-form','study4-vocab'];
bank.sets=bank.sets.filter(set=>baseIds.includes(set.id));
const byId=new Map(bank.sets.map(set=>[set.id,set]));
function lesson(id,sections,pitfalls){const set=byId.get(id);set.lesson={sections:sections.map(([heading,points,examples,page])=>({heading,points,examples:examples.map(([en,vi])=>({en,vi})),sourceId:set.sources[0].id,page})),pitfalls};}
function add(id,activity,rows){const set=byId.get(id);for(const [prompt,accept,explanation,page]of rows){set.questions.push({id:id+'-'+activity+'-'+(set.questions.filter(q=>q.activity===activity).length+1),type:'text',activity,prompt,accept,explanation,sourceId:set.sources[0].id,page})}}
lesson('who-what',[
 ['Chọn Who hay What',['Who hỏi danh tính hoặc mối quan hệ của người.','What hỏi tên gọi của vật; chọn từ hỏi theo đối tượng trong câu trả lời.'],[['Who is your teacher?','Ai là giáo viên của bạn?'],['What are those?','Những thứ kia là gì?']],2],
 ['Ghép số ít, số nhiều với to be',['She / he / it / this / that đi với is; they / these / those đi với are.','Trong câu trả lời, danh từ chỉ một người hay một vật thường ở số ít; nhiều người/vật dùng số nhiều.'],[['She is my cousin.','Cô ấy là chị/em họ của tôi.'],['They are our classmates.','Họ là các bạn cùng lớp của chúng tôi.']],3]
],['Who hỏi về người, kể cả khi câu trả lời bắt đầu bằng It is trong lời giới thiệu.','These / those không đi với is; this / that không đi với are.']);
add('who-what','cloze',[
 ['Điền Who hoặc What: ___ is that? — It is a pillow.',['What'],'Pillow là đồ vật, nên chọn What.',3],
 ['Điền is hoặc are: Who ___ these? — They are my cousins.',['are'],'These và cousins là số nhiều; dùng are.',3],
 ['Điền It hoặc They: What are these? — ___ are my shirts.',['They'],'Câu hỏi dùng these, shirts là số nhiều; trả lời They are.',3]
]);
add('who-what','correction',[
 ['Sửa đúng một lỗi, viết lại cả câu: What is those?',['What are those?'],'Those là số nhiều nên phải dùng are.',3],
 ['Sửa đúng một lỗi, viết lại cả câu: Who are she?',['Who is she?'],'She là ngôi thứ ba số ít, dùng is.',2],
 ['Sửa từ hỏi cho đúng, viết lại câu hỏi: What is he? — He is my grandfather.',['Who is he?'],'Câu trả lời giới thiệu mối quan hệ với một người, nên hỏi Who.',2]
]);
lesson('present-simple',[
 ['Thói quen, sự thật và lịch trình',['Dùng hiện tại đơn cho việc lặp lại và lịch trình cố định.','He / she / it hoặc danh từ số ít thường thêm s/es vào động từ; I / you / we / they dùng dạng nguyên mẫu.'],[['Our office opens at eight.','Văn phòng của chúng tôi mở cửa lúc tám giờ.'],['He usually checks his email.','Anh ấy thường kiểm tra email.']],3],
 ['Câu hỏi và phủ định với động từ thường',['Dùng do / does trước chủ ngữ khi hỏi.','Sau does / does not, động từ chính trở về nguyên mẫu.'],[['She does not work on Sundays.','Cô ấy không làm việc vào Chủ nhật.'],['Do they live nearby?','Họ có sống gần đây không?']],4]
],['He works, nhưng Does he work? và He does not work.','Không dùng do / does để hỏi câu có to be: Is he ready?']);
add('present-simple','cloze',[
 ['Điền dạng đúng của check: Ms. Lee ___ the schedule every morning.',['checks'],'Ms. Lee là chủ ngữ số ít, thêm s vào check.',4],
 ['Điền do hoặc does: ___ your manager work on Saturdays?',['Does'],'Your manager là số ít nên dùng Does.',4],
 ['Điền dạng đúng của study: My brother ___ English after dinner.',['studies'],'Study có phụ âm + y, ngôi thứ ba số ít đổi y thành ies.',4]
]);
add('present-simple','correction',[
 ['Sửa một lỗi, viết lại cả câu: She does not works here.',['She does not work here.',"She doesn't work here."],'Sau does not, dùng động từ nguyên mẫu work.',4],
 ['Sửa một lỗi, viết lại cả câu: They visits the library every week.',['They visit the library every week.'],'They dùng động từ nguyên mẫu visit.',4],
 ['Sửa một lỗi, viết lại cả câu: Do he speak English?',['Does he speak English?'],'He đi với trợ động từ Does.',4]
]);
lesson('present-perfect',[
 ['Công thức have / has + V3',['I / you / we / they đi với have; he / she / it đi với has.','Phủ định thêm not sau have / has; câu hỏi đảo have / has lên trước chủ ngữ.'],[['The team has finished the report.','Nhóm đã hoàn thành báo cáo.'],['Have you visited London?','Bạn đã từng đến London chưa?']],2],
 ['Liên hệ từ quá khứ đến hiện tại',['For chỉ khoảng thời gian, since chỉ mốc bắt đầu.','Yet thường ở cuối câu phủ định hoặc câu hỏi; just đứng giữa have / has và V3.'],[['We have worked here since May.','Chúng tôi làm việc ở đây từ tháng Năm đến nay.'],['I have not called her yet.','Tôi vẫn chưa gọi cho cô ấy.']],4]
],['He has, không phải he have.','Sau have / has phải là quá khứ phân từ; không luôn giống dạng quá khứ đơn.','For two years là khoảng thời gian; since 2020 là mốc thời gian.']);
add('present-perfect','cloze',[
 ['Điền have hoặc has: The accountant ___ checked the invoice.',['has'],'The accountant là chủ ngữ số ít, dùng has.',2],
 ['Điền for hoặc since: We have lived here ___ 2022.',['since'],'2022 là mốc thời gian nên dùng since.',4],
 ['Điền V3 của write: She has ___ three emails today.',['written'],'Quá khứ phân từ của write là written.',3]
]);
add('present-perfect','correction',[
 ['Sửa một lỗi, viết lại cả câu: He have finished the task.',['He has finished the task.'],'He đi với has.',2],
 ['Sửa một lỗi, viết lại cả câu: They have work here for a year.',['They have worked here for a year.'],'Sau have dùng V3; work là động từ có quy tắc, thêm ed.',2],
 ['Sửa một lỗi, viết lại cả câu: I have known her since two years.',['I have known her for two years.'],'Two years là khoảng thời gian, dùng for.',4]
]);
lesson('word-form',[
 ['Tìm vị trí cần danh từ hoặc tính từ',['Cụm the ... of hoặc tính từ sở hữu thường mở đầu cụm danh từ.','Trước danh từ có thể cần tính từ; sau be / seem / remain thường dùng tính từ để mô tả chủ ngữ.'],[['The manager approved the proposal.','Quản lý đã phê duyệt đề xuất.'],['The team seems confident.','Nhóm có vẻ tự tin.']],1],
 ['Trạng từ và tính từ cảm xúc',['Trạng từ thường bổ nghĩa cho động từ hoặc tính từ.','-ed thường diễn tả cảm nhận của người; -ing diễn tả người/vật/sự việc gây ra cảm nhận.'],[['They completed the work successfully.','Họ đã hoàn thành công việc thành công.'],['Her explanation was clear.','Lời giải thích của cô ấy rõ ràng.']],2]
],['An interesting presentation gây hứng thú; an interested audience có cảm giác hứng thú.','Không chọn từ chỉ dựa vào đuôi: phải đọc vị trí và nghĩa cả câu.']);
add('word-form','cloze',[
 ['Điền dạng danh từ của develop: The ___ of the product took a year.',['development'],'Cụm The ... of yêu cầu danh từ development.',2],
 ['Điền dạng tính từ của profession: Her attitude is very ___.',['professional'],'Sau be và very cần tính từ professional.',2],
 ['Điền interested hoặc interesting: The lecture was ___.',['interesting'],'Bài giảng gây hứng thú nên dùng interesting.',2]
]);
add('word-form','correction',[
 ['Sửa một lỗi, viết lại cả câu: The audience was amazing by the show.',['The audience was amazed by the show.'],'Audience là đối tượng cảm thấy ngạc nhiên nên dùng amazed.',2],
 ['Sửa một lỗi, viết lại cả câu: The company will expansion its business.',['The company will expand its business.'],'Sau will cần động từ nguyên mẫu expand.',2],
 ['Sửa một lỗi, viết lại cả câu: She feels calmly.',['She feels calm.'],'Feel là linking verb trong câu này, đi với tính từ calm.',1]
]);
lesson('study4-vocab',[
 ['Accountant · người làm kế toán',['Accountant là người làm công việc kế toán trong doanh nghiệp.'],[['The accountant checked the invoice.','Kế toán viên đã kiểm tra hóa đơn.']],1],
 ['Airport, applicant và attendant',['Airport là sân bay; applicant nhấn mạnh người nộp đơn hoặc hồ sơ.','Attendant là người hỗ trợ hoặc phục vụ người khác.'],[['The applicant sent her resume.','Người ứng tuyển đã gửi hồ sơ xin việc.'],['An attendant helped the visitor.','Một nhân viên phục vụ đã giúp người khách.']],2],
 ['Bicycle và brochure',['Bicycle là xe đạp; brochure là ấn phẩm nhỏ giới thiệu sản phẩm hoặc dịch vụ.'],[['A brochure describes the service.','Một tờ gấp giới thiệu mô tả dịch vụ.']],3],
 ['Cafeteria và caller',['Cafeteria là nơi ăn uống tự phục vụ; caller là người gọi điện.'],[['The caller left a message.','Người gọi điện đã để lại lời nhắn.']],4],
 ['Candidate và chef',['Candidate là người được cân nhắc cho một công việc hoặc chức vụ.','Chef là người nấu ăn chuyên nghiệp.'],[['The chef prepared the meal.','Đầu bếp đã chuẩn bị bữa ăn.'],['The candidate answered the question.','Ứng viên đã trả lời câu hỏi.']],5]
],['Applicant và candidate có thể cùng dịch là ứng viên, nhưng sắc thái nghĩa khác nhau.','Nên tự nhớ từ trước khi lật thẻ hoặc chọn đáp án.']);
add('study4-vocab','cloze',[
 ['Điền từ tiếng Anh trong List 1: “kế toán viên” là ___.',['accountant'],'Accountant là người phụ trách kế toán.',1],
 ['Điền từ tiếng Anh trong List 1: “sân bay” là ___.',['airport'],'Airport là nơi hành khách đi/đến bằng máy bay.',2],
 ['Điền từ tiếng Anh trong List 1: “đầu bếp” là ___.',['chef'],'Chef là người nấu ăn chuyên nghiệp.',5]
]);
add('study4-vocab','translation',[
 ['Viết từ tiếng Anh trong List 1 có nghĩa “xe đạp”.',['bicycle'],'Bicycle có hai bánh và bàn đạp.',3],
 ['Viết từ tiếng Anh trong List 1 có nghĩa “người gọi điện”.',['caller'],'Caller là người gọi điện đến.',4],
 ['Viết từ tiếng Anh trong List 1 có nghĩa “tờ gấp giới thiệu”.',['brochure'],'Brochure là ấn phẩm giới thiệu sản phẩm hoặc dịch vụ.',3]
]);
for(const set of bank.sets)for(const q of set.questions)q.activity||=q.type==='text'?'translation':'choice';
for(const filename of ['learning-content-a.json','learning-content-b.json'])bank.sets.push(...JSON.parse(await readFile(new URL('../data/'+filename,import.meta.url),'utf8')));
const ids=new Set();for(const set of bank.sets){if(ids.has(set.id))throw Error('Duplicate set '+set.id);ids.add(set.id);for(const source of set.sources)source.title=cleanTitle(source.title);}
const readingOrder=['to-be-basics','to-be-questions','who-what','where-when','verb-endings','word-classes-basics','present-simple','present-continuous','past-simple-affirmative','present-perfect','future-simple','word-form','study4-vocab'];
bank.sets.sort((a,b)=>readingOrder.indexOf(a.id)-readingOrder.indexOf(b.id));
bank.reviewedDate='13/11/2026';bank.note='Bài học, ví dụ và câu luyện được ứng dụng biên soạn theo những trang tài liệu đã đọc; có liên kết nguồn và số trang để đối chiếu. Nội dung quảng bá được bỏ qua.';
await writeFile(url,JSON.stringify(bank,null,2));
console.log(JSON.stringify({sets:bank.sets.length,questions:bank.sets.reduce((n,s)=>n+s.questions.length,0),cards:bank.sets.reduce((n,s)=>n+s.cards.length,0)}));
