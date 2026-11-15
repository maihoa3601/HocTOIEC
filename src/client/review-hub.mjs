import {cleanTitle,isVideo} from './core.mjs';
import {scheduleCard,MISTAKE_REASONS} from './learning-core.mjs';
import {canSpeak,speakEnglish} from './speech.mjs';

export function createReviewHub(ctx){
  const {bank,courses,byId,getState,progress,persist,saveLearning,esc,icon,fmt,heading,toast}=ctx;
  const $=s=>document.querySelector(s);

  let activeTab='all'; // 'all' | 'cards' | 'mistakes' | 'lessons'
  let activeReviewSession=null;

  function fileURL(id){return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;}

  function getDueCards(limit=100){
    const state=getState();
    const allCards=bank.sets.flatMap(s=>s.cards.map(c=>({...c,setId:s.id,setTitle:s.title})));
    return allCards
      .filter(c=>!state.cards[c.id]||state.cards[c.id].due<=Date.now())
      .slice(0,limit);
  }

  function getMistakeQuestions(limit=100){
    const state=getState();
    const qMap=new Map(bank.sets.flatMap(s=>s.questions.map(q=>[q.id,{...q,setId:s.id,setTitle:s.title}])));
    return (state.wrong||[])
      .map(id=>qMap.get(id))
      .filter(Boolean)
      .slice(0,limit);
  }

  function getFlaggedLessons(limit=100){
    const state=getState();
    return (state.flaggedLessons||[])
      .map(id=>byId.get(id))
      .filter(Boolean)
      .slice(0,limit);
  }

  function render(params){
    const state=getState();
    const budget=state.timeBudget||30;
    const requestedTab=params?.get?.('tab')||activeTab||'all';
    activeTab=['all','cards','mistakes','lessons'].includes(requestedTab)?requestedTab:'all';

    const cardLimit=budget===15?5:budget===30?10:20;
    const dueCards=getDueCards();
    const mistakes=getMistakeQuestions();
    const flaggedLessons=getFlaggedLessons();

    const totalReviewCount=dueCards.length+mistakes.length+flaggedLessons.length;

    return `
    <div class="review-hub-shell">
      ${heading('Hộp ôn tập thống nhất','Tập trung vào thẻ từ đến hạn, câu đã sai và những bài bạn đã đánh dấu cần xem lại.')}

      <!-- Time Budget Selector -->
      <div class="review-budget-bar">
        <span class="review-budget-label">${icon('clock')} Quỹ thời gian ôn tập:</span>
        <div class="review-budget-buttons">
          <button type="button" class="review-budget-btn ${budget===15?'active':''}" data-review-budget="15">15 phút (${budget===15?'Đang chọn: ':''}5–8 mục)</button>
          <button type="button" class="review-budget-btn ${budget===30?'active':''}" data-review-budget="30">30 phút (${budget===30?'Đang chọn: ':''}10–15 mục)</button>
          <button type="button" class="review-budget-btn ${budget===60?'active':''}" data-review-budget="60">60 phút (${budget===60?'Đang chọn: ':''}20–30 mục)</button>
        </div>
        <div style="margin-left:auto;display:flex;gap:10px;flex-wrap:wrap">
          ${dueCards.length?`<a href="#cards?id=due" class="btn btn-primary">${icon('play')}Ôn ${Math.min(dueCards.length,cardLimit)} thẻ ngay</a>`:''}
          ${mistakes.length?`<a href="#quiz?id=review" class="btn btn-secondary">${icon('refresh')}Luyện lại ${mistakes.length} câu sai</a>`:''}
          <a href="#exam-review-run?filter=wrong" class="btn btn-secondary">${icon('clock')}Sổ câu sai đề thi</a>
        </div>
      </div>

      <!-- 3 Streams Category Tabs -->
      <div class="review-stream-tabs" role="tablist">
        <button type="button" class="review-stream-tab ${activeTab==='all'?'active':''}" data-review-tab="all" role="tab" aria-selected="${activeTab==='all'}">
          Tất cả mục cần ôn (${totalReviewCount})
        </button>
        <button type="button" class="review-stream-tab ${activeTab==='cards'?'active':''}" data-review-tab="cards" role="tab" aria-selected="${activeTab==='cards'}">
          Thẻ từ đến hạn (${dueCards.length})
        </button>
        <button type="button" class="review-stream-tab ${activeTab==='mistakes'?'active':''}" data-review-tab="mistakes" role="tab" aria-selected="${activeTab==='mistakes'}">
          Câu hỏi cần ôn (${mistakes.length})
        </button>
        <button type="button" class="review-stream-tab ${activeTab==='lessons'?'active':''}" data-review-tab="lessons" role="tab" aria-selected="${activeTab==='lessons'}">
          Bài chưa chắc (${flaggedLessons.length})
        </button>
      </div>

      <!-- Review Stream Content -->
      <div class="review-stream-grid" id="review-stream-grid">
        ${renderStreamList(dueCards,mistakes,flaggedLessons,activeTab,cardLimit)}
      </div>
    </div>`;
  }

  function renderStreamList(dueCards,mistakes,flaggedLessons,tab,limit){
    const items=[];
    const state=getState();

    if(tab==='all'||tab==='cards'){
      for(const c of dueCards.slice(0,limit)){
        items.push({
          type:'card',
          id:c.id,
          title:`${c.front} — ${c.back}`,
          subtitle:`Thẻ từ vựng · ${c.setTitle}`,
          desc:c.example||'Từ vựng đối chiếu từ tài liệu gốc.',
          sourceId:c.sourceId,
          page:c.page,
          userNote:state.cards[c.id]?.userNote||'',
          url:`#cards?id=${encodeURIComponent(c.setId)}`,
          actionLabel:'Lật thẻ ôn'
        });
      }
    }

    if(tab==='all'||tab==='mistakes'){
      for(const q of mistakes.slice(0,limit)){
        const meta=state.mistakeMeta?.[q.id]||{};
        const reasonText=meta.reason?` [${MISTAKE_REASONS[meta.reason]||meta.reason}]`:'';
        items.push({
          type:'mistake',
          id:q.id,
          title:q.prompt,
          subtitle:`Câu sai gần đây${reasonText} · ${q.setTitle}`,
          desc:`Giải thích: ${q.explanation}`,
          sourceId:q.sourceId,
          page:q.page,
          url:`#quiz?id=${encodeURIComponent(q.setId)}`,
          actionLabel:'Luyện lại chủ đề'
        });
      }
    }

    if(tab==='all'||tab==='lessons'){
      for(const f of flaggedLessons.slice(0,limit)){
        items.push({
          type:'lesson',
          id:f.id,
          title:cleanTitle(f.name),
          subtitle:`Bài học đã đánh dấu cần xem lại · ${f.path||''}`,
          desc:'Mở lại phòng học để ôn lý thuyết, xem lại ghi chú và làm tự kiểm tra.',
          sourceId:f.id,
          page:1,
          url:`#study?course=${encodeURIComponent(f.course)}&folder=${encodeURIComponent(f.parent)}&file=${encodeURIComponent(f.id)}`,
          actionLabel:'Mở phòng học'
        });
      }
    }

    if(!items.length){
      return `
      <div class="empty">
        ${icon('check')}
        <h3>Hộp ôn tập đang trống!</h3>
        <p>Tuyệt vời! Bạn không có thẻ từ quá hạn hay câu sai nào cần ôn vào lúc này. Tiếp tục học bài mới nhé.</p>
        <a href="#courses" class="btn btn-primary">Chọn bài học tiếp theo</a>
      </div>`;
    }

    return items.map(item=>`
    <article class="review-item-card" data-review-item-id="${esc(item.id)}" data-review-item-type="${item.type}">
      <div class="review-item-top">
        <span class="review-type-pill ${item.type}">
          ${item.type==='card'?'Thẻ từ đến hạn':item.type==='mistake'?'Câu hỏi sai':'Bài chưa chắc'}
        </span>
        <span style="color:var(--muted)">${esc(item.subtitle)}</span>
      </div>

      <h3 style="margin:0;font-size:14px;color:var(--ink)">${esc(item.title)}</h3>
      <p style="margin:0;font-size:12px;color:#555;line-height:1.5">${esc(item.desc)}</p>

      ${item.type==='card'?`
      <div class="review-card-personal-note">
        <label style="font-size:10px;font-weight:600;display:block;margin-bottom:4px;color:var(--muted)">Ghi nhớ cá nhân (tách biệt với nghĩa chuẩn):</label>
        <input type="text" class="card-personal-note-input" data-card-note="${esc(item.id)}" value="${esc(item.userNote)}" placeholder="Ví dụ: mẹo nhớ từ, liên tưởng hình ảnh…">
      </div>
      <div class="review-srs-bar">
        <button type="button" class="btn btn-secondary" data-review-rate="again" data-card-id="${esc(item.id)}">${icon('refresh')}Quên (10p)</button>
        <button type="button" class="btn btn-secondary" data-review-rate="hard" data-card-id="${esc(item.id)}">Khó (1 ngày)</button>
        <button type="button" class="btn btn-primary" data-review-rate="good" data-card-id="${esc(item.id)}">${icon('check')}Nhớ (ôn sau)</button>
        <button type="button" class="btn btn-soft" data-review-rate="easy" data-card-id="${esc(item.id)}">Dễ (giãn lịch)</button>
      </div>`:''}

      ${item.type==='mistake'?`
      <div style="display:flex;gap:10px;align-items:center;margin-top:6px">
        <a href="${item.url}" class="btn btn-soft">${icon('arrow')}${item.actionLabel}</a>
        <button type="button" class="btn btn-secondary" data-mistake-mastered="${esc(item.id)}">${icon('check')}Đã nắm vững</button>
        ${item.sourceId?`<a href="${fileURL(item.sourceId)}" target="_blank" rel="noopener noreferrer" class="text-button">${icon('note')}Đối chiếu nguồn</a>`:''}
      </div>`:''}

      ${item.type==='lesson'?`
      <div style="display:flex;gap:10px;align-items:center;margin-top:6px">
        <a href="${item.url}" class="btn btn-primary">${icon('arrow')}${item.actionLabel}</a>
        <button type="button" class="btn btn-secondary" data-lesson-unflag="${esc(item.id)}">${icon('check')}Đã hiểu chắc</button>
      </div>`:''}
    </article>`).join('');
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b)return;

    if(b.hasAttribute('data-review-budget')){
      const budget=Number(b.dataset.reviewBudget);
      const state=getState();
      state.timeBudget=budget;
      saveLearning();
      document.querySelectorAll('[data-review-budget]').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.reviewBudget)===budget));
      toast(`Đã áp dụng quỹ thời gian ${budget} phút.`);
      location.hash=`review?tab=${activeTab}`;
    }else if(b.hasAttribute('data-review-tab')){
      activeTab=b.dataset.reviewTab;
      document.querySelectorAll('[data-review-tab]').forEach(btn=>{
        const isActive=btn.dataset.reviewTab===activeTab;
        btn.classList.toggle('active',isActive);
        btn.setAttribute('aria-selected',String(isActive));
      });
      const grid=$('#review-stream-grid');
      if(grid){
        const budget=getState().timeBudget||30;
        const limit=budget===15?5:budget===30?10:20;
        grid.innerHTML=renderStreamList(getDueCards(),getMistakeQuestions(),getFlaggedLessons(),activeTab,limit);
      }
    }else if(b.hasAttribute('data-review-rate')){
      const rating=b.dataset.reviewRate;
      const cardId=b.dataset.cardId;
      const state=getState();
      const current=state.cards[cardId];
      const streak=rating==='again'?0:Math.min(10,(current?.streak||0)+1);
      const days=rating==='again'?0:rating==='hard'?1:rating==='easy'?[4,10,21,45][Math.min(streak-1,3)]:[1,3,7,14,30][Math.min(streak-1,4)];
      state.cards[cardId]={
        streak,
        due:Date.now()+(rating==='again'?600000:days*86400000),
        rating,
        lastReviewed:new Date().toISOString(),
        reviews:(current?.reviews||0)+1,
        userNote:current?.userNote||''
      };
      saveLearning();
      toast(rating==='again'?'Đã hẹn gặp lại sau 10 phút.':`Đã ghi nhớ. Lịch ôn sau ${days} ngày.`);
      const cardEl=b.closest('.review-item-card');
      if(cardEl){
        cardEl.style.opacity='0.5';
        cardEl.style.pointerEvents='none';
      }
    }else if(b.hasAttribute('data-mistake-mastered')){
      const qid=b.dataset.mistakeMastered;
      const state=getState();
      state.wrong=state.wrong.filter(id=>id!==qid);
      saveLearning();
      toast('Đã đánh dấu nắm vững. Câu này đã được bỏ khỏi danh sách sai.');
      const cardEl=b.closest('.review-item-card');
      if(cardEl)cardEl.remove();
    }else if(b.hasAttribute('data-lesson-unflag')){
      const lid=b.dataset.lessonUnflag;
      const state=getState();
      state.flaggedLessons=state.flaggedLessons.filter(id=>id!==lid);
      saveLearning();
      toast('Đã đánh dấu đã hiểu bài này.');
      const cardEl=b.closest('.review-item-card');
      if(cardEl)cardEl.remove();
    }
  });

  document.addEventListener('input',e=>{
    if(e.target.hasAttribute('data-card-note')){
      const cardId=e.target.dataset.cardNote;
      const state=getState();
      state.cards[cardId]||={due:Date.now()};
      state.cards[cardId].userNote=e.target.value;
      saveLearning();
    }
  });

  return {render};
}
