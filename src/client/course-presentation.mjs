import {isVideo} from './core.mjs';
const course='1pCQAKuQM_ywmrCbxjQeTb787sDgi8dfv',grammar='1qbVEZO9dZBc65fKzCik7G6CbWIGY0PBE',mixed='1ixwVv4yp-JzqET-iZXSzBywmUfSOtIGE';
const names={
 [grammar]:'01. Học nền tảng & chiến thuật TOEIC',
 '1a--xcMMkkO9r5eIiZzBUr46lD8NryaWy':'02. Giải đề cùng cô Thắm',
 '1MSRCk28mEuVpw-UQrGrba64cxKEFetMR':'03. Kho tài liệu ETS 2022–2023',
 '1Nk1ydkXTTMlmlzvYpVqVrlL98Gwr7qjZ':'00. Bắt đầu · Lộ trình tự học',
 '1X9kRI3lbrE7wdZ9MAJq5VgrxtBTZuAjk':'05. Từ vựng học song song',
 '19EgD9NnpdCPNTIYK15Gk9eUi4eQ7WT4Z':'01. Phát âm · Bài 1–3',
 [mixed]:'02. Ngữ pháp · Bài 4–17'
};
export function coursePresentation(nodes,resources){
 const move=f=>{if(f.course!==course||f.parent!==mixed||!isVideo(f))return f;const n=Number(f.name.match(/^bài\s+(\d+)/i)?.[1]);return n>=18?{...f,parent:n<=27?'ms-tham-listening':'ms-tham-reading'}:f};
 const adjusted=nodes.map(f=>names[f.id]?{...f,title:names[f.id],name:names[f.id]}:move(f));
 for(const [id,name] of [['ms-tham-listening','03. Chiến thuật Listening · Bài 18–27'],['ms-tham-reading','04. Chiến thuật Reading · Bài 28–33']])adjusted.push({id,name,mime:'application/vnd.google-apps.folder',parent:grammar,course,virtual:true});
 return {nodes:adjusted,resources:resources.map(move)};
}
