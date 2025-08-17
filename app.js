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
  $('stem').textContent = q.stem; $('stemMeta').textContent = q.me
