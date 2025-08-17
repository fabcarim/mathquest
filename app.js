/* MathQuest – app.js v17 (pulito, robusto) */

function $(id){ return document.getElementById(id); }
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function gcd(a,b){ return b ? gcd(b, a%b) : Math.abs(a); }
function lcm(a,b){ return Math.abs(a*b)/gcd(a,b); }
function dec(x,p){ p=(p==null?2:p); return Number.parseFloat(x.toFixed(p)); }
function approxEqual(a,b,eps){ eps=(eps==null?1e-6:eps); return Math.abs(Number(a)-Number(b))<=eps; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function dayKey(ts){ const d=new Date(ts||Date.now()); const m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2); return d.getFullYear()+"-"+m+"-"+dd; }

const topicAccent = {
  "Calcolo interi":"#2563eb","Decimali":"#0ea5e9","Frazioni":"#10b981","Percentuali":"#f59e0b",
  "Proporzioni":"#ec4899","Equazioni":"#7c3aed","Geometria":"#059669","Misure":"#0ea5e9",
  "Potenze":"#ef4444","Radici":"#8b5cf6","Numero teoria":"#22c55e","Problemi":"#f97316","Statistiche":"#14b8a6"
};
function setAccent(topic){ const c = topicAccent[topic] || "#2563eb"; document.documentElement.style.setProperty('--accent', c); }

const topicsList = ["Calcolo interi","Decimali","Frazioni","Percentuali","Proporzioni","Equazioni","Geometria","Misure","Potenze","Radici","Numero teoria","Problemi","Statistiche"];

const state = {
  screen:'home', difficulty:2, topicFilter:null,
  question:null, input:'', answeredThis:false, streak:0,
  answered:0, correct:0, history:[],
  autoAdvance:true, autoConfirmMC:true, autoDiff:true,
  dailyGoal:20, lastDailyGoal:20, lastDayKey:null, goalShownToday:false,
  completions:[], badges:[]
};

function save(){ localStorage.setItem('mqLiteState', JSON.stringify(state)); }
function load(){
  const raw = localStorage.getItem('mqLiteState'); if(!raw) return;
  try{
    const s=JSON.parse(raw);
    Object.assign(state, {
      answered:s.answered||0, correct:s.correct||0, streak:s.streak||0,
      difficulty:s.difficulty||2, autoAdvance: s.autoAdvance!==false,
      autoConfirmMC: s.autoConfirmMC!==false, autoDiff: s.autoDiff!==false,
      dailyGoal:s.dailyGoal||20, lastDailyGoal:s.lastDailyGoal||20,
      lastDayKey:s.lastDayKey||null, goalShownToday:!!s.goalShownToday,
      completions:s.completions||[], badges:s.badges||[], topicFilter:s.topicFilter||null,
      history:s.history||[]
    });
  }catch(e){ console.warn('load failed', e); }
}
function todayHistory(){ const k=dayKey(); return state.history.filter(h => dayKey(h.ts)===k); }
function rollDailyGoal(){
  const today = dayKey();
  const prevKey = state.lastDayKey;
  if(prevKey && prevKey!==today){
    const prevCorrect = state.history.filter(h=>dayKey(h.ts)===prevKey && h.ok).length;
    const prevGoal = state.lastDailyGoal||20;
    const completed = prevCorrect >= prevGoal;
    const newGoal = completed ? 20 : clamp(Math.ceil(prevGoal*1.10),10,100);
    state.dailyGoal=newGoal; state.lastDailyGoal=newGoal; state.goalShownToday=false;
    if(completed && !state.completions.includes(prevKey)) state.completions.push(prevKey);
  }
  state.lastDayKey = today;
  save();
}

/* ==== Overlay: funzione idempotente ==== */
function updateOverlayFields(corToday, goal, accAll){
  const a=$('goalCount'), b=$('goalCountTot'), c=$('goalAcc');
  if(a) a.textContent = (typeof corToday==='number' ? String(corToday) : '');
  if(b) b.textContent = (typeof goal==='number' ? String(goal) : '');
  if(c) c.textContent = (typeof accAll==='number' ? String(accAll) : '');
}

/* ==== UI helper ==== */
function setScreen(name){
  ['home','train','play','progress','settings'].forEach(id => { const el=$(id); if(el) el.classList.add('hidden'); });
  const tgt=$(name); if(tgt) tgt.classList.remove('hidden');
  state.screen=name;
  renderHeader(); renderStats();
  if(name==='play'){ renderBadges(); if(!state.question) renderQuestion(); }
  if(name==='progress'){ renderBadgesList(); renderMastery(); }
  if(name==='home'){ renderHomeBadges(); }
}
function renderHeader(){
  const dl=$('diffLabel'); if(dl) dl.textContent=state.difficulty;
  const st=$('streak'); if(st) st.textContent=state.streak;
  const tl=$('topicLabel'); if(tl) tl.textContent = 'Allenamento: ' + (state.topicFilter || 'Tutti gli argomenti');
}

/* ==== Stats ==== */
function renderStats(){
  const corToday = todayHistory().filter(h=>h.ok).length;
  const accAll = state.answered? Math.round(100*state.correct/state.answered):0;

  const setText=(id,val)=>{ const el=$(id); if(el) el.textContent=val; };
  setText('correctToday', corToday);
  setText('corToday2', corToday);
  setText('goalSmall', state.dailyGoal);
  setText('goalVal', state.dailyGoal);
  setText('goalVal2', state.dailyGoal);
  setText('totAns', state.answered);
  setText('accTot', accAll+'%');

  const pct = Math.min(100, Math.round(100*corToday/Math.max(1,state.dailyGoal)));
  if($('goalBar')) $('goalBar').style.width = pct+'%';
  if($('goalBar2')) $('goalBar2').style.width = pct+'%';
  const left = Math.max(0, state.dailyGoal - corToday);
  setText('goalHint', left>0 ? ('Ti mancano '+left+' risposte corrette per l\'obiettivo di oggi.') : 'Obiettivo raggiunto!');
  setText('goalNote', 'Se non completi oggi, domani salirà a circa '+Math.ceil(state.dailyGoal*1.10)+' (+10%)');
  setText('daysDone', 'Giorni obiettivo completato: '+state.completions.length);

  // Aggiorna SEMPRE l’overlay
  updateOverlayFields(corToday, state.dailyGoal, accAll);
}

/* ==== Generazione domande (selezione essenziale ma ampia) ==== */
function makeQ(topic,type,stem,meta,answer,choices,hints,solution){ return {topic,type,stem,meta,answer,choices,hints,solution}; }
function sanitizeChoices(stem, choices, correct){
  const uniq=[]; choices.forEach(c=>{ const s=String(c); if(!uniq.includes(s)) uniq.push(s); });
  if(!uniq.includes(String(correct))) uniq.unshift(String(correct));
  while(uniq.length<4){
    const k = String(Number(correct) + (Math.random()<0.5? 1 : -1));
    if(!uniq.includes(k)) uniq.push(k);
  }
  return uniq.slice(0,4).sort(()=>Math.random()-0.5);
}
const Builders = {
  "Calcolo interi": D => {
    const op = randChoice(['+','-','×','÷']); let a,b,stem,meta='',ans;
    if(op==='+'){a=randInt(15*D,30*D);b=randInt(10*D,20*D);ans=a+b;stem='Calcola la somma'; meta=a+' + '+b;}
    if(op==='-'){a=randInt(20*D,40*D);b=randInt(5*D,15*D); if(b>a){const t=a;a=b;b=t;} ans=a-b; stem='Calcola la differenza'; meta=a+' − '+b;}
    if(op==='×'){a=randInt(4,10*D);b=randInt(4,10*D);ans=a*b;stem='Calcola il prodotto'; meta=a+' × '+b;}
    if(op==='÷'){b=randInt(2,10*D);ans=randInt(3,12*D);a=ans*b;stem='Calcola il quoziente'; meta=a+' ÷ '+b;}
    return makeQ('Calcolo interi', op==='÷'?'input':'input', stem, 'Operazione: '+meta, ans, null, ["Esegui l'operazione nell'ordine dato"], String(ans));
  },
  "Decimali": D => {
    const a=dec(randInt(10,80)/10,1), b=dec(randInt(10,80)/10,1);
    const ans=dec(a+b,2); return makeQ('Decimali','input','Somma con decimali','Arrotonda a 2 cifre decimali. Operazione: '+a+' + '+b, ans, null, ['Allinea la virgola','Arrotonda a 2 decimali'], ans.toFixed(2));
  },
  "Frazioni": D => {
    let n=randInt(1,9), d=randInt(2,9); const g=gcd(n,d); n=Math.floor(n/g); d=Math.floor(d/g);
    const k=randInt(2,5); const n2=n*k, d2=d*k;
    const corr=n2+'/'+d2; const stem='Frazioni equivalenti'; const meta='Scegli una frazione equivalente a '+n+'/'+d+'.';
    const opts=[corr, (n+1)+'/'+d2, n2+'/'+(d2+1), (n2-1)+'/'+d2];
    return makeQ('Frazioni','mc',stem,meta,corr,sanitizeChoices(stem+' '+meta, opts, corr),['Moltiplica num. e den. per lo stesso numero'], corr);
  },
  "Percentuali": D => {
    const p=randChoice([10,12.5,20,25,30,40,50]); const x=randInt(16*D,80*D); const a=dec(x*p/100,2);
    return makeQ('Percentuali','input','Percentuale di una quantità','Calcola il '+p+'% di '+x+'. Arrotonda a 2 decimali se serve.',a,null,['p/100 · valore'],String(a));
  },
  "Proporzioni": D => {
    const a=randInt(2*D,12*D), b=randInt(2*D,12*D), c=randInt(2*D,12*D); const x=Math.round((b*c)/a);
    return makeQ('Proporzioni','input','Completa la proporzione',a+' : '+b+' = '+c+' : x — Trova x (intero).',x,null,['Prodotto medi = prodotto estremi'],String(x));
  },
  "Equazioni": D => {
    const a=randInt(2,7), x=randInt(2*D,15*D), b=randInt(-10,10); const c=a*x+b;
    return makeQ('Equazioni','input',"Risolvi l'equazione", a+'x '+(b>=0?'+':'-')+' '+Math.abs(b)+' = '+c+'. Trova x (intero).', x, null, ['(c - b)/a'], 'x='+x);
  }
};
function makeQuestion(){
  const D=state.difficulty;
  const key = state.topicFilter && Builders[state.topicFilter] ? state.topicFilter : randChoice(Object.keys(Builders));
  return Builders[key](D);
}

/* ==== Render domanda ==== */
function renderQuestion(){
  const q=makeQuestion(); state.question=q; state.input=''; state.answeredThis=false;
  setAccent(q.topic);
  $('topicLabel').textContent = 'Allenamento: ' + (state.topicFilter || 'Tutti gli argomenti');
  $('stem').textContent = q.stem; $('stemMeta').textContent = q.meta||'';
  $('feedback').innerHTML=''; const hints=$('hints'); if(hints){ hints.classList.add('hidden'); hints.textContent=(q.hints||[]).map(h=>'• '+h).join('\n'); }
  const ui=$('answerUI'); ui.innerHTML='';
  const nextBtn=$('btnNext'); if(nextBtn) nextBtn.disabled=true;

  if(q.type==='mc'){
    const grid=document.createElement('div'); grid.className='grid-choices';
    q.choices.forEach(ch=>{
      const b=document.createElement('button'); b.type='button'; b.className='choice'; b.textContent=ch;
      b.onclick=()=>{ state.input=String(ch); Array.from(grid.children).forEach(x=>x.classList.remove('active')); b.classList.add('active'); if(state.autoConfirmMC){ setTimeout(confirmAnswer,150); } else if(nextBtn) nextBtn.disabled=false; };
      grid.appendChild(b);
    });
    ui.appendChild(grid);
  } else {
    const inp=document.createElement('input'); inp.type='text'; inp.className='answer'; inp.placeholder='Scrivi qui la risposta';
    inp.onkeydown=e=>{ if(e.key==='Enter'){ confirmAnswer(); } };
    inp.oninput=e=>{ state.input=e.target.value; };
    ui.appendChild(inp); inp.focus();
  }
}

/* ==== Difficoltà (auto semplice) ==== */
function autoAdjustDifficulty(){
  if(!state.autoDiff){ const t=$('autoDiffTag'); if(t) t.textContent=''; return; }
  const last=state.history.slice(-10); const ok=last.filter(h=>h.ok).length; const acc= last.length? (ok/last.length) : 0.7;
  let d=state.difficulty;
  if(last.length>=6){
    if(acc>=0.85 && state.streak>=3) d=Math.min(3,d+1);
    if(acc<0.6) d=Math.max(1,d-1);
  }
  state.difficulty=d; save();
  const tag=$('autoDiffTag'); if(tag) tag.textContent='(auto)';
  const dl=$('diffLabel'); if(dl) dl.textContent=state.difficulty;
}

/* ==== Risposta ==== */
function maybeCompleteGoal(){
  const corToday = todayHistory().filter(h=>h.ok).length;
  if(corToday >= state.dailyGoal && !state.goalShownToday){
    state.goalShownToday = true;
    const accAll = state.answered? Math.round(100*state.correct/state.answered):0;

    updateOverlayFields(corToday, state.dailyGoal, accAll); // <-- PRIMA di mostrare l’overlay

    const key = dayKey();
    if(!state.completions.includes(key)) state.completions.push(key);
    save();

    const overlay=$('overlay'); overlay.classList.remove('hidden');
    let n=5; $('countdown').textContent=n;
    const int=setInterval(()=>{ n--; $('countdown').textContent=n; if(n<=0){ clearInterval(int); overlay.classList.add('hidden'); setScreen('home'); } },1000);
    $('btnHomeNow').onclick=()=>{ overlay.classList.add('hidden'); clearInterval(int); setScreen('home'); };
  }
}
function confirmAnswer(){
  if(!state.question || state.answeredThis) return;
  let ok=false; const ans=state.question.answer;
  if(typeof ans==='number'){ ok=approxEqual(Number(state.input), ans); }
  else { ok=String(state.input).trim()===String(ans).trim(); }

  state.answered++;
  if(ok){
    state.correct++; state.streak++;
    $('feedback').innerHTML="<div class='ok'><b>Corretto!</b></div>";
    maybeCompleteGoal(); setTimeout(autoAdjustDifficulty,0);
    if(state.autoAdvance){ setTimeout(renderQuestion,800); }
  } else {
    state.streak=0;
    $('feedback').innerHTML="<div class='bad'><b>Non è corretto.</b><br><br><b>Soluzione attesa:</b> "+state.question.solution+(state.question.meta?("<br><br><b>Richiesta:</b> "+state.question.meta):"")+"</div>";
    setTimeout(autoAdjustDifficulty,0);
  }

  state.history.push({
    topic: state.question.topic, type: state.question.type, stem: state.question.stem, meta: state.question.meta,
    given: state.input, answer: state.question.answer, ok, ts: Date.now(), diff: state.difficulty
  });

  state.answeredThis=true;
  if($('btnNext')) $('btnNext').disabled=false;
  renderStats(); save(); renderHomeBadges();
}
function nextQuestion(){ renderQuestion(); }
function toggleHint(){ const h=$('hints'); if(h) h.classList.toggle('hidden'); }
function similar(){ if(!state.question) return; renderQuestion(); }

/* ==== Badge / Progressi (essenziali) ==== */
function renderBadges(){
  const c=$('badges'); if(!c) return; c.innerHTML='';
  if(!state.completions.length){ c.innerHTML="<span class='kicker'>Completa l'obiettivo giornaliero per ottenere i primi badge.</span>"; return; }
  state.completions.slice().reverse().forEach(key=>{
    const el=document.createElement('div'); el.className='badge'; el.innerHTML='🏅 <b>Obiettivo giornaliero</b> — '+key; c.appendChild(el);
  });
}
function renderBadgesList(){
  const c=$('badgesList'); if(!c) return; c.innerHTML='';
  if(!state.completions.length){ c.innerHTML='<div class="kicker">Nessun badge ancora</div>'; return; }
  state.completions.slice().reverse().forEach(key=>{
    const row=document.createElement('div'); row.className='card'; row.innerHTML='<div><b>🏅 Obiettivo giornaliero</b></div><div class="kicker">'+key+'</div>'; c.appendChild(row);
  });
}
function renderHomeBadges(){
  const earned=$('homeBadgesEarned'), locked=$('homeBadgesLocked');
  if(!earned||!locked) return;
  earned.innerHTML=''; locked.innerHTML='';
  state.completions.slice(-6).forEach(k=>{
    const t=document.createElement('div'); t.className='badge'; t.innerHTML='🏅 '+k; earned.appendChild(t);
  });
  const toLock = Math.max(0, 6 - state.completions.length);
  for(let i=0;i<toLock;i++){ const t=document.createElement('div'); t.className='badge'; t.style.opacity=.6; t.innerHTML='🔒 Completa un altro giorno'; locked.appendChild(t); }
}

/* ==== Mastery (placeholder sicuro) ==== */
function renderMastery(){
  const grid=$('masteryGrid'); if(!grid) return; grid.innerHTML='';
  topicsList.slice(0,6).forEach(tp=>{
    const t=document.createElement('div'); t.className='mastery-tile';
    t.innerHTML = `
      <div class="mastery-head">
        <div class="mastery-topic">${tp}</div>
        <div class="mastery-badge mastery-mid">6/10</div>
      </div>
      <div class="mastery-bar"><div style="width:60%"></div></div>
    `;
    grid.appendChild(t);
  });
  const tips=$('masteryTips'); if(tips) tips.textContent='Suggerimento: alterna argomenti e mantieni alta la costanza quotidiana.';
}

/* ==== Export CSV ==== */
function exportCSV(){
  const rows = [['ts','giorno','topic','stem','meta','given','answer','ok','diff']];
  state.history.forEach(h=>{
    rows.push([h.ts, dayKey(h.ts), h.topic, h.stem, (h.meta||''), h.given, h.answer, h.ok, h.diff]);
  });
  const csv = rows.map(r=>r.map(x=>('"'+String(x).replace(/"/g,'""')+'"')).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='mathquest_history.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ==== Topics & livelli ==== */
function buildQuickTopics(){
  const c=$('quickTopics'); if(!c) return; c.innerHTML='';
  topicsList.forEach(tp=>{
    const b=document.createElement('button'); b.className='btn ghost'; b.textContent=tp;
    b.onclick=()=>{ state.topicFilter=tp; setAccent(tp); renderHeader(); renderStats(); };
    c.appendChild(b);
  });
}
function buildTopics(){
  const c=$('topics'); if(!c) return; c.innerHTML='';
  topicsList.forEach(tp=>{
    const b=document.createElement('button'); b.className='btn ghost'; b.textContent=tp;
    b.onclick=()=>{ state.topicFilter=tp; setAccent(tp); renderHeader(); };
    c.appendChild(b);
  });
}
function buildLevels(){
  const c=$('levels'); if(!c) return; c.innerHTML='';
  [1,2,3].forEach((lv)=>{
    const b=document.createElement('button'); b.className='btn ghost pill'; b.textContent=String(lv);
    if(lv===state.difficulty) b.classList.add('active');
    b.onclick=()=>{ state.difficulty=lv; save(); renderHeader(); };
    c.appendChild(b);
  });
}

/* ==== Wiring ==== */
function wire(){
  $('btnHome')?.addEventListener('click', ()=>setScreen('home'));
  $('btnPlay')?.addEventListener('click', ()=>{ setScreen('play'); renderQuestion(); });
  $('startQuick')?.addEventListener('click', ()=>{ setScreen('play'); renderQuestion(); });
  $('startTrain')?.addEventListener('click', ()=>setScreen('train'));
  $('btnTrain')?.addEventListener('click', ()=>setScreen('train'));
  $('btnProg')?.addEventListener('click', ()=>setScreen('progress'));
  $('btnSettings')?.addEventListener('click', ()=>setScreen('settings'));

  $('btnConfirm')?.addEventListener('click', confirmAnswer);
  $('btnNext')?.addEventListener('click', nextQuestion);
  $('btnHint')?.addEventListener('click', toggleHint);
  $('btnSimilar')?.addEventListener('click', similar);
  $('btnHomeNow')?.addEventListener('click', ()=>{ $('overlay').classList.add('hidden'); setScreen('home'); });

  $('clearTopic')?.addEventListener('click', ()=>{ state.topicFilter=null; setAccent(null); renderHeader(); });
  $('resetTopic')?.addEventListener('click', ()=>{ state.topicFilter=null; renderHeader(); });

  $('trainGo')?.addEventListener('click', ()=>{ setScreen('play'); renderQuestion(); });
  $('btnExport')?.addEventListener('click', exportCSV);
}

/* ==== Init ==== */
(function init(){
  load();
  rollDailyGoal();
  buildQuickTopics(); buildTopics(); buildLevels();
  wire();
  setScreen('home');
})();
