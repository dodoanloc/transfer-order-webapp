const BRANCHES=['Agribank CN Thọ Xuân','Agribank CN Thanh Hoá','PGD Xuân Lai - Agribank CN Thọ Xuân'];
const ROLE_LABEL={escort:'Người áp tải',driver:'Lái xe',guard:'Bảo vệ',requester:'Người đề nghị',receiver:'Người nhập'};
const STORE_PEOPLE='transferOrder.people.v1';
const STORE_ORDER='transferOrder.order.v2';
const OLD_STORE_ORDER='transferOrder.order.v1';
const AUTH_STORE='transferOrder.auth.v1';
try{localStorage.removeItem(STORE_ORDER);localStorage.removeItem(OLD_STORE_ORDER);}catch(_){}
let currentAuth=null;
let currentUser=null;
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
const viDate=(iso)=>{if(!iso)return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`};
const longDate=(iso)=>{const [y,m,d]=(iso||today()).split('-'); return `ngày ${Number(d)} tháng ${Number(m)} năm ${y}`};
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const escPreserveSpaces=s=>esc(s).replace(/ /g,'&nbsp;');
function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())}
function rawNumber(v){return String(v||'').replace(/\D/g,'');}
function formatThousands(v){const n=rawNumber(v); return n.replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function viNumberWords(input){
  let n=rawNumber(input); if(!n) return '';
  n=n.replace(/^0+/,'')||'0'; if(n==='0') return 'Không';
  const digits=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  function readTriple(num, full){
    num=String(num).padStart(3,'0'); const h=+num[0], t=+num[1], u=+num[2]; const out=[];
    if(h>0 || full){ out.push(digits[h], 'trăm'); }
    if(t>1){ out.push(digits[t], 'mươi'); if(u===1) out.push('mốt'); else if(u===5) out.push('lăm'); else if(u>0) out.push(digits[u]); }
    else if(t===1){ out.push('mười'); if(u===5) out.push('lăm'); else if(u>0) out.push(digits[u]); }
    else if(u>0){ if(h>0 || full) out.push('linh'); out.push(u===5 && (h>0||full)?'năm':digits[u]); }
    return out.join(' ');
  }
  const units=['','nghìn','triệu','tỷ','nghìn tỷ','triệu tỷ']; const groups=[];
  while(n){groups.unshift(n.slice(-3)); n=n.slice(0,-3);} const parts=[];
  groups.forEach((g,i)=>{ if(+g===0) return; const full=i>0 && +g<100; const w=readTriple(g, full); const unit=units[groups.length-1-i]||''; parts.push([w,unit].filter(Boolean).join(' ')); });
  const res=parts.join(' ').replace(/\s+/g,' ').trim(); return res.charAt(0).toUpperCase()+res.slice(1);
}

function basisLine(fromBranch, toBranch, goodsState, docDateText) {
  const hasGoods = (key) => goodsState[key]?.selected;
  const hasCash = hasGoods('cash');
  const hasFx = hasGoods('fx');
  const hasAcqt = hasGoods('acqt');
  
  // Case 7: From PGD Xuân Lai -> no basis line
  if (fromBranch === 'PGD Xuân Lai - Agribank CN Thọ Xuân') {
    return '';
  }
  
  // Case 4: From Thọ Xuân to Thanh Hóa
  if (fromBranch === 'Agribank CN Thọ Xuân' && toBranch === 'Agribank CN Thanh Hoá') {
    return `Căn cứ Giấy đề nghị nộp quỹ số          /NHNo.TX-KTNQ ngày ${docDateText}.`;
  }
  
  // Case 5 & 6: From Thọ Xuân to PGD Xuân Lai
  if (fromBranch === 'Agribank CN Thọ Xuân' && toBranch === 'PGD Xuân Lai - Agribank CN Thọ Xuân') {
    if (hasCash && hasAcqt) {
      return `Căn cứ Giấy đề nghị tiếp quỹ, xuất ACQT của Phòng giao dịch Xuân Lai ngày ${docDateText}.`;
    }
    if (hasCash) {
      return `Căn cứ Giấy đề nghị tiếp quỹ của Phòng giao dịch Xuân Lai ngày ${docDateText}.`;
    }
  }
  
  // Case 1, 2, 3: From Thanh Hóa
  if (fromBranch === 'Agribank CN Thanh Hoá') {
    let types = [];
    if (hasCash) types.push('tiền mặt');
    if (hasFx) types.push('ngoại tệ mặt');
    let typeStr = types.join(', ');
    if (hasAcqt && types.length > 0) typeStr += ', cấp ACQT';
    else if (hasAcqt) typeStr = 'cấp ACQT';
    
    if (!typeStr) typeStr = 'tiền mặt'; // fallback
    
    return `Căn cứ văn bản phê duyệt tiếp quỹ ${typeStr} số      /NHNo.TH-KTNQ ngày ${docDateText} của Giám đốc Agribank CN Thanh Hóa.`;
  }
  
  // Default fallback
  return `Căn cứ văn bản phê duyệt tiếp quỹ tiền mặt số      /NHNo.TH-KTNQ ngày ${docDateText} của Giám đốc Agribank CN Thanh Hóa.`;
}

const LETTERS=['a','b','c','d','đ','e','g','h'];
const GOODS_DEF=[
  {key:'cash',title:'Tiền mặt',mode:'details',details:[{key:'vnd',label:'Tiền mặt',unit:'VNĐ'}]},
  {key:'fx',title:'Ngoại tệ tiền mặt',mode:'details',details:[{key:'usd',label:'USD',unit:'USD'},{key:'eur',label:'EUR',unit:'EUR'}]},
  {key:'acqt',title:'Ấn chỉ quan trọng',mode:'details',details:[{key:'stk',label:'Sổ tiết kiệm',unit:'sổ'},{key:'stkTerm',label:'Sổ tiết kiệm có kỳ hạn',unit:'sổ'},{key:'cheque',label:'Séc',unit:'tờ'},{key:'guarantee',label:'Thư bảo lãnh',unit:'tờ'}]},
  {key:'collateral',title:'TSBĐ, TSGH',mode:'manual',placeholder:'Nhập mô tả tài sản bảo đảm/tài sản giữ hộ'},
  {key:'other',title:'Tài sản khác',mode:'manual',placeholder:'Nhập mô tả tài sản khác'}
];
const defaultGoods=()=>({cash:{selected:false,items:{vnd:{selected:false,qty:''}}},fx:{selected:true,items:{usd:{selected:true,qty:'5000'},eur:{selected:false,qty:''}}},acqt:{selected:true,items:{stk:{selected:false,qty:''},stkTerm:{selected:true,qty:'2000'},cheque:{selected:false,qty:''},guarantee:{selected:false,qty:''}}},collateral:{selected:false,text:''},other:{selected:false,text:''}});
const DEFAULT_PEOPLE = [
{name:'Đặng Thị Hảo',gender:'Bà',role:'escort',title:'Trưởng phòng Tổng hợp',cccd:'038176036372',issueDate:'14/08/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Đỗ Tuấn Minh',gender:'Ông',role:'escort',title:'Cán bộ phòng Khách hàng',cccd:'038099012452',issueDate:'24/01/2024',issuePlace:'Bộ Công An'},
{name:'Lê Thị Uyên',gender:'Bà',role:'escort',title:'Cán bộ phòng Khách hàng',cccd:'038197004084',issueDate:'28/09/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Đỗ Doãn Lộc',gender:'Ông',role:'escort',title:'Trưởng phòng KTNQ',cccd:'038091054258',issueDate:'11/08/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Đỗ Văn Nam',gender:'Ông',role:'escort',title:'Phó Giám đốc',cccd:'038067030977',issueDate:'14/09/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Nguyễn Thị Hòa',gender:'Bà',role:'escort',title:'Cán bộ phòng KTNQ',cccd:'038180032817',issueDate:'11/08/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Phạm Văn Khoa',gender:'Ông',role:'driver',title:'Cán bộ phòng Tổng hợp',cccd:'038082048063',issueDate:'15/12/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Nguyễn Chí Thanh',gender:'Ông',role:'driver',title:'Phó Giám đốc',cccd:'035076003514',issueDate:'04/12/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Vũ Văn Tỉnh',gender:'Ông',role:'guard',title:'Bảo vệ',cccd:'038067020788',issueDate:'10/08/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Đỗ Xuân Sơn',gender:'Ông',role:'guard',title:'Bảo vệ',cccd:'038068034247',issueDate:'19/08/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Lê Doãn Thanh',gender:'Ông',role:'guard',title:'Bảo vệ',cccd:'038066003801',issueDate:'10/08/2021',issuePlace:'Cục CSQLHC về TTXH'},
{name:'Lê Thanh Xuân',gender:'Ông',role:'requester',title:'Cán bộ phòng KTNQ',cccd:'',issueDate:'',issuePlace:'',user:'THXLXUAN'},
{name:'Lê Thanh Xuân',gender:'Ông',role:'receiver',title:'Cán bộ phòng KTNQ',cccd:'',issueDate:'',issuePlace:'',user:'THXLXUAN'}
];
function loadPeople(){
  try {
    const stored = localStorage.getItem(STORE_PEOPLE);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged=parsed.map(p => { const def=DEFAULT_PEOPLE.find(x=>(x.cccd&&x.cccd===p.cccd)||(x.role===p.role&&x.name===p.name))||{}; return {...def,...p, gender: p.gender || def.gender || 'Ông', title: p.title || def.title || '', user: p.user || def.user || ''}; });
        DEFAULT_PEOPLE.forEach(def=>{if(!merged.some(p=>(def.cccd&&p.cccd===def.cccd)||(p.role===def.role&&p.name===def.name))) merged.push({...def,id:uid(),gender:def.gender||'Ông',title:def.title||'',user:def.user||''});});
        return merged;
      }
    }
  } catch(e) {}
  return DEFAULT_PEOPLE.map(p => ({...p, id: uid(), gender: p.gender || 'Ông', title: p.title || '', user: p.user || ''}));
}
let people=loadPeople();
let goodsState={cash:{selected:false,items:{vnd:{selected:false,qty:''}}},fx:{selected:false,items:{usd:{selected:false,qty:''},eur:{selected:false,qty:''}}},acqt:{selected:false,items:{stk:{selected:false,qty:''},stkTerm:{selected:false,qty:''},cheque:{selected:false,qty:''},guarantee:{selected:false,qty:''}}},collateral:{selected:false,text:''},other:{selected:false,text:''}};
function savePeople(){
  try { localStorage.setItem(STORE_PEOPLE, JSON.stringify(people)); } catch(e) {}
}
function optionize(select,items,valueKey='value',labelKey='label'){select.innerHTML=''; items.forEach(it=>{const o=document.createElement('option'); o.value=typeof it==='string'?it:it[valueKey]; o.textContent=typeof it==='string'?it:it[labelKey]; select.appendChild(o);});}
function personOptions(role){return people.filter(p=>p.role===role).map(p=>({value:p.id,label:`${p.name} - ${p.cccd}`}));}
function fillSelects(){optionize($('fromBranch'),BRANCHES); optionize($('toBranch'),BRANCHES); ['escort','driver','guard','requester','receiver'].forEach(role=>{const id=role==='escort'?'escortId':role==='driver'?'driverId':role==='guard'?'guardId':role==='requester'?'requesterId':'receiverId'; const el=$(id); if(el) optionize(el,personOptions(role));});}
function getPerson(id){return people.find(p=>p.id===id)||{};}
function renderGoodsBuilder(){const wrap=$('goodsBuilder'); wrap.innerHTML=`<div class="goods-head"><h3>Loại hàng đặc biệt</h3><div class="goods-note">Chọn 1 hoặc nhiều loại; không chọn sẽ in “Không”</div></div><div class="goods-grid">${GOODS_DEF.map(g=>goodsCardHtml(g)).join('')}</div>`;}
function goodsCardHtml(g){const st=goodsState[g.key]||{}; const active=st.selected?' active':''; let body=''; if(g.mode==='details'){body=g.details.map(d=>{const it=(st.items||{})[d.key]||{}; return `<div class="detail-row"><label class="detail-check"><input type="checkbox" data-goods-detail="${g.key}.${d.key}" ${it.selected?'checked':''}> ${d.label}</label><input type="text" inputmode="numeric" data-goods-qty="${g.key}.${d.key}" value="${esc(formatThousands(it.qty||''))}" placeholder="Số lượng"><span class="unit-pill">${d.unit}</span></div>`;}).join('')+`<div class="money-note">Đơn vị tự hiện theo từng loại chi tiết.</div>`;} else {body=`<div class="manual-area"><textarea data-goods-text="${g.key}" placeholder="${esc(g.placeholder||'Nhập nội dung')}">${esc(st.text||'')}</textarea><div class="money-note">Nếu không chọn mục này, trên lệnh sẽ ghi “${g.title}: Không”.</div></div>`;} return `<div class="goods-card${active}" data-goods-card="${g.key}"><label class="goods-main"><input type="checkbox" data-goods-main="${g.key}" ${st.selected?'checked':''}> ${g.title}</label><div class="goods-body">${body}</div></div>`;}
function readGoodsFromDom(){GOODS_DEF.forEach(g=>{const main=document.querySelector(`[data-goods-main="${g.key}"]`); if(!main)return; goodsState[g.key]=goodsState[g.key]||{}; goodsState[g.key].selected=main.checked; if(g.mode==='manual'){const tx=document.querySelector(`[data-goods-text="${g.key}"]`); goodsState[g.key].text=tx?tx.value:'';} else {goodsState[g.key].items=goodsState[g.key].items||{}; g.details.forEach(d=>{const ck=document.querySelector(`[data-goods-detail="${g.key}.${d.key}"]`); const qt=document.querySelector(`[data-goods-qty="${g.key}.${d.key}"]`); goodsState[g.key].items[d.key]={selected:!!(ck&&ck.checked),qty:qt?rawNumber(qt.value):''};});}});}
function goodsSummaryTitle(){const selected=GOODS_DEF.filter(g=>goodsState[g.key]?.selected).map(g=>g.title); return selected.length?selected.join('; '):'Không';}
function formatQty(q){return formatThousands(q);}
function goodsSections(){return GOODS_DEF.map((g,idx)=>{const st=goodsState[g.key]||{}; const label=g.key==='cash'?'a) Tiền mặt':(g.key==='fx'?'b) Ngoại tệ tiền mặt':(g.key==='acqt'?'c) ACQT':(g.key==='collateral'?'d) TSBĐ, TSGH':(g.key==='other'?'đ) Tài sản khác':g.title)))); if(!st.selected) return {empty:true,lines:[`${label}: Không`]}; if(g.mode==='manual'){const text=(st.text||'').trim(); return {lines:[`${label}: ${text||'Có'}`]};} const lines=[`${label}:`]; let any=false; g.details.forEach(d=>{const it=(st.items||{})[d.key]||{}; if(it.selected){any=true; const qty=formatQty(it.qty); if(g.key==='cash') lines.push(`- Số tiền bằng số: ${qty} ${d.unit}`.replace(':  ',': ')); else if(g.key==='fx') lines.push(`- Loại tiền ${d.label}: ${qty} ${d.unit}`.replace(':  ',': ')); else lines.push(`- ${d.label}: ${qty} ${d.unit}`.replace(':  ',': ')); const words=viNumberWords(it.qty); const wordLabel=g.key==='cash'?'- Số tiền bằng chữ:':'- Bằng chữ:'; lines.push(`${wordLabel} ${words}${words?` ${d.unit}`:''}.`);}}); if(!any) return {empty:true,lines:[`${label}: Không`]}; return {lines};});}
function goodsHtml(){return goodsSections().flatMap(s=>s.lines.map((x,i)=>`<p class="goods-line ${s.empty?'goods-empty':''} ${i===0?'goods-heading':''}">${esc(x)}</p>`)).join('');}
function initOrder(){fillSelects(); goodsState={cash:{selected:false,items:{vnd:{selected:false,qty:''}}},fx:{selected:false,items:{usd:{selected:false,qty:''},eur:{selected:false,qty:''}}},acqt:{selected:false,items:{stk:{selected:false,qty:''},stkTerm:{selected:false,qty:''},cheque:{selected:false,qty:''},guarantee:{selected:false,qty:''}}},collateral:{selected:false,text:''},other:{selected:false,text:''}}; renderGoodsBuilder(); $('fromBranch').value=BRANCHES[1]; $('toBranch').value=BRANCHES[0];  $('vehiclePlate').value='36A-708.79'; $('docNo').value='           /QĐ-NHNo.TX-KTNQ'; $('docDate').value=today(); if(!$('docDate').value){$('docDate').valueAsDate=new Date();} renderOrder();}
function orderData(){readGoodsFromDom(); return {fromBranch:$('fromBranch').value,toBranch:$('toBranch').value,executionDate:`Trong ngày ${viDate($('docDate').value)}.`,goodsState,vehiclePlate:$('vehiclePlate').value,docNo:($('docNo').value.trim()?$('docNo').value:'           /QĐ-NHNo.TX-KTNQ'),docDate:$('docDate').value,escortId:$('escortId').value,driverId:$('driverId').value,guardId:$('guardId').value,requesterId:$('requesterId')?.value||'',receiverId:$('receiverId')?.value||''};}
function personLine(n,p,title){return `${n}. ${p.gender||'Ông'}: ${p.name||'................'} số CCCD: ${p.cccd||'................'} ngày ${p.issueDate||'.../.../....'} nơi cấp: ${p.issuePlace||'................'}. Chức danh: ${title||p.title||'Cán bộ'}.`;}
function cloneData(x){return JSON.parse(JSON.stringify(x||{}));}
function selectedPeopleForOrder(d){return {escort:getPerson(d.escortId),driver:getPerson(d.driverId),guard:getPerson(d.guardId),requester:getPerson(d.requesterId),receiver:getPerson(d.receiverId)};}
function recordSummary(d){const sp=selectedPeopleForOrder(d);return `${d.docNo||''} · ${d.fromBranch||''} → ${d.toBranch||''} · ${sp.escort?.name||''}`;}
function buildPrintRecord(){const d=orderData();return {id:uid(),savedAt:new Date().toISOString(),summary:recordSummary(d),order:cloneData(d),people:selectedPeopleForOrder(d),peopleList:cloneData(people)};}
async function apiPost(path,payload){const resp=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await resp.json().catch(()=>({success:false,detail:'Lỗi phản hồi máy chủ'}));if(!resp.ok||!data.success)throw new Error(data.detail||'Thao tác thất bại');return data;}
async function saveCurrentRecord(){if(!currentAuth)return null;const data=await apiPost('/api/records/save',{auth:currentAuth,record:buildPrintRecord()});return data.id;}
function applyRecord(record,options={}){if(!record||!record.order)return;const {switchToForm=true,scroll=true}=options;const d=record.order;if(Array.isArray(record.peopleList)&&record.peopleList.length){people=record.peopleList;savePeople();}fillSelects();goodsState=cloneData(d.goodsState||defaultGoods());renderGoodsBuilder();$('fromBranch').value=d.fromBranch||BRANCHES[0];$('toBranch').value=d.toBranch||BRANCHES[1];$('vehiclePlate').value=d.vehiclePlate||'';$('docNo').value=d.docNo||'           /QĐ-NHNo.TX-KTNQ';$('docDate').value=d.docDate||today();['escortId','driverId','guardId','requesterId','receiverId'].forEach(id=>{if($(id)&&d[id])$(id).value=d[id];});renderPeople();renderOrder();if(switchToForm)document.querySelector('[data-screen="formScreen"]')?.click();if(scroll)window.scrollTo({top:0,behavior:'smooth'});}
function recordDateLabel(iso){try{return new Date(iso).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});}catch(_){return iso||'';}}

function parseRecordPayload(r){if(r&&r.payload_json){try{return JSON.parse(r.payload_json);}catch(_){}}return r&&r.order?r:null;}
function goodsDetailSummaryFromState(gs){
  if(!gs)return 'Chưa có chi tiết loại hàng';
  const parts=[];
  GOODS_DEF.forEach(g=>{const st=gs[g.key]||{};if(!st.selected)return;if(g.mode==='manual'){const text=(st.text||'').trim();parts.push(`${g.title}: ${text||'Có'}`);return;}const details=[];g.details.forEach(d=>{const it=(st.items||{})[d.key]||{};if(it.selected){const qty=rawNumber(it.qty||'');details.push(`${d.label}${qty?`: ${formatThousands(qty)} ${d.unit}`:''}`);}});if(details.length)parts.push(`${g.title}: ${details.join(', ')}`);});
  return parts.length?parts.join(' · '):'Không có loại hàng đặc biệt được chọn';
}
function recordGoodsDetail(r){const payload=parseRecordPayload(r);return goodsDetailSummaryFromState(payload?.order?.goodsState);}
function isCurrentAdmin(){
  if(!currentUser)return false;
  const username=String(currentUser.username||currentUser.user||currentAuth?.username||'').toLowerCase();
  const role=String(currentUser.role||currentUser.user_role||currentUser.permission||'').toLowerCase();
  const roles=Array.isArray(currentUser.roles)?currentUser.roles.map(x=>String(x).toLowerCase()):[String(currentUser.roles||'').toLowerCase()].filter(Boolean);
  return !!(currentUser.is_admin||currentUser.isAdmin||currentUser.admin||username==='admin'||role==='admin'||roles.includes('admin'));
}
function recordItemHtml(r){const deleteBtn=isCurrentAdmin()?`<button type="button" class="btn danger" data-delete-record="${esc(r.id)}">Xoá</button>`:'';return `<div class="record-item"><div class="record-info"><b>${esc(r.doc_no||'Không số')}</b><div class="record-meta">${esc(r.from_branch||'')} → ${esc(r.to_branch||'')} · Áp tải: ${esc(r.escort_name||'')} · ${esc(recordDateLabel(r.created_at))}</div><div class="record-meta record-goods"><b>Loại hàng:</b> ${esc(recordGoodsDetail(r))}</div><div class="record-meta">User lập lệnh: ${esc(r.created_by_name||r.created_by||'')}</div></div><div class="record-actions"><button type="button" class="btn secondary" data-reopen-record="${esc(r.id)}">Mở lại</button><button type="button" class="btn primary" data-print-record="${esc(r.id)}">In PDF</button>${deleteBtn}</div></div>`;}

function fillRecordFilterOptions(records){
  const escortSel=$('recordEscortFilter'), userSel=$('recordUserFilter');
  if(!escortSel||!userSel)return;
  const keepEscort=escortSel.value, keepUser=userSel.value;
  const escorts=[...new Set((records||[]).map(r=>r.escort_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const users=[...new Set((records||[]).map(r=>r.created_by_name||r.created_by).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  escortSel.innerHTML='<option value="">Tất cả người áp tải</option>'+escorts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  userSel.innerHTML='<option value="">Tất cả user lập lệnh</option>'+users.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if(escorts.includes(keepEscort)) escortSel.value=keepEscort;
  if(users.includes(keepUser)) userSel.value=keepUser;
}
function localDateOnly(iso){
  if(!iso)return '';
  try{const d=new Date(iso);const y=d.toLocaleString('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric'});const m=d.toLocaleString('en-CA',{timeZone:'Asia/Ho_Chi_Minh',month:'2-digit'});const day=d.toLocaleString('en-CA',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit'});return `${y}-${m}-${day}`;}catch(_){return String(iso).slice(0,10);}
}
function filterRecords(records){
  const q=($('recordSearch')?.value||'').toLowerCase().trim();
  const from=$('recordFromDate')?.value||'';
  const to=$('recordToDate')?.value||'';
  const escort=$('recordEscortFilter')?.value||'';
  const user=$('recordUserFilter')?.value||'';
  return (records||[]).filter(r=>{
    const hay=[r.doc_no,r.from_branch,r.to_branch,r.escort_name,r.summary,r.created_by_name,r.created_by].join(' ').toLowerCase();
    const d=localDateOnly(r.created_at||r.doc_date);
    const userLabel=r.created_by_name||r.created_by||'';
    return (!q||hay.includes(q)) && (!from||d>=from) && (!to||d<=to) && (!escort||r.escort_name===escort) && (!user||userLabel===user);
  });
}
async function loadRecords(){
  const list=$('recordsList');if(!list||!currentAuth)return;
  list.innerHTML='<div class="empty-records">Đang tải bản ghi...</div>';
  try{
    const data=await apiPost('/api/records/list',{auth:currentAuth});
    fillRecordFilterOptions(data.records||[]);
    const rows=filterRecords(data.records||[]);
    $('recordsCount').textContent=`${rows.length} bản ghi`;
    list.innerHTML=rows.length?rows.map(recordItemHtml).join(''):'<div class="empty-records">Chưa có bản ghi phù hợp.</div>';
  }catch(err){list.innerHTML=`<div class="empty-records error">${esc(err.message)}</div>`;}
}
async function loadRecordById(id,options={}){const data=await apiPost('/api/records/get',{auth:currentAuth,id});applyRecord(data.record,options);return data.record;}
async function deleteRecordById(id){
  if(!isCurrentAdmin()){alert('Chỉ tài khoản admin được xoá bản ghi.');return;}
  if(!confirm('Xoá bản ghi đã lưu này? Thao tác này không hoàn tác.'))return;
  await apiPost('/api/records/delete',{auth:currentAuth,id});
  await loadRecords();
  alert('Đã xoá bản ghi.');
}
async function printRecordById(id){await loadRecordById(id,{switchToForm:false,scroll:false});document.body.classList.add('printing-record');const cleanup=()=>document.body.classList.remove('printing-record');window.addEventListener('afterprint',cleanup,{once:true});setTimeout(()=>{window.print();setTimeout(cleanup,1200);},80);}

function hasQty(item){return !!rawNumber(item?.qty||'');}
function onlyCashFxNoImportantGoods(d){
  const gs=d.goodsState||{};
  const hasCash=!!(gs.cash?.selected && hasQty(gs.cash?.items?.vnd));
  const hasFx=!!(gs.fx?.selected && (hasQty(gs.fx?.items?.usd)||hasQty(gs.fx?.items?.eur)));
  const noImportant=!(gs.acqt?.selected)&&!(gs.collateral?.selected)&&!(gs.other?.selected);
  return noImportant && (hasCash || hasFx);
}
function shouldPrintFundDeposit14(d){
  return d.fromBranch === 'Agribank CN Thọ Xuân' && d.toBranch === 'Agribank CN Thanh Hoá';
}
function shouldPrintFundReplenish13(d){
  return d.fromBranch === 'Agribank CN Thanh Hoá' && d.toBranch === 'Agribank CN Thọ Xuân' && onlyCashFxNoImportantGoods(d);
}
function shouldPrintAcqtCashProposal(d){
  return d.fromBranch === 'Agribank CN Thanh Hoá' && d.toBranch === 'Agribank CN Thọ Xuân' && acqtTableRows(d).length;
}
function fundMoneyLine(label, qty, unit){
  const n=rawNumber(qty);
  if(!n) return '';
  const words=viNumberWords(n);
  return `<p class="fund14-line">- Loại tiền tệ: ${esc(label)}</p><p class="fund14-sub">+ Số tiền bằng số: ${esc(formatThousands(n))} ${esc(unit)}</p><p class="fund14-sub">+ Số tiền bằng chữ: ${esc(words)} ${esc(unit)}</p>`;
}
function renderFundDeposit14(d){
  const requester=getPerson(d.requesterId);
  const receiver=getPerson(d.receiverId);
  const cash=d.goodsState.cash?.items?.vnd || {};
  const usd=d.goodsState.fx?.items?.usd || {};
  const eur=d.goodsState.fx?.items?.eur || {};
  const moneyParts=[];
  if(d.goodsState.cash?.selected && cash.selected) moneyParts.push(fundMoneyLine('VNĐ', cash.qty, 'VNĐ'));
  if(d.goodsState.fx?.selected && usd.selected) moneyParts.push(fundMoneyLine('USD', usd.qty, 'USD'));
  if(d.goodsState.fx?.selected && eur.selected) moneyParts.push(fundMoneyLine('EUR', eur.qty, 'EUR'));
  const dateParts=(d.docDate||today()).split('-');
  const [y,m,day]=dateParts;
  const docNo=String(d.docNo||'').replace('/QĐ-NHNo.TX-KTNQ','/NHNo.TX-KTNQ');
  return `<section class="fund14-page"><div class="fund14-header"><div class="fund14-left"><p>NGÂN HÀNG NÔNG NGHIỆP</p><p>VÀ PHÁT TRIỂN NÔNG THÔN VIỆT NAM</p><p><b>CHI NHÁNH THỌ XUÂN THANH HÓA</b></p><div class="fund14-rule"></div><p>Số: ${escPreserveSpaces(docNo)}</p></div><div class="fund14-right"><p><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></p><p><b>Độc lập - Tự do - Hạnh phúc</b></p><div class="fund14-rule"></div><p><i>Thanh Hóa, ngày ${Number(day)} tháng ${Number(m)} năm ${y}</i></p></div></div><h1 class="fund14-title">GIẤY ĐỀ NGHỊ NỘP QUỸ</h1><p class="fund14-kg"><b>Kính gửi:</b> Giám đốc Agribank Chi nhánh Thanh Hóa</p><p class="fund14-p">Căn cứ tồn quỹ tiền mặt tại Chi nhánh Thọ Xuân Thanh Hóa</p><p class="fund14-p">Đề nghị nộp quỹ tiền mặt như sau:</p><p class="fund14-line">- Người đề nghị: ${esc(requester.name||'................')}. &nbsp;&nbsp;&nbsp; User ID: ${esc(requester.user||receiver.user||'................')}</p>${moneyParts.join('') || '<p class="fund14-line">- Loại tiền tệ: VNĐ</p><p class="fund14-sub">+ Số tiền bằng số: ............ VNĐ</p><p class="fund14-sub">+ Số tiền bằng chữ: ............ VNĐ</p>'}<div class="fund14-sign"><div><p><b>NGƯỜI ĐỀ NGHỊ</b></p><p><i>(Ký, ghi rõ họ, tên)</i></p></div><div><p><b>NGƯỜI KIỂM SOÁT</b></p><p><i>(Ký, ghi rõ họ, tên)</i></p></div><div><p><b>NGƯỜI PHÊ DUYỆT</b></p><p><i>(Ký, ghi rõ họ, tên)</i></p></div></div></section>`;
}
function renderFundReplenish13(d){
  const requester=getPerson(d.requesterId);
  const receiver=getPerson(d.receiverId);
  const cash=d.goodsState.cash?.items?.vnd || {};
  const usd=d.goodsState.fx?.items?.usd || {};
  const eur=d.goodsState.fx?.items?.eur || {};
  const moneyParts=[];
  if(d.goodsState.cash?.selected && cash.selected) moneyParts.push(fundMoneyLine('VNĐ', cash.qty, 'VNĐ'));
  if(d.goodsState.fx?.selected && usd.selected) moneyParts.push(fundMoneyLine('USD', usd.qty, 'USD'));
  if(d.goodsState.fx?.selected && eur.selected) moneyParts.push(fundMoneyLine('EUR', eur.qty, 'EUR'));
  const [y,m,day]=(d.docDate||today()).split('-');
  const docNo=String(d.docNo||'').replace('/QĐ-NHNo.TX-KTNQ','/NHNo.TX-KTNQ').replace('/NHNo.TX-KTNQ','/NHNo.TX-KTNQ');
  const requesterName=requester.name||'................';
  const requesterUser=requester.user||receiver.user||'................';
  const receiverName=receiver.name||'................';
  return `<section class="fund14-page fund13-page"><div class="fund14-header"><div class="fund14-left"><p>NGÂN HÀNG NÔNG NGHIỆP</p><p>VÀ PHÁT TRIỂN NÔNG THÔN VIỆT NAM</p><p><b>CHI NHÁNH THỌ XUÂN THANH HÓA</b></p><div class="fund14-rule"></div><p>Số: ${escPreserveSpaces(docNo)}</p></div><div class="fund14-right"><p><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></p><p><b>Độc lập - Tự do - Hạnh phúc</b></p><div class="fund14-rule"></div><p><i>Thọ Xuân, ngày ${Number(day)} tháng ${Number(m)} năm ${y}</i></p></div></div><h1 class="fund14-title">GIẤY ĐỀ NGHỊ TIẾP QUỸ</h1><p class="fund14-kg"><b>Kính gửi:</b> Giám đốc Agribank Chi nhánh Thanh Hóa</p><p class="fund14-p">Căn cứ nhu cầu tiền mặt giao dịch trong ngày;</p><p class="fund14-p">Đề nghị tiếp quỹ tiền mặt như sau:</p><p class="fund14-line">- Người đề nghị: ${esc(requesterName)}. &nbsp;&nbsp;&nbsp; User ID: ${esc(requesterUser)}</p><p class="fund14-line">- Người nhận: ${esc(receiverName)}. &nbsp;&nbsp;&nbsp; Phòng/Tổ: KTNQ</p>${moneyParts.join('') || '<p class="fund14-line">- Loại tiền tệ: VNĐ</p><p class="fund14-sub">+ Số tiền bằng số: ............ VNĐ</p><p class="fund14-sub">+ Số tiền bằng chữ: ............ VNĐ</p>'}<div class="fund14-sign"><div><p><b>NGƯỜI ĐỀ NGHỊ</b></p><p><i>(Ký, ghi rõ họ, tên)</i></p></div><div><p><b>NGƯỜI KIỂM SOÁT</b></p><p><i>(Ký, ghi rõ họ, tên)</i></p></div><div><p><b>NGƯỜI PHÊ DUYỆT</b></p><p><i>(Ký, ghi rõ họ, tên)</i></p></div></div></section>`;
}
function moneyTableRows(d){
  const rows=[];
  const cash=d.goodsState.cash?.items?.vnd||{}, usd=d.goodsState.fx?.items?.usd||{}, eur=d.goodsState.fx?.items?.eur||{};
  if(d.goodsState.cash?.selected && hasQty(cash)) rows.push(['VNĐ', formatThousands(rawNumber(cash.qty)), `${viNumberWords(cash.qty)} VNĐ`]);
  if(d.goodsState.fx?.selected && hasQty(usd)) rows.push(['USD', formatThousands(rawNumber(usd.qty)), `${viNumberWords(usd.qty)} USD`]);
  if(d.goodsState.fx?.selected && hasQty(eur)) rows.push(['EUR', formatThousands(rawNumber(eur.qty)), `${viNumberWords(eur.qty)} EUR`]);
  return rows;
}
function acqtTableRows(d){
  const ac=d.goodsState.acqt||{};
  if(!ac.selected) return [];
  const defs=[['stkTerm','Sổ tiết kiệm có kỳ hạn','sổ'],['stk','Sổ tiết kiệm không kỳ hạn','sổ'],['cheque','Séc','tờ'],['guarantee','Thư bảo lãnh','tờ']];
  return defs.map(([key,label,unit])=>{const it=ac.items?.[key]||{}; const n=rawNumber(it.qty||''); return it.selected&&n?[label, `${formatThousands(n)} ${unit}`]:null;}).filter(Boolean);
}
function renderTable(headers, rows, cls='proposal-table'){
  if(!rows.length) return '';
  return `<table class="${cls}"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td>${r.map(c=>`<td>${esc(c)}</td>`).join('')}<td></td></tr>`).join('')}</tbody></table>`;
}
function renderAcqtCashProposal(d){
  const escort=getPerson(d.escortId);
  const [y,m,day]=(d.docDate||today()).split('-');
  const docNo=String(d.docNo||'').replace('/QĐ-NHNo.TX-KTNQ','/TTr-NHNo.TX-KTNQ').replace('/NHNo.TX-KTNQ','/TTr-NHNo.TX-KTNQ');
  const moneyRows=moneyTableRows(d);
  const acqtRows=acqtTableRows(d);
  const moneyText=moneyRows.length?'tiếp quỹ tiền mặt và ':'';
  const acqtText=acqtRows.length?'cấp phát ấn chỉ quan trọng':'tiếp quỹ tiền mặt';
  const acqtSectionNo=moneyRows.length?2:1;
  const receiverSectionNo=moneyRows.length&&acqtRows.length?3:(moneyRows.length||acqtRows.length?2:1);
  return `<section class="proposal-page"><div class="fund14-header"><div class="fund14-left"><p>NGÂN HÀNG NÔNG NGHIỆP</p><p>VÀ PHÁT TRIỂN NÔNG THÔN VIỆT NAM</p><p><b>CHI NHÁNH THỌ XUÂN – THANH HÓA</b></p><div class="fund14-rule"></div><p>Số: ${escPreserveSpaces(docNo)}</p></div><div class="fund14-right"><p><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></p><p><b>Độc lập - Tự do - Hạnh phúc</b></p><div class="fund14-rule"></div><p><i>Thọ Xuân, ngày ${Number(day)} tháng ${Number(m)} năm ${y}</i></p></div></div><h1 class="proposal-title">TỜ TRÌNH</h1><h2 class="proposal-subtitle">XIN ${moneyRows.length?'TIẾP QUỸ TIỀN MẶT':''}${moneyRows.length&&acqtRows.length?' VÀ ':''}${acqtRows.length?'CẤP ẤN CHỈ QUAN TRỌNG':''}</h2><p class="fund14-kg"><b>Kính gửi:</b> Agribank Chi nhánh Thanh Hóa.</p><p class="fund14-p">Căn cứ Quy định số 4368/QyĐ-NHNo-TCKT ngày 25/12/2024 của Tổng Giám đốc về giao nhận, bảo quản, vận chuyển tiền mặt, tài sản quý, giấy tờ có giá, ấn chỉ quan trọng, tài sản khác;</p><p class="fund14-p">Căn cứ Hướng dẫn số 16666/HD-NHNo-TCKT ngày 30/12/2023 của Tổng Giám đốc về quản lý và hạch toán ấn chỉ;</p><p class="fund14-p">Căn cứ nhu cầu sử dụng ${moneyRows.length?'tiền mặt':''}${moneyRows.length&&acqtRows.length?' và ':''}${acqtRows.length?'ấn chỉ quan trọng':''} tại Chi nhánh;</p><p class="fund14-p">Theo đề nghị của Trưởng phòng Kế toán và Ngân quỹ.</p><p class="fund14-p">Chi nhánh Thọ Xuân Thanh Hóa đề nghị Agribank CN Thanh Hóa ${moneyText}${acqtText}, cụ thể như sau:</p>${moneyRows.length?'<p class="proposal-section-title">1. Tiền mặt:</p>'+renderTable(['TT','Loại tiền','Bằng số','Bằng chữ','Ghi chú'], moneyRows, 'proposal-table money-table'):''}${acqtRows.length?`<p class="proposal-section-title">${acqtSectionNo}. Số lượng từng loại ấn chỉ quan trọng xin được cấp phát:</p><p class="proposal-unit">Đơn vị tính: tờ, thẻ/sổ</p>`+renderTable(['STT','Tên ấn chỉ quan trọng','Số lượng ấn chỉ quan trọng đề nghị xin cấp','Ghi chú'], acqtRows, 'proposal-table acqt-table'):''}<p class="fund14-p"><b>${receiverSectionNo}. Người nhận ${moneyRows.length?'tiền mặt':''}${moneyRows.length&&acqtRows.length?', ':''}${acqtRows.length?'ấn chỉ quan trọng':''}:</b> ${esc(escort.gender||'Ông')}: ${esc(escort.name||'................')} chức vụ: ${esc(escort.title||'................')} – Agribank Thọ Xuân. Số CCCD: ${esc(escort.cccd||'................')} ngày ${esc(escort.issueDate||'.../.../....')} nơi cấp: ${esc(escort.issuePlace||'................')}.</p><div class="proposal-sign"><p><b>GIÁM ĐỐC</b></p><p><i>(Ký, ghi rõ họ và tên, đóng dấu)</i></p></div></section>`;
}
function renderOrder(){
  const d=orderData(), escort=getPerson(d.escortId), driver=getPerson(d.driverId), guard=getPerson(d.guardId);
  document.querySelectorAll('.goods-card').forEach(c=>c.classList.toggle('active',goodsState[c.dataset.goodsCard]?.selected));
  $('miniPreview').innerHTML=`<p><b>Nơi đi:</b> ${esc(d.fromBranch)}</p><p><b>Nơi đến:</b> ${esc(d.toBranch)}</p><p><b>Loại hàng:</b> ${esc(goodsSummaryTitle())}</p><p><b>Áp tải:</b> ${esc(escort.name||'')}</p><p><b>Lái xe:</b> ${esc(driver.name||'')}</p><p><b>Bảo vệ:</b> ${esc(guard.name||'')}</p>`;
  const basis=basisLine(d.fromBranch, d.toBranch, goodsState, viDate(d.docDate));
  $('printArea').innerHTML=`<div class="doc-header"><div class="doc-left"><p>NGÂN HÀNG NÔNG NGHIỆP</p><p>VÀ PHÁT TRIỂN NÔNG THÔN VIỆT NAM</p><p class="bold">CHI NHÁNH THỌ XUÂN THANH HÓA</p><div class="header-rule left-rule"></div><p class="doc-no">Số: ${escPreserveSpaces(d.docNo)}</p></div><div class="doc-right"><p class="bold nowrap">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p><p class="bold">Độc lập - Tự do - Hạnh phúc</p><div class="header-rule right-rule"></div><p class="italic date-line">Thanh Hóa, ${longDate(d.docDate)}</p></div></div><h1>LỆNH ĐIỀU CHUYỂN</h1><h2>KIÊM GIẤY UỶ QUYỀN ÁP TẢI HÀNG ĐẶC BIỆT</h2><p class="indent justify italic">Căn cứ Quy định số 4368/QyĐ-NHNo-TCKT ngày 25/12/2024 của Tổng Giám đốc về giao nhận, bảo quản, vận chuyển tiền mặt, tài sản quý, giấy tờ có giá, ấn chỉ quan trọng, tài sản khác;</p>${basis ? `<p class="indent justify italic">${escPreserveSpaces(basis)}</p>` : ''}<p class="indent justify italic">Theo đề nghị của Trưởng phòng Kế toán và Ngân quỹ.</p><p class="center bold decision">GIÁM ĐỐC QUYẾT ĐỊNH:</p><p class="indent"><b>Điều 1.</b> Điều chuyển hàng đặc biệt với các nội dung sau:</p><p class="indent">1. Loại hàng đặc biệt, gồm có:</p>${goodsHtml()}<p class="indent">2. Nơi đi: ${esc(d.fromBranch)}</p><p class="indent">3. Nơi đến: ${esc(d.toBranch)}</p><p class="indent">4. Phương tiện vận chuyển: Xe chuyên dùng biển số: ${esc(d.vehiclePlate)}</p><p class="indent">5. Thời gian thực hiện: ${esc(d.executionDate)}</p><p class="indent"><b>Điều 2.</b> Thành phần tổ vận chuyển, áp tải hàng đặc biệt (ghi rõ họ tên, chức danh từng người):</p><p class="indent justify">${esc(personLine(1,escort,'Tổ trưởng/Áp tải'))}</p><p class="indent justify">${esc(personLine(2,driver,'Lái xe'))}</p><p class="indent justify">${esc(personLine(3,guard,'Bảo vệ'))}</p><p class="indent justify"><b>Điều 3.</b> Ủy quyền cho Tổ trưởng là người áp tải chịu trách nhiệm chính cùng các ông, bà có tên tại Điều 2 chịu trách nhiệm giao, nhận, bảo quản, áp tải, vận chuyển hàng đặc biệt đảm bảo tuyệt đối an toàn, bí mật theo Quy định số 4368/QyĐ-NHNo-TCKT ngày 25/12/2024 của Tổng Giám đốc về giao nhận, bảo quản, vận chuyển tiền mặt, tài sản quý, giấy tờ có giá, ấn chỉ quan trọng, tài sản khác và quy định của pháp luật, NHNN.</p><p class="indent justify"><b>Điều 4.</b> Quyết định này có hiệu lực kể từ ngày ký và chấm dứt khi kết thúc giao/nhận hàng đặc biệt.</p><div class="sign"><div class="receive"><p><i>Nơi nhận:</i></p><p class="small">- P. KTNQ;</p><p class="small">- Lưu: Đơn vị.</p></div><div class="right"><p><b>GIÁM ĐỐC</b></p><p class="small"><i>(Ký tên, đóng dấu)</i></p></div></div>${shouldPrintFundDeposit14(d) ? renderFundDeposit14(d) : ''}${shouldPrintFundReplenish13(d) ? renderFundReplenish13(d) : ''}${shouldPrintAcqtCashProposal(d) ? renderAcqtCashProposal(d) : ''}`;
}
function renderPeople(){const list=$('peopleList'); $('peopleCount').textContent=`${people.length} người`; list.innerHTML=''; people.forEach(p=>{const div=document.createElement('div'); div.className='person-item'; div.dataset.personId=p.id; const extra=p.user?` · User: ${esc(p.user)}`:''; div.innerHTML=`<div><b>${esc(p.gender||'Ông')} ${esc(p.name)}</b><span class="role-badge">${ROLE_LABEL[p.role]||p.role}</span><div class="person-meta">Chức vụ: ${esc(p.title||'')} · CCCD: ${esc(p.cccd||'')}${extra} · Ngày cấp: ${esc(p.issueDate||'')} · Nơi cấp: ${esc(p.issuePlace||'')}</div></div><div class="item-actions"><button class="btn secondary" data-edit="${p.id}">Sửa</button><button class="btn danger" data-del="${p.id}">Xoá</button></div>`; list.appendChild(div);}); enableDragDrop();}

let draggedPersonId = null;

function enableDragDrop() {
  document.querySelectorAll('.person-item').forEach(item => {
    item.draggable = true;
    item.addEventListener('dragstart', e => {
      draggedPersonId = e.currentTarget.dataset.personId;
      e.currentTarget.style.opacity = '0.5';
    });
    item.addEventListener('dragend', e => {
      e.currentTarget.style.opacity = '1';
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.currentTarget.style.borderTop = '3px solid #06b6d4';
    });
    item.addEventListener('dragleave', e => {
      e.currentTarget.style.borderTop = '';
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      e.currentTarget.style.borderTop = '';
      if (!draggedPersonId || draggedPersonId === e.currentTarget.dataset.personId) return;
      const draggedIdx = people.findIndex(p => p.id === draggedPersonId);
      const targetIdx = people.findIndex(p => p.id === e.currentTarget.dataset.personId);
      if (draggedIdx === -1 || targetIdx === -1) return;
      const [dragged] = people.splice(draggedIdx, 1);
      people.splice(targetIdx, 0, dragged);
      savePeople();
      fillSelects();
      renderPeople();
      renderOrder();
    });
  });
}

function resetPersonForm(){['personId','personName','personTitle','personCccd','personIssueDate','personUser'].forEach(id=>$(id).value=''); $('personIssuePlace').value='Cục CSQLHC về TTXH'; $('personRole').value='escort'; $('personGender').value='Ông'; $('editBadge').textContent='Thêm mới';}
document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.tab,.screen').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); $(btn.dataset.screen).classList.add('active');});
$('orderForm').addEventListener('input',e=>{if(e.target.matches('[data-goods-qty]')){e.target.value=formatThousands(e.target.value); try{e.target.setSelectionRange(e.target.value.length,e.target.value.length)}catch(_){} } renderOrder();}); $('orderForm').addEventListener('change',renderOrder); $('resetOrderBtn').onclick=()=>{initOrder(); alert('Đã làm mới nội dung.');};
$('printBtn').onclick=async()=>{renderOrder();try{await saveCurrentRecord();loadRecords();}catch(err){alert('Không lưu được bản ghi: '+err.message);return;}window.print();};
$('personForm').onsubmit=e=>{e.preventDefault(); const data={id:$('personId').value||uid(),name:$('personName').value.trim(),role:$('personRole').value,gender:$('personGender').value,title:$('personTitle').value.trim(),cccd:$('personCccd').value.trim(),issueDate:$('personIssueDate').value.trim(),issuePlace:$('personIssuePlace').value.trim(),user:$('personUser').value.trim()}; if(data.cccd && !/^\d{12}$/.test(data.cccd)){alert('Số CCCD phải gồm 12 chữ số.');return;} const idx=people.findIndex(p=>p.id===data.id); if(idx>=0) people[idx]=data; else people.push(data); savePeople(); fillSelects(); renderPeople(); renderOrder(); resetPersonForm();};
$('peopleList').onclick=e=>{const edit=e.target.dataset.edit, del=e.target.dataset.del; if(edit){const p=getPerson(edit); $('personId').value=p.id; $('personName').value=p.name; $('personRole').value=p.role; $('personGender').value=p.gender||'Ông'; $('personTitle').value=p.title||''; $('personCccd').value=p.cccd||''; $('personIssueDate').value=p.issueDate||''; $('personIssuePlace').value=p.issuePlace||''; $('personUser').value=p.user||''; $('editBadge').textContent='Đang sửa';} if(del&&confirm('Xoá nhân sự này?')){people=people.filter(p=>p.id!==del); savePeople(); fillSelects(); renderPeople(); renderOrder();}};
$('resetPersonBtn').onclick=resetPersonForm;

function loadAuth(){try{const raw=sessionStorage.getItem(AUTH_STORE);if(raw){currentAuth=JSON.parse(raw);}}catch(_){}}
function saveAuth(username,password){currentAuth={username,password};sessionStorage.setItem(AUTH_STORE,JSON.stringify(currentAuth));}
function clearAuth(){currentAuth=null;currentUser=null;sessionStorage.removeItem(AUTH_STORE);location.reload();}
function userDisplayName(user){if(!user)return '';return user.full_name||user.fullName||user.name||user.display_name||user.username||currentAuth?.username||'';}
function showLoggedInUser(){const name=userDisplayName(currentUser);const el=$('currentUserName'); if(el) el.textContent=name?`Đang đăng nhập: ${name}`:'Đã đăng nhập';}
async function login(username,password){const resp=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const data=await resp.json();if(!data.success)throw new Error(data.detail||'Đăng nhập thất bại');currentUser=data.user;return data.user;}
async function exportDocx(){if(!currentAuth){alert('Phiên đăng nhập không hợp lệ');return;}const d=orderData(),escort=getPerson(d.escortId),driver=getPerson(d.driverId),guard=getPerson(d.guardId);const goodsLines=goodsSections().flatMap(s=>s.lines);const peopleLines=[personLine(1,escort,'Tổ trưởng/Áp tải'),personLine(2,driver,'Lái xe'),personLine(3,guard,'Bảo vệ')];const payload={auth:currentAuth,order:{...d,dateLine:`Thanh Hóa, ${longDate(d.docDate)}`,docDateText:viDate(d.docDate)},goodsLines,peopleLines};const resp=await fetch('/api/export-docx',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!resp.ok){alert('Xuất DOCX thất bại');return;}const blob=await resp.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`lenh-dieu-chuyen-${new Date().toISOString().slice(0,10)}.docx`;a.click();URL.revokeObjectURL(url);}
$('loginForm').onsubmit=async e=>{e.preventDefault();const username=$('loginUsername').value.trim(),password=$('loginPassword').value;$('loginError').className='status info';$('loginError').textContent='Đang đăng nhập...';try{await login(username,password);saveAuth(username,password);$('loginOverlay').style.display='none';$('appShell').classList.remove('locked');showLoggedInUser();loadRecords();}catch(err){$('loginError').className='status error';$('loginError').textContent=err.message;}};
const exportBtn=$('exportDocxBtn'); if(exportBtn) exportBtn.onclick=()=>{renderOrder();exportDocx();};
const logoutBtn=$('logoutBtn'); if(logoutBtn) logoutBtn.onclick=clearAuth;
const refreshRecordsBtn=$('refreshRecordsBtn'); if(refreshRecordsBtn) refreshRecordsBtn.onclick=loadRecords;
['recordSearch','recordFromDate','recordToDate','recordEscortFilter','recordUserFilter'].forEach(id=>{const el=$(id); if(el) el.addEventListener(id==='recordSearch'?'input':'change',loadRecords);});
const recordsList=$('recordsList'); if(recordsList) recordsList.onclick=e=>{const reopenId=e.target.dataset.reopenRecord, printId=e.target.dataset.printRecord, deleteId=e.target.dataset.deleteRecord;if(reopenId)loadRecordById(reopenId,{switchToForm:true,scroll:true}).catch(err=>alert(err.message));if(printId)printRecordById(printId).catch(err=>alert(err.message));if(deleteId)deleteRecordById(deleteId).catch(err=>alert(err.message));};
loadAuth();if(currentAuth){(async()=>{try{await login(currentAuth.username,currentAuth.password);$('loginOverlay').style.display='none';$('appShell').classList.remove('locked');showLoggedInUser();loadRecords();}catch(_){clearAuth();}})();}
initOrder(); renderPeople(); resetPersonForm();
