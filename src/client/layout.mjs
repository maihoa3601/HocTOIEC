const KEY='toeic-studio-layout-v1';
export function createLayout({icon}){
  const $=selector=>document.querySelector(selector),root=document.documentElement;
  const mobile=matchMedia('(max-width:760px)');
  let preferences={sidebar:false,outline:false,study:false};
  try{const stored=JSON.parse(localStorage.getItem(KEY)||'{}');for(const key of Object.keys(preferences))preferences[key]=stored[key]===true}catch{}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(preferences))}catch{}};
  function sync(){
    for(const key of Object.keys(preferences))root.classList.toggle(key+'-collapsed',preferences[key]);
    const expanded=mobile.matches?$('#sidebar').classList.contains('open'):!preferences.sidebar;
    const menu=$('#menu-toggle'),label=mobile.matches?(expanded?'Đóng menu':'Mở menu'):(expanded?'Thu gọn thanh điều hướng':'Mở rộng thanh điều hướng');
    menu.setAttribute('aria-expanded',String(expanded));menu.setAttribute('aria-label',label);menu.title=label;
    menu.innerHTML=icon(mobile.matches?'menu':expanded?'back':'menu');
    $('#sidebar').inert=mobile.matches&&!expanded;
    for(const [name,id,hideLabel,showLabel]of [['outline','course-outline','Thu gọn mục lục','Mở mục lục'],['study','study-side','Ẩn bảng luyện tập & ghi chú','Mở bảng luyện tập & ghi chú']]){
      const panel=$('#'+id);if(panel)panel.hidden=preferences[name];
      document.querySelectorAll(`[data-layout-panel="${name}"]`).forEach(button=>{const label=preferences[name]?showLabel:hideLabel;button.innerHTML=icon(preferences[name]?'menu':'back')+'<span>'+label+'</span>';button.setAttribute('aria-expanded',String(!preferences[name]));button.title=label;});
    }
  }
  function closeMobile(returnFocus=false){const wasOpen=$('#sidebar').classList.contains('open');$('#sidebar').classList.remove('open');$('#scrim').classList.remove('open');sync();if(returnFocus&&wasOpen)$('#menu-toggle').focus()}
  $('#menu-toggle').onclick=()=>{if(mobile.matches){const open=$('#sidebar').classList.toggle('open');$('#scrim').classList.toggle('open',open)}else{preferences.sidebar=!preferences.sidebar;save()}sync()};
  $('#scrim').onclick=()=>closeMobile(true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobile.matches&&$('#sidebar').classList.contains('open')){event.preventDefault();closeMobile(true)}});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-layout-panel]');if(button){const name=button.dataset.layoutPanel;if(!Object.hasOwn(preferences,name))return;preferences[name]=!preferences[name];save();sync()}});
  mobile.addEventListener('change',()=>closeMobile());
  sync();
  return {sync,closeMobile};
}
