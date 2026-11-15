import {cleanTitle,isVideo} from './core.mjs';
import {resourceLabel} from './hierarchy.mjs';
import {studyStreak} from './studio-v2.mjs';

export function createTodayHub(ctx){
  const {bank,courses,byId,getState,progress,persist,saveLearning,esc,icon,fmt,heading,toast}=ctx;

  const PRIORITY_DEFAULT='1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD'; // Tiếng Anh căn bản & TOEIC 4 kỹ năng

  function getActiveCourse(){
    const state=getState();
    const pCourseId=state.priorityCourse||PRIORITY_DEFAULT;
    return courses.find(c=>c.id===pCourseId)||courses[0];
  }

  function getUnfinishedSession(){
    const state=getState();
    const p=progress();

    // Check drafts first
    const draftEntries=Object.entries(state.drafts||{}).filter(([k,d])=>d&&d.answers&&Object.keys(d.answers).length>0);
    if(draftEntries.length){
      // sort by updatedAt desc
      draftEntries.sort((a,b)=>(b[1].updatedAt||0)-(a[1].updatedAt||0));
      const [key,draft]=draftEntries[0];
      const baseId=key.split(':')[0];
      const set=bank.sets.find(s=>s.id===baseId);
      if(set){
        const course=courses.find(c=>c.id===set.courseId)||getActiveCourse();
        const folder=byId.get(set.folderId);
        return {
          type:'draft',
          title:set.title,
          courseTitle:course?.title||'Khóa học TOEIC',
          chapterTitle:folder?cleanTitle(folder.name):'Chương học',
          answeredCount:Object.values(draft.answers).filter(a=>String(a).trim()).length,
          totalCount:set.questions.length,
          url:`#quiz?id=${encodeURIComponent(baseId)}${key.includes(':')?'&mode='+encodeURIComponent(key.split(':')[1]):''}`,
          studyUrl:`#study?course=${encodeURIComponent(set.courseId)}&folder=${encodeURIComponent(set.folderId)}`,
          reason:'Đang làm dở'
        };
      }
    }

    // Check in-progress exam attempt draft if no active quiz draft
    try {
      if (typeof localStorage !== 'undefined') {
        const examDrafts = JSON.parse(localStorage.getItem('toeic-exam-drafts-v1') || '{}');
        const activeAttemptEntry = Object.values(examDrafts).find(
          (d) => d?.attempt?.status === 'in_progress' && d?.attempt?.attempt_id
        );
        if (activeAttemptEntry?.attempt) {
          const att = activeAttemptEntry.attempt;
          const answered = Object.keys(att.answers || {}).length;
          return {
            type: 'exam',
            title: `Đề thi ${att.exam_id?.toUpperCase() || 'TOEIC'}`,
            courseTitle: 'Phòng thi thử TOEIC',
            chapterTitle: att.mode === 'simulation' ? 'Thi mô phỏng chuẩn' : 'Tự luyện linh hoạt',
            answeredCount: answered,
            totalCount: 200,
            url: `#exam-run?attempt=${encodeURIComponent(att.attempt_id)}`,
            studyUrl: '#exams',
            reason: 'Đề thi đang làm dở'
          };
        }
      }
    } catch { /* ignore storage errors */ }

    // Check last active video
    if(p.last&&byId.has(p.last)){
      const lastFile=byId.get(p.last);
      const course=courses.find(c=>c.id===lastFile.course)||getActiveCourse();
      const folder=byId.get(lastFile.parent);
      const isDone=Boolean(p.completed[lastFile.id]);
      if(!isDone){
        return {
          type:'video',
          title:cleanTitle(lastFile.name),
          courseTitle:course?.title||'Khóa học TOEIC',
          chapterTitle:folder?cleanTitle(folder.name):'Chương học',
          url:`#study?course=${encodeURIComponent(course.id)}&folder=${encodeURIComponent(lastFile.parent)}&file=${encodeURIComponent(lastFile.id)}`,
          studyUrl:`#study?course=${encodeURIComponent(course.id)}&folder=${encodeURIComponent(lastFile.parent)}&file=${encodeURIComponent(lastFile.id)}`,
          reason:'Đang học dở'
        };
      }
    }

    return null;
  }

  function getNextLessonOfCourse(course){
    const p=progress();
    const nextVideo=course.videos.find(v=>!p.completed[v.id])||course.videos[0];
    if(nextVideo){
      const folder=byId.get(nextVideo.parent);
      return {
        file:nextVideo,
        title:cleanTitle(nextVideo.name),
        chapterTitle:folder?cleanTitle(folder.name):'Chương học',
        url:`#study?course=${encodeURIComponent(course.id)}&folder=${encodeURIComponent(nextVideo.parent)}&file=${encodeURIComponent(nextVideo.id)}`,
        reason:'Bài tiếp theo trong lộ trình'
      };
    }
    return null;
  }

  function render(){
    const state=getState();
    const p=progress();
    const budget=[15,30,60].includes(state.timeBudget)?state.timeBudget:30;
    const priorityCourse=getActiveCourse();
    const unfinished=getUnfinishedSession();
    const nextLesson=getNextLessonOfCourse(priorityCourse);
    const streak=studyStreak([
      ...state.attempts.map(a=>a.date),
      ...Object.values(state.responses||{}).map(r=>r.date),
      ...Object.values(state.lessonRead||{}),
      ...Object.values(p.completed||{})
    ]);

    // Scale suggestions by time budget (15m, 30m, 60m)
    const reviewItemCount=budget===15?5:budget===30?10:20;
    const dueCards=bank.sets.flatMap(s=>s.cards||[]).filter(c=>!state.cards[c.id]||state.cards[c.id].due<=Date.now());
    const wrongQuestions=state.wrong||[];
    const flaggedLessons=state.flaggedLessons||[];

    // Select recommended review activity
    let reviewTask=null;
    if(dueCards.length>0){
      reviewTask={
        title:`Ôn ${Math.min(dueCards.length,reviewItemCount)} thẻ từ đến hạn`,
        desc:`Theo chu kỳ lặp lại ngắt quãng để giữ vốn từ.`,
        url:`#review?tab=cards&count=${reviewItemCount}`,
        reason:'Đến hạn ôn',
        badge:'Từ vựng'
      };
    }else if(wrongQuestions.length>0){
      reviewTask={
        title:`Ôn lại ${Math.min(wrongQuestions.length,reviewItemCount)} câu sai gần đây`,
        desc:`Xem lại giải thích và củng cố lỗi ngữ pháp/từ vựng.`,
        url:`#review?tab=mistakes&count=${reviewItemCount}`,
        reason:'Cần xem lại',
        badge:'Sổ lỗi sai'
      };
    }else if(flaggedLessons.length>0){
      const lId=flaggedLessons[0];
      const f=byId.get(lId);
      reviewTask={
        title:`Xem lại bài: ${f?cleanTitle(f.name):'Bài đã đánh dấu'}`,
        desc:`Bài bạn đã đánh dấu cần xem lại để nắm chắc hơn.`,
        url:f?`#study?course=${encodeURIComponent(f.course)}&folder=${encodeURIComponent(f.parent)}&file=${encodeURIComponent(f.id)}`:`#review`,
        reason:'Vừa tự đánh dấu cần xem lại',
        badge:'Bài chưa chắc'
      };
    }else{
      reviewTask={
        title:`Thử thách 10 câu ôn tập ngẫu nhiên`,
        desc:`Luyện phản xạ với câu hỏi từ tài liệu đã học.`,
        url:`#quiz?id=smart`,
        reason:'Luyện giữ nhịp',
        badge:'Luyện tập'
      };
    }

    // Recommended Self-Quiz (resumes unfinished quiz draft when present, otherwise opens quiz route)
    const firstSet=bank.sets[0];
    const hasDraft=unfinished?.type==='draft';
    const quizTask={
      title:hasDraft?`Tiếp tục tự kiểm tra: ${unfinished.title}`:(firstSet?`Tự kiểm tra: ${firstSet.title}`:'Luyện tập 10 câu TOEIC'),
      desc:hasDraft?`Đã trả lời ${unfinished.answeredCount}/${unfinished.totalCount} câu · Có chấm điểm & lời giải.`:(firstSet?`${firstSet.questions.length} câu hỏi kèm đáp án & lời giải đối chiếu nguồn.`:'Tự kiểm tra có chấm điểm và phân tích.'),
      url:hasDraft?unfinished.url:(firstSet?`#quiz?id=${encodeURIComponent(firstSet.id)}`:`#quiz?id=smart`),
      reason:hasDraft?'Đang có bài làm dở':'Luyện sau khi học bài',
      badge:'Tự kiểm tra'
    };
    const learnTask=unfinished?.type==='video'
      ?unfinished
      :(nextLesson
          ?{...nextLesson,courseTitle:priorityCourse?.title||'Khóa học TOEIC'}
          :(unfinished?.studyUrl?{...unfinished,url:unfinished.studyUrl,reason:'Bài học liên quan'}:null));

    return `
    <div class="today-hub-container">
      ${heading('Một chút mỗi ngày,<br>tiến xa hơn mỗi bước.','Không cần vội. Chỉ cần dành một khoảng thời gian cho mục tiêu của bạn.',`<a class="btn btn-secondary today-library-link" href="#courses">${icon('book')}Khám phá khóa học ${icon('arrow')}</a>`).replace('LEARN AT YOUR OWN PACE','KHÔNG GIAN HỌC TẬP CỦA BẠN')}

      <!-- Hero: Primary Standout Action -->
      <div class="today-feature-grid">
      <section class="today-hero-card">
        <div class="today-hero-content">
          <div class="today-hero-eyebrow">
            <span class="reason-pill standout">${esc(unfinished?unfinished.reason:'Khóa học ưu tiên')}</span>
            <span>${esc(unfinished?unfinished.courseTitle:priorityCourse.title)}</span>
          </div>
          <h2 class="today-hero-title">
            <span class="today-hero-kicker">${unfinished?'Sẵn sàng tiếp tục?':'Bài học tiếp theo của bạn'}</span>
            ${unfinished?esc(unfinished.title):nextLesson?esc(nextLesson.title):'Khám phá các khóa học TOEIC'}
          </h2>
          <p class="today-hero-subtitle">
            ${unfinished?`${esc(unfinished.chapterTitle)}${unfinished.answeredCount?` · Đã trả lời ${unfinished.answeredCount}/${unfinished.totalCount} câu`:''}`:nextLesson?esc(nextLesson.chapterTitle):'Chọn một bài trong lộ trình của bạn để bắt đầu.'}
          </p>
          <div class="today-hero-actions">
            <a href="${unfinished?unfinished.url:nextLesson?nextLesson.url:'#courses'}" class="btn btn-primary btn-hero">
              ${icon('play')}
              <span>${unfinished?'Tiếp tục học ngay':'Bắt đầu học ngay'}</span>
            </a>
            ${unfinished?.studyUrl?`<a href="${unfinished.studyUrl}" class="btn btn-secondary">${icon('target')}Mở phòng học</a>`:''}
          </div>
        </div>
        <div class="today-hero-art" aria-hidden="true"><div class="studio-orbit"></div><div class="studio-book"><span>THE NEXT</span><strong>chapter.</strong><span class="studio-book-line"></span><small>TOEIC / YOUR DAILY PRACTICE</small></div><span class="studio-art-spark">✦</span><span class="studio-art-note">${icon('check')} Mỗi ngày một bước tiến</span></div>
      </section>

      <!-- Time Budget Bar (Section 4) -->
      <section class="today-budget-section">
        <div class="today-budget-bar">
          <div class="today-budget-label">
            <span class="today-session-icon">${icon('clock')}</span>
            <span>Thời gian cho bản thân<small>Bạn muốn học bao lâu hôm nay?</small></span>
          </div>
          <div class="today-session-value"><strong>${budget}</strong><span>phút tập trung<br>cho mục tiêu lớn</span>${icon('spark')}</div>
          <div class="today-budget-buttons">
            ${[[15,'Học gọn'],[30,'Vừa sức'],[60,'Chuyên sâu']].map(([minutes,label])=>`<button type="button" class="today-budget-btn ${budget===minutes?'active':''}" data-today-budget="${minutes}" aria-pressed="${budget===minutes}"><strong>${minutes} phút</strong><small>${label}</small></button>`).join('')}
          </div>
          <p class="today-session-hint">${icon('check')} Nhiệm vụ được điều chỉnh theo thời gian bạn chọn.</p>
        </div>
      </section>
      </div>

      <!-- Top 3 Focused Learning Tasks -->
      <section class="today-tasks-section">
        <div class="section-title">
          <div>
            <span class="eyebrow">LỘ TRÌNH NHỎ · TIẾN BỘ LỚN</span>
            <h2>Phiên học ${budget} phút của bạn</h2>
            <p>Ba bước đơn giản để kiến thức ở lại lâu hơn.</p>
          </div>
          <div class="today-task-helpers">
            <button type="button" class="text-button" id="today-light-mode-btn" title="Chỉ ôn nhanh 5 phút">${icon('spark')}Học nhẹ hôm nay</button>
            <button type="button" class="text-button" id="today-skip-btn" title="Bỏ qua nhiệm vụ hôm nay mà không dồn nợ">${icon('refresh')}Nghỉ hôm nay</button>
          </div>
        </div>

        <div class="today-tasks-grid">
          <!-- 1. Bài chính -->
          <article class="today-task-card main-task">
            <div class="today-task-top">
              <span class="today-task-tag badge-main">${icon('book')}<span>01 / Học kiến thức</span></span>
              <span class="reason-pill">${esc(learnTask?.type==='video'?'Đang học dở':'Bài tiếp trong lộ trình')}</span>
            </div>
            <h3>${esc(learnTask?learnTask.title:'Bài học tiếp theo')}</h3>
            <p>${esc(learnTask?`Chương: ${learnTask.chapterTitle} · ${learnTask.courseTitle}`:'Khóa học TOEIC')}</p>
            <div class="today-task-footer">
              <span class="today-task-meta">${icon('video')} Video / Tài liệu gốc</span>
              <a href="${learnTask?learnTask.url:'#courses'}" class="btn btn-primary">${icon('arrow')}Vào học</a>
            </div>
          </article>

          <!-- 2. Lượt tự kiểm tra -->
          <article class="today-task-card quiz-task">
            <div class="today-task-top">
              <span class="today-task-tag badge-quiz">${icon('target')}<span>02 / Tự kiểm tra</span></span>
              <span class="reason-pill">${esc(quizTask.reason)}</span>
            </div>
            <h3>${esc(quizTask.title)}</h3>
            <p>${esc(quizTask.desc)}</p>
            <div class="today-task-footer">
              <span class="today-task-meta">${icon('target')} Có chấm & giải thích</span>
              <a href="${quizTask.url}" class="btn btn-soft">${icon('arrow')}Tự làm bài</a>
            </div>
          </article>

          <!-- 3. Nhóm đến hạn ôn -->
          <article class="today-task-card review-task">
            <div class="today-task-top">
              <span class="today-task-tag badge-review">${icon('refresh')}<span>03 / Ôn để nhớ</span></span>
              <span class="reason-pill">${esc(reviewTask.reason)}</span>
            </div>
            <h3>${esc(reviewTask.title)}</h3>
            <p>${esc(reviewTask.desc)}</p>
            <div class="today-task-footer">
              <span class="today-task-meta">${icon('refresh')} ${esc(reviewTask.badge)}</span>
              <a href="${reviewTask.url}" class="btn btn-secondary">${icon('arrow')}Vào ôn ngay</a>
            </div>
          </article>
        </div>
      </section>

      <!-- Secondary Stats & Info (Section 4) -->
      <section class="today-secondary-stats">
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-icon">${icon('check')}</div>
            <div>
              <strong>${fmt(Object.keys(p.completed||{}).length)}<span class="stat-unit">bài</span></strong>
              <small>Bài học đã hoàn thành</small>
            </div>
          </div>
          <div class="stat">
            <div class="stat-icon" style="background:#eaf4e8;color:#2d6a36">${icon('spark')}</div>
            <div>
              <strong>${streak}<span class="stat-unit">ngày</span></strong>
              <small>Chuỗi học liên tiếp</small>
            </div>
          </div>
          <div class="stat">
            <div class="stat-icon" style="background:#fde8e8;color:#c5221f">${icon('target')}</div>
            <div>
              <strong>${wrongQuestions.length}<span class="stat-unit">câu</span></strong>
              <small>Câu sai cần ôn tập</small>
            </div>
          </div>
        </div>
      </section>
    </div>`;
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b)return;

    if(b.hasAttribute('data-today-budget')){
      const budget=Number(b.dataset.todayBudget);
      const state=getState();
      state.timeBudget=budget;
      saveLearning();
      const hub=document.querySelector('.today-hub-container');
      if(hub)hub.outerHTML=render();
      toast(`Đã chọn quỹ thời gian ${budget} phút. Các nhiệm vụ đã được cân chỉnh vừa sức.`);
      document.querySelector(`[data-today-budget="${budget}"]`)?.focus({preventScroll:true});
    }else if(b.id==='today-light-mode-btn'){
      toast('Đã bật chế độ học nhẹ 5 phút: hãy làm 5 thẻ từ hoặc 3 câu hỏi nhanh.');
      location.hash='review?tab=cards&count=5';
    }else if(b.id==='today-skip-btn'){
      const state=getState();
      state.skippedToday||=[];
      const day=new Date().toISOString().slice(0,10);
      if(!state.skippedToday.includes(day))state.skippedToday.push(day);
      saveLearning();
      toast('Hôm nay là ngày nghỉ giữ nhịp. Lịch học sẽ tiếp tục vào ngày mai mà không dồn nợ.');
    }
  });

  return {render};
}
