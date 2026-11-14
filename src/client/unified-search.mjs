import {searchBankAndCatalog} from './learning-core.mjs';
import {normalize} from './core.mjs';

export function createUnifiedSearch(ctx){
  const {bank,getCourses,getNodes,getState,getProgress,esc,icon,toast}=ctx;
  const $=s=>document.querySelector(s);
  let dialog=$('#search-dialog'),currentQuery='',currentFilter='all',selectedIdx=-1;

  function ensureDialog(){
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='search-dialog';
    dialog.className='search-modal-dialog';
    dialog.setAttribute('aria-label','Tìm kiếm toàn diện TOEIC Studio');
    document.body.append(dialog);
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('click',e=>{
      if(e.target===dialog){
        const r=dialog.getBoundingClientRect();
        if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();
      }
    });
    return dialog;
  }

  function highlight(text,q){
    if(!q||!text)return esc(text||'');
    const str=String(text);
    const nStr=normalize(str);
    const nQ=normalize(q);
    const idx=nStr.indexOf(nQ);
    if(idx<0)return esc(str);
    const before=str.slice(0,idx);
    const matched=str.slice(idx,idx+q.length);
    const after=str.slice(idx+q.length);
    return `${esc(before)}<mark>${esc(matched)}</mark>${esc(after)}`;
  }

  function getResults(){
    if(!currentQuery.trim())return [];
    const state=getState?.()||{};
    const progress=getProgress?.()||{notes:{}};
    return searchBankAndCatalog({
      query:currentQuery,
      bank:typeof bank==='function'?bank():bank,
      courses:getCourses?.()||[],
      nodes:getNodes?.()||[],
      notes:progress.notes||{},
      noteMeta:state.noteMeta||{},
      filter:currentFilter
    });
  }

  function drawResults(){
    const listEl=$('#unified-search-results');
    if(!listEl)return;
    const results=getResults();
    if(!currentQuery.trim()){
      listEl.innerHTML=`<div class="search-empty-prompt">${icon('search')}<h3>Tìm kiếm bài giảng, tài liệu & ghi chú</h3><p>Nhập tên bài, quy tắc ngữ pháp (to be, thì, từ loại…), từ vựng tiếng Anh hoặc ghi chú cá nhân.</p><div class="search-suggestions"><span>Gợi ý:</span><button type="button" data-search-suggest="to be">to be</button><button type="button" data-search-suggest="hiện tại đơn">hiện tại đơn</button><button type="button" data-search-suggest="who what">who what</button><button type="button" data-search-suggest="từ vựng">từ vựng</button></div></div>`;
      return;
    }
    if(!results.length){
      listEl.innerHTML=`<div class="search-no-results">${icon('close')}<h3>Không tìm thấy kết quả phù hợp</h3><p>Thử tìm từ ngắn hơn hoặc chọn thẻ “Tất cả”. Lưu ý các tài liệu Drive chưa chuyển đổi chỉ tìm theo tên tệp.</p></div>`;
      return;
    }
    listEl.innerHTML=`<div class="search-result-stats"><span>${results.length} kết quả phù hợp</span><small>Hỗ trợ tiếng Việt có/không dấu</small></div><div class="search-items-list" role="listbox">${results.map((r,i)=>`<a href="${r.url}" class="search-item ${i===selectedIdx?'is-selected':''}" role="option" aria-selected="${i===selectedIdx}" data-search-index="${i}"><div class="search-item-header"><span class="search-item-badge ${r.category}">${esc(r.badge)}</span><span class="search-item-scope">${esc(r.scopeNote)}</span></div><strong class="search-item-title">${highlight(r.title,currentQuery)}</strong><p class="search-item-snippet">${highlight(r.snippet,currentQuery)}</p><small class="search-item-sub">${esc(r.subtitle)}</small></a>`).join('')}</div>`;
  }

  function open(initialQuery=''){
    ensureDialog();
    currentQuery=initialQuery;
    selectedIdx=-1;
    dialog.innerHTML=`<div class="search-dialog-inner"><div class="search-input-bar"><span class="search-bar-icon">${icon('search')}</span><input type="search" id="unified-search-input" placeholder="Tìm theo tên bài, quy tắc, từ vựng, ghi chú… (nhấn Esc để đóng)" value="${esc(currentQuery)}" autocomplete="off" spellcheck="false"><button type="button" class="search-clear-btn" id="unified-search-clear" aria-label="Xóa nội dung tìm kiếm" ${currentQuery?'':'hidden'}>${icon('close')}</button><kbd class="search-kbd-esc">ESC</kbd></div><div class="search-filter-chips" role="tablist" aria-label="Phạm vi tìm kiếm">${[['all','Tất cả'],['compiled','Bài học biên soạn'],['vocab','Từ vựng'],['courses','Khóa học'],['lessons','Học liệu Drive'],['notes','Ghi chú cá nhân']].map(([k,label])=>`<button type="button" class="search-chip ${currentFilter===k?'active':''}" data-search-filter="${k}" role="tab" aria-selected="${currentFilter===k}">${esc(label)}</button>`).join('')}</div><div id="unified-search-results" class="search-results-area" aria-live="polite"></div><div class="search-dialog-footer"><span class="search-shortcut-hint">↑↓ Di chuyển · ↵ Mở · Esc Đóng</span><span class="search-scope-notice">Phần chưa trích xuất tìm theo metadata</span></div></div>`;
    if(!dialog.open)dialog.showModal();
    const input=$('#unified-search-input');
    if(input){
      input.focus();
      input.select();
    }
    drawResults();
  }

  function close(){
    if(dialog&&dialog.open){
      dialog.close();
      dialog.innerHTML='';
    }
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a');
    if(!b)return;
    if(b.id==='unified-search-clear'){
      currentQuery='';
      const input=$('#unified-search-input');
      if(input){input.value='';input.focus();}
      b.hidden=true;
      drawResults();
    }else if(b.hasAttribute('data-search-filter')){
      currentFilter=b.dataset.searchFilter;
      document.querySelectorAll('[data-search-filter]').forEach(el=>{
        const act=el.dataset.searchFilter===currentFilter;
        el.classList.toggle('active',act);
        el.setAttribute('aria-selected',String(act));
      });
      drawResults();
    }else if(b.hasAttribute('data-search-suggest')){
      currentQuery=b.dataset.searchSuggest;
      const input=$('#unified-search-input');
      if(input){input.value=currentQuery;input.focus();}
      const clearBtn=$('#unified-search-clear');
      if(clearBtn)clearBtn.hidden=false;
      drawResults();
    }else if(b.closest('.search-items-list a')){
      close();
    }
  });

  document.addEventListener('input',e=>{
    if(e.target.id==='unified-search-input'){
      currentQuery=e.target.value;
      selectedIdx=-1;
      const clearBtn=$('#unified-search-clear');
      if(clearBtn)clearBtn.hidden=!currentQuery;
      drawResults();
    }
  });

  document.addEventListener('keydown',e=>{
    if(!dialog||!dialog.open)return;
    if(e.key==='Escape'){
      e.preventDefault();
      close();
    }else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      const items=dialog.querySelectorAll('.search-item');
      if(!items.length)return;
      e.preventDefault();
      if(e.key==='ArrowDown')selectedIdx=selectedIdx<items.length-1?selectedIdx+1:0;
      else selectedIdx=selectedIdx>0?selectedIdx-1:items.length-1;
      items.forEach((it,i)=>it.classList.toggle('is-selected',i===selectedIdx));
      items[selectedIdx]?.scrollIntoView({block:'nearest'});
    }else if(e.key==='Enter'&&selectedIdx>=0){
      const items=dialog.querySelectorAll('.search-item');
      if(items[selectedIdx]){
        e.preventDefault();
        items[selectedIdx].click();
      }
    }
  });

  return {open,close};
}
