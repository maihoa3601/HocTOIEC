import {computeEvidenceMetrics,MISTAKE_REASONS} from './learning-core.mjs';
import {cleanTitle} from './core.mjs';

export function createEvidenceProgress(ctx){
  const {bank,courses,getState,progress,saveLearning,persist,esc,icon,fmt,heading,toast}=ctx;
  const $=s=>document.querySelector(s);

  function render(){
    const state=getState();
    const p=progress();
    const metrics=computeEvidenceMetrics(state,bank,p);
    const reminder=state.reminderConfig||{enabled:false,time:'20:00'};

    // Mistakes breakdown by reason
    const wrongList=state.wrong||[];
    const meta=state.mistakeMeta||{};
    const reasonCounts={};
    for(const [k,lbl]of Object.entries(MISTAKE_REASONS)){
      reasonCounts[k]={label:lbl,count:0};
    }
    let untaggedCount=0;
    for(const qid of wrongList){
      const m=meta[qid];
      if(m?.reason&&reasonCounts[m.reason])reasonCounts[m.reason].count++;
      else untaggedCount++;
    }

    // Active courses progress
    const activeCourses=courses.filter(c=>c.videos.some(v=>p.completed[v.id])).map(c=>{
      const done=c.videos.filter(v=>p.completed[v.id]).length;
      const pct=c.videos.length?Math.round(100*done/c.videos.length):0;
      return {c,done,total:c.videos.length,pct};
    });

    return `
    <div class="evidence-progress-shell">
      ${heading('Tiến bộ có căn cứ thực tế','Đo lường bằng thao tác và bài làm thật; phân biệt rõ bài đã học, tự đánh giá và kết quả kiểm tra.')}

      <!-- 4 Distinct Evidence Metrics (Section 10) -->
      <section class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
        <div class="stat">
          <div class="stat-icon" style="background:#edf4e9;color:#5a8443">${icon('check')}</div>
          <div>
            <strong>${fmt(metrics.completedVideos)}<span class="stat-unit">bài</span></strong>
            <small>Hoạt động đã hoàn thành</small>
          </div>
        </div>

        <div class="stat">
          <div class="stat-icon" style="background:#eeebfc;color:#7460d7">${icon('target')}</div>
          <div>
            <strong>${metrics.unassistedPct!==null?metrics.unassistedPct+'%':'—'}</strong>
            <small>Kiểm tra lần đầu (${metrics.unassistedCorrect}/${metrics.unassistedTotal})</small>
          </div>
        </div>

        <div class="stat">
          <div class="stat-icon" style="background:#fff8e1;color:#b26a00">${icon('spark')}</div>
          <div>
            <strong>${metrics.assistedPct!==null?metrics.assistedPct+'%':'—'}</strong>
            <small>Đúng sau gợi ý (${metrics.assistedCorrect}/${metrics.assistedTotal})</small>
          </div>
        </div>

        <div class="stat">
          <div class="stat-icon" style="background:#f0ecfc;color:#5d49bf">${icon('book')}</div>
          <div>
            <strong>${fmt(metrics.selfUnderstoodCount)}<span class="stat-unit">bài</span></strong>
            <small>Tự báo cáo “Đã hiểu bài”</small>
          </div>
        </div>
      </section>

      <div class="progress-layout">
        <!-- Left: Course & Chapter Progress -->
        <section class="panel">
          <div class="section-title">
            <h2>Tiến độ theo khóa học</h2>
            <a href="#courses" class="text-button">Xem tất cả khóa ${icon('arrow')}</a>
          </div>
          ${activeCourses.length?`
          <div style="display:grid;gap:14px">
            ${activeCourses.map(({c,done,total,pct})=>`
            <div class="progress-course">
              <div>
                <a href="#course?id=${encodeURIComponent(c.id)}" style="font-weight:600;color:var(--ink)">${esc(c.title)}</a>
                <small>${done}/${total} video (${pct}%)</small>
              </div>
              <div class="progress-track" style="margin-top:6px">
                <span style="width:${pct}%"></span>
              </div>
            </div>`).join('')}
          </div>`:`
          <p class="fine-print">Bạn chưa có khóa học nào đang bắt đầu. Hãy chọn một khóa trong Thư viện để theo dõi tiến độ tại đây.</p>
          <a href="#courses" class="btn btn-primary" style="margin-top:12px">Khám phá khóa học</a>`}
        </section>

        <!-- Right: Frequent Mistake Patterns -->
        <section class="panel">
          <div class="section-title">
            <h2>Phân loại lỗi sai cần lưu ý</h2>
            <a href="#review?tab=mistakes" class="text-button">Mở hộp ôn tập ${icon('arrow')}</a>
          </div>
          ${wrongList.length?`
          <p class="fine-print" style="margin-bottom:14px">Bạn có <strong>${wrongList.length} câu</strong> cần xem lại. Phân loại theo lý do:</p>
          <div style="display:grid;gap:8px">
            ${Object.values(reasonCounts).map(r=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg);border-radius:8px;font-size:12px">
              <span>${esc(r.label)}</span>
              <strong>${r.count} câu</strong>
            </div>`).join('')}
            ${untaggedCount?`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg);border-radius:8px;font-size:12px;color:var(--muted)">
              <span>Chưa gắn lý do</span>
              <strong>${untaggedCount} câu</strong>
            </div>`:''}
          </div>`:`
          <div class="empty" style="padding:25px 15px">
            ${icon('check')}
            <h4 style="margin:6px 0 2px">Chưa có câu sai tồn đọng</h4>
            <p style="font-size:11px">Làm bài luyện tập hoặc đề thi, các câu trả lời sai sẽ được ghi nhận và phân tích ở đây.</p>
          </div>`}
        </section>
      </div>

      <!-- Study Reminder Settings (Section 10) -->
      <section class="panel section-gap">
        <div class="section-title">
          <div>
            <h2>Thiết lập nhắc nhở học tập</h2>
            <p>Hệ thống chỉ nhắc khi bạn chủ động bật; không tự ý gửi thông báo làm phiền.</p>
          </div>
        </div>
        <form id="evidence-reminder-form" style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600">
            <input type="checkbox" id="reminder-enabled-input" ${reminder.enabled?'checked':''}>
            Bật nhắc học hằng ngày
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:12px">
            Thời gian nhắc:
            <input type="time" id="reminder-time-input" value="${esc(reminder.time)}" ${reminder.enabled?'':'disabled'} style="border:1px solid var(--line);border-radius:6px;padding:4px 8px">
          </label>
          <button type="submit" class="btn btn-secondary">${icon('check')}Lưu cài đặt nhắc học</button>
        </form>
      </section>

      <!-- Data Export & Import -->
      <section class="panel section-gap">
        <h3>Dữ liệu học tập và bản sao tiến độ</h3>
        <p class="fine-print">Toàn bộ lịch sử bài làm, ghi chú và tiến độ tự học được lưu an toàn trên trình duyệt này. Hãy xuất bản sao để giữ dữ liệu hoặc chuyển sang máy khác.</p>
        <div class="data-actions">
          <button type="button" class="btn btn-secondary" data-export>${icon('download')}Xuất toàn bộ tiến độ JSON</button>
          <a href="#account" class="btn btn-secondary">${icon('note')}Đồng bộ tài khoản & lịch sử chi tiết</a>
        </div>
      </section>
    </div>`;
  }

  document.addEventListener('change',e=>{
    if(e.target.id==='reminder-enabled-input'){
      const timeInput=$('#reminder-time-input');
      if(timeInput)timeInput.disabled=!e.target.checked;
    }
  });

  document.addEventListener('submit',e=>{
    if(e.target.id==='evidence-reminder-form'){
      e.preventDefault();
      const state=getState();
      const enabled=$('#reminder-enabled-input')?.checked||false;
      const time=$('#reminder-time-input')?.value||'20:00';
      state.reminderConfig={enabled,time};
      saveLearning();
      toast(enabled?`Đã bật nhắc học vào lúc ${time}.`:'Đã tắt nhắc học hằng ngày.');
    }
  });

  return {render};
}
