/* MathQuest – app.js v16.1 */

function $(id){ return document.getElementById(id); }
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function gcd(a,b){ return b ? gcd(b, a%b) : Math.abs(a); }
function lcm(a,b){ return Math.abs(a*b)/gcd(a,b); }
function dec(x,p){ if(p===undefined) p=2; return Number.parseFloat(x.toFixed(p)); }
function approxEqual(a,b,eps){ if(eps===undefined) eps=1e-6; return Math.abs(Number(a)-Number(b))<=eps; }
function shuffle(arr){ return arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

const topicAccent = {
  "Calcolo interi":"#2563eb","Decimali":"#0ea5e9","Frazioni":"#10b981","Percentuali":"#f59e0b",
  "Proporzioni":"#ec4899","Equazioni":"#7c3aed","Geometria":"#059669","Misure":"#0ea5e9",
  "Potenze":"#ef4444","Radici":"#8b5cf6","Numero teoria":"#22c55e","Problemi":"#f97316","Statistiche":"#14b8a6"
};
function setAccent(topic){
  const c = topicAccent[topic] || "#2563eb";
  document.documentElement.style.setProperty('--accent', c);
}

const state = {
  screen:'home', difficulty:2, topicFilter:null,
  question:null, input:'', answeredThis:false, streak:0,
  answered:0, correct:0, history:[],
  autoAdvance:true, autoConfirmMC:true, autoDiff:true,
  dailyGoal:20, lastDailyGoal:20, lastDayKey:null, goalShownToday:false,
  completions:[], badges:[]
};
const topicsList = ["Calcolo interi","Decimali","Frazioni","Percentuali","Proporzioni","Equazioni","Geometria","Misure","Potenze","Radici","Numero teoria","Problemi","Statistiche"];

function dayKey(ts){ const d=new Date(ts||Date.now()); const m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2); return d.getFullYear()+"-"+m+"-"+dd; }
function historyForDay(hist, key){ return hist.filter(h => dayKey(h.ts)===key); }
function todayHistory(hist){ return historyForDay(hist, dayKey()); }

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
  }catch(e){}
}

function rollDailyGoal(){
  const today = dayKey();
  const prevKey = state.lastDayKey;
  if(prevKey && prevKey!==today){
    const prevCorrect = historyForDay(state.history, prevKey).filter(h=>h.ok).length;
    const prevGoal = state.lastDailyGoal||20;
    const completed = prevCorrect >= prevGoal;
    const newGoal = completed ? 20 : clamp(Math.ceil(prevGoal*1.10),10,100);
    state.dailyGoal=newGoal; state.lastDailyGoal=newGoal; state.goalShownToday=false;
    if(completed && !state.completions.includes(prevKey)) state.completions.push(prevKey);
  }
  if(!state.lastDayKey) state.lastDayKey=today;
  if(state.lastDayKey!==today) state.lastDayKey=today;
  save();
}

function recentWindow(n){ const arr=state.history.slice(-n); const ok=arr.filter(h=>h.ok).length; const acc=arr.length?Math.round(100*ok/arr.length):null; const wrongLast5=state.history.slice(-5).filter(h=>!h.ok).length; return {attempts:arr.length, ok, acc, wrongLast5}; }
function autoAdjustDifficulty(){
  if(!state.autoDiff){ const t=$('autoDiffTag'); if(t) t.textContent=''; return; }
  const w = recentWindow(20); let d=state.difficulty;
  if(w.attempts>=8){
    if((w.acc!==null && w.acc>=85) && state.streak>=3) d=Math.min(3,d+1);
    if((w.acc!==null && w.acc<60) || w.wrongLast5>=3) d=Math.max(1,d-1);
  }
  if(d!==state.difficulty){ state.difficulty=d; save(); }
  const tag=$('autoDiffTag'); if(tag) tag.textContent='(auto)';
  document.querySelectorAll('#levels .pill').forEach((x,i)=>x.classList.toggle('active',(i+1)===state.difficulty));
  const dl=$('diffLabel'); if(dl) dl.textContent=state.difficulty;
}

function sanitizeChoices(stem, choices, correct){
  const uniq=[]; choices.forEach(c=>{ if(!uniq.includes(String(c))) uniq.push(String(c)); });
  choices = uniq;
  const fm = stem.match(/(\d+)\s*\/\s*(\d+)/);
  const fracInStem = fm ? (fm[1]+'/'+fm[2]) : null;
  if(/equival/i.test(stem) && fracInStem){ choices = choices.filter(c => c!==fracInStem); }
  if(choices.indexOf(String(correct))===-1) choices.unshift(String(correct));
  while(choices.length<4){
    let d; const num2 = Number(correct); d = String(num2 + (Math.random()<0.5? 1 : -1));
    if(!choices.includes(String(d))) choices.push(String(d));
  }
  return shuffle(choices.slice(0,4));
}

function makeQ(topic,type,stem,meta,answer,choices,hints,solution){ return {topic,type,stem,meta,answer,choices,hints,solution}; }

/* ==== Generatori di domande (immutati) ==== */
const Builders = {
  /* ... identico alla v16: interi, decimali, frazioni, percentuali, proporzioni,
     equazioni, geometria, misure, potenze, radici, numero teoria, problemi, statistiche ... */
  "Calcolo interi": D => {
    const op = randChoice(['+','-','×','÷']); let a,b,stem,meta='',ans;
    if(op==='+'){a=randInt(100*D,300*D);b=randInt(50*D,150*D);ans=a+b;stem='Calcola la somma'; meta='Rispondi con un numero intero. Operazione: '+a+' + '+b;}
    if(op==='-'){a=randInt(150*D,400*D);b=randInt(50*D,149*D); if(b>a){let t=a;a=b;b=t;} ans=a-b; stem='Calcola la differenza'; meta='Rispondi con un numero intero. Operazione: '+a+' − '+b;}
    if(op==='×'){a=randInt(6,12*D);b=randInt(6,12*D);ans=a*b;stem='Calcola il prodotto'; meta='Rispondi con un numero intero. Operazione: '+a+' × '+b;}
    if(op==='÷'){b=randInt(2,12*D);ans=randInt(6,12*D);a=ans*b;stem='Calcola il quoziente'; meta='Risposta intera. Operazione: '+a+' ÷ '+b;}
    return makeQ('Calcolo interi','input',stem,meta,ans,null,["Esegui l'operazione nell'ordine dato"],String(ans));
  },
  "Decimali": D => {
    const mode=randChoice(['somma','prodotto','arrotonda']); const a=dec(randInt(10,80)/10,1), b=dec(randInt(10,80)/10,1);
    if(mode==='somma') return makeQ('Decimali','input','Somma con decimali','Arrotonda il risultato a 2 cifre decimali. Operazione: '+a+' + '+b,dec(a+b,2),null,['Allinea la virgola','Arrotonda a 2 decimali'],dec(a+b,2).toFixed(2));
    if(mode==='prodotto'){ const ans=dec(a*b,2); return makeQ('Decimali','input','Prodotto con decimali','Arrotonda il risultato a 2 cifre decimali. Operazione: '+a+' × '+b,ans,null,['Conta le cifre decimali','Arrotonda a 2 decimali'],ans.toFixed(2)); }
    const target = randChoice([0,1,2]); return makeQ('Decimali','input','Arrotondamento','Arrotonda '+a+' esattamente a '+target+' cifre decimali.',dec(a,target),null,['Regola del 5'],dec(a,target).toFixed(target));
  },
  "Frazioni": D => {
    let a=randInt(1,9), b=randInt(2,9); const g0=gcd(a,b); a=Math.floor(a/g0); b=Math.floor(b/g0); if(a===b){ b=b+1; }
    const k=randInt(2,5); const aK=a*k, bK=b*k; const variant=randChoice(['askBase','askScaled']);
    if(variant==='askBase'){
      const correct=aK+'/'+bK; const opts=[correct, a+'/'+bK, aK+'/'+b, (aK+1)+'/'+bK];
      const stem='Frazioni equivalenti'; const meta='Scegli una frazione equivalente a '+a+'/'+b+' (diversa da '+a+'/'+b+').';
      return makeQ('Frazioni','mc',stem,meta,correct,sanitizeChoices(stem+' '+meta, opts, correct),['Moltiplica numeratore e denominatore per lo stesso numero'], correct);
    } else {
      const correct2=a+'/'+b; const opts2=[correct2, aK+'/'+b, a+'/'+bK, aK+'/'+(bK+1)];
      const stem2='Frazioni equivalenti'; const meta2='Scegli una frazione equivalente a '+aK+'/'+bK+' (diversa da '+aK+'/'+bK+').';
      return makeQ('Frazioni','mc',stem2,meta2,correct2,sanitizeChoices(stem2+' '+meta2, opts2, correct2),['Riduci ai minimi termini','Dividi per lo stesso numero'], correct2);
    }
  },
  "Percentuali": D => {
    const mode=randChoice(['percOf','fracToPerc','percToFrac']);
    if(mode==='percOf'){ const p=randChoice([10,12.5,20,25,30,40,50]); const x=randInt(16*D,80*D); const a=dec(x*p/100,2); return makeQ('Percentuali','input','Percentuale di una quantità','Calcola il '+p+'% di '+x+'. Arrotonda a 2 decimali se serve.',a,null,['Trasforma in decimale: p/100'],String(a)); }
    if(mode==='fracToPerc'){ const d=randChoice([2,4,5,8,10]); const n=randInt(1,d-1); const a2=dec(100*n/d,2)+'%'; const ch=[a2, dec(n/d,2).toString(), String(n*d)+'%', String(d)+'/'+String(n)+'%']; const stem='Da frazione a percentuale'; const meta='Converti '+n+'/'+d+' in percentuale (es. 12,5%)'; return makeQ('Percentuali','mc',stem,meta,a2,sanitizeChoices(stem+' '+meta, ch, a2),['(n/d)*100'], a2); }
    const mp={"12.5":[1,8],"20":[1,5],"25":[1,4],"37.5":[3,8],"50":[1,2],"62.5":[5,8],"75":[3,4]}; const keys=Object.keys(mp); const pk=randChoice(keys); const nn=mp[pk][0], dd=mp[pk][1]; const stem2='Percentuale come frazione'; const meta2='Scrivi '+pk+'% come frazione in termini minimi.'; const corr=nn+'/'+dd; return makeQ('Percentuali','mc',stem2,meta2,corr,sanitizeChoices(stem2+' '+meta2,[corr,'1/3','2/5','5/12'],corr),['Riduci per MCD'], corr);
  },
  "Proporzioni": D => {
    const a=randInt(2*D,12*D), b=randInt(2*D,12*D), c=randInt(2*D,12*D); const x=Math.round((b*c)/a);
    return makeQ('Proporzioni','input','Completa la proporzione',a+' : '+b+' = '+c+' : x — Trova x (intero).',x,null,['Prodotto medi = prodotto estremi'],String(x));
  },
  "Equazioni": D => {
    const a=randInt(2,7), x=randInt(2*D,15*D), b=randInt(-10,10); const c=a*x+b;
    return makeQ('Equazioni','input',"Risolvi l'equazione di 1º grado", a+'x '+(b>=0?'+':'-')+' '+Math.abs(b)+' = '+c+'. Trova x (intero).', x, null, ['Isola x: (c - b)/a'], 'x='+x);
  },
  "Geometria": D => {
    const shape=randChoice(['rettangolo','triangolo','quadrato','cerchio']);
    if(shape==='rettangolo'){ const B=randInt(5*D,20*D), H=randInt(5*D,20*D); return makeQ('Geometria','input','Area del rettangolo','Base '+B+' cm, altezza '+H+' cm. Rispondi in cm² (intero).',B*H,null,['A=b·h'],String(B*H)); }
    if(shape==='triangolo'){ const B2=randInt(6*D,20*D), H2=randInt(4*D,18*D); return makeQ('Geometria','input','Area del triangolo','Base '+B2+' cm, altezza '+H2+' cm. Rispondi in cm² (usa A=(b·h)/2).',(B2*H2)/2,null,['Dividi per 2'],String((B2*H2)/2)); }
    if(shape==='quadrato'){ const L=randInt(4*D,20*D); return makeQ('Geometria','input','Perimetro del quadrato','Lato '+L+' cm. Rispondi in cm (intero).',4*L,null,['P=4·l'],String(4*L)); }
    const r=randInt(3,10); const pi=3.14; return makeQ('Geometria','input','Circonferenza del cerchio','Raggio '+r+' cm. Usa π≈3,14 e arrotonda a 2 decimali.',dec(2*pi*r,2),null,['C=2πr'],dec(2*pi*r,2).toFixed(2));
  },
  "Misure": D => {
    const type=randChoice(['L','kg','km','cm2']);
    if(type==='L'){ const L=dec(randInt(5,30)/2,1); return makeQ('Misure','input','Conversione di capacità','Converti '+L+' L in mL.',L*1000,null,['×1000'],String(L*1000)); }
    if(type==='kg'){ const kg=dec(randInt(10,50)/10,1); return makeQ('Misure','input','Conversione di massa','Converti '+kg+' kg in g.',kg*1000,null,['×1000'],String(kg*1000)); }
    if(type==='km'){ const km=dec(randInt(10,80)/10,1); return makeQ('Misure','input','Conversione di lunghezza','Converti '+km+' km in m.',km*1000,null,['×1000'],String(km*1000)); }
    const c=randInt(5*D,40*D); return makeQ('Misure','input','Conversione di area','Converti '+c+' cm² in mm².',c*100,null,['×100 (cm²→mm²)'],String(c*100));
  },
  "Potenze": D => {
    const mode=randChoice(['calc','product','quotient','powerOfPower','tenPow','compare','expand','compress']);
    if(mode==='calc'){ const a=randChoice([2,3,4,5,6,7,8,9]); const e=randChoice([2,3,4]); return makeQ('Potenze','input','Calcola la potenza','Calcola '+a+'^'+e+'. Rispondi con un intero.', Math.pow(a,e), null, ['Moltiplica la base per se stessa e volte l’esponente'], String(Math.pow(a,e))); }
    if(mode==='product'){ const ab=randChoice([2,3,5,7]); const m=randInt(1,4), n=randInt(1,4); const ans=m+n; return makeQ('Potenze','input','Prodotto di potenze (stessa base)','Semplifica: '+ab+'^'+m+' · '+ab+'^'+n+' = '+ab+'^?', ans, null, ['Somma gli esponenti'], String(ans)); }
    if(mode==='quotient'){ const aq=randChoice([2,3,5,7]); const m2=randInt(2,5), n2=randInt(1,m2-1); const ans2=m2-n2; return makeQ('Potenze','input','Quoziente di potenze (stessa base)','Semplifica: '+aq+'^'+m2+' : '+aq+'^'+n2+' = '+aq+'^?', ans2, null, ['Sottrai gli esponenti'], String(ans2)); }
    if(mode==='powerOfPower'){ const ap=randChoice([2,3,4,5]); const m3=randInt(2,4), n3=randInt(2,3); const ans3=m3*n3; return makeQ('Potenze','input','Potenza di potenza','('+ap+'^'+m3+')^'+n3+' = '+ap+'^?', ans3, null, ['Moltiplica gli esponenti'], String(ans3)); }
    if(mode==='tenPow'){ const n4=randInt(1,5); const ans4 = Math.pow(10,n4); return makeQ('Potenze','input','Potenze di 10','Calcola 10^'+n4+'.', ans4, null, ['Sposta la virgola di n posizioni a destra'], String(ans4)); }
    if(mode==='compare'){ const a5=randChoice([2,3,4,5]); const b5=randChoice([2,3,4,5]); const m5=randInt(2,5); const n5=randInt(2,5); const A=Math.pow(a5,m5), B=Math.pow(b5,n5); const correct = (A===B)?(a5+'^'+m5):(A>B?(a5+'^'+m5):(b5+'^'+n5)); const stem='Confronto tra potenze'; const meta='Quale è maggiore?'; const ch=[a5+'^'+m5, b5+'^'+n5, a5+'^'+n5, b5+'^'+m5]; return makeQ('Potenze','mc',stem,meta,correct, sanitizeChoices(stem+' '+meta, ch, correct), ['Calcola o ragiona'], correct); }
    if(mode==='expand'){ const a6=randChoice([2,3,4,5]); const e6=randInt(2,5); const correctStr = new Array(e6+1).join(String(a6)+' × ').slice(0,-3); const stem2='Espansione di una potenza'; const meta2='Espandi '+a6+'^'+e6+' come moltiplicazione ripetuta.'; return makeQ('Potenze','mc',stem2,meta2,correctStr, sanitizeChoices(stem2+' '+meta2, [correctStr, a6+'^'+e6, a6+' × '+a6+'^'+(e6-1), (a6+1)+' × '+a6+'^'+(e6-1)], correctStr), ['Ripeti la base e volte'], correctStr); }
    if(mode==='compress'){ const a7=randChoice([2,3,5,7]); const e7=randInt(2,5); const stem3='Scrittura compatta'; const meta3='Scrivi in forma di potenza: ' + new Array(e7+1).join(String(a7)+' × ').slice(0,-3); const correct2 = a7+'^'+e7; return makeQ('Potenze','mc',stem3,meta3,correct2, sanitizeChoices(stem3+' '+meta3, [correct2, a7+'^'+(e7-1), (a7+1)+'^'+e7, a7+'^'+(e7+1)], correct2), ['Conta quante volte ripeti la base'], correct2); }
  },
  "Radici": D => { const sq=randChoice([36,49,64,81,100,121,144,169]); return makeQ('Radici','input','Calcola la radice quadrata','√'+sq+'. Rispondi con un intero.', Math.sqrt(sq), null, ['Numero che al quadrato dà '+sq], String(Math.sqrt(sq))); },
  "Numero teoria": D => { const a=randInt(6*D,20*D), b=randInt(6*D,20*D); const mode=randChoice(['MCD','mcm']); if(mode==='MCD'){ const ans=gcd(a,b); return makeQ('Numero teoria','input','Massimo Comune Divisore','Trova MCD('+a+', '+b+'). Rispondi con un intero.', ans, null, ['Algoritmo di Euclide'], String(ans)); } const ans2=lcm(a,b); return makeQ('Numero teoria','input','Minimo comune multiplo','Trova mcm('+a+', '+b+'). Rispondi con un intero.', ans2, null, ['ab/MCD'], String(ans2)); },
  "Problemi": D => { const kmD=randInt(3,8), g=randInt(4,7), bonus=randInt(10,30); const base=kmD*g; const tot=dec(base*(1+bonus/100),2); return makeQ('Problemi','input','Problema su percentuali','Mia corre '+kmD+' km al giorno per '+g+' giorni. L\'ultimo giorno fa +'+bonus+'%. Quanti km totali? Arrotonda a 2 decimali.', tot, null, ['Totale base + bonus','Arrotonda a 2 decimali'], tot.toFixed(2)); },
  "Statistiche": D => {
    const fruits=['mele','pere','arance','banane']; const counts=fruits.map(()=>randInt(6*D,15*D));
    const listing = fruits.map((f,j)=>f.charAt(0).toUpperCase()+f.slice(1)+'='+counts[j]).join(', ');
    const variant=randChoice(['quanto-frutto','massimo','somma','differenza','vero-falso']);
    if(variant==='quanto-frutto'){ const i=randInt(0,3); const stem='Lettura di tabella'; const meta='Tabella: '+listing+'. Quante '+fruits[i]+'?'; const corr=String(counts[i]); const choices=[String(counts[i]),String(counts[i]+1),String(counts[i]-1),String(counts[(i+1)%4])]; return makeQ('Statistiche','mc',stem,meta,corr, sanitizeChoices(stem+' '+meta, choices, corr), ['Leggi il numero accanto alla voce richiesta'], corr); }
    if(variant==='massimo'){ const maxV=Math.max(...counts); const correct=fruits[counts.indexOf(maxV)]; const stem2='Trova il massimo'; const meta2='Tabella: '+listing+'. Quale frutto è il maggiore?'; return makeQ('Statistiche','mc',stem2,meta2,correct, sanitizeChoices(stem2+' '+meta2, fruits.slice(), correct), ['Confronta i valori e scegli il maggiore'], correct); }
    if(variant==='somma'){ let i2=randInt(0,3), j2=randInt(0,3); while(j2===i2) j2=randInt(0,3); const ans = counts[i2]+counts[j2]; return makeQ('Statistiche','input','Somma di due voci','Tabella: '+listing+'. Quante unità in totale di '+fruits[i2]+' e '+fruits[j2]+'?', ans, null, ['Somma i due valori'], String(ans)); }
    if(variant==='differenza'){ let i3=randInt(0,3), j3=randInt(0,3); while(j3===i3) j3=randInt(0,3); const ans2=Math.abs(counts[i3]-counts[j3]); return makeQ('Statistiche','input','Differenza tra voci','Tabella: '+listing+'. Quante unità in più tra '+fruits[i3]+' e '+fruits[j3]+'? (valore assoluto)', ans2, null, ['Calcola la differenza assoluta'], String(ans2)); }
    let i4=randInt(0,3), j4=randInt(0,3); while(j4===i4) j4=randInt(0,3);
    const isTrue = counts[i4]>counts[j4]; const stem3='Vero/Falso (confronto)'; const meta3='Tabella: '+listing+'. Vero o Falso: '+fruits[i4]+' sono più di '+fruits[j4]+'?'; const answer=isTrue?'Vero':'Falso'; return makeQ('Statistiche','mc',stem3,meta3,answer, sanitizeChoices(stem3+' '+meta3, ['Vero','Falso'], answer), ['Confronta i due numeri'], answer);
  }
};

/* ==== UI & stato ==== */
function setScreen(name){
  ['home','train','play','progress','settings'].forEach(id => $(id).classList.add('hidden'));
  $(name).classList.remove('hidden');
  state.screen=name;
  if(name==='play') renderBadges();
  if(name==='progress'){ renderBadgesList(); renderMastery(); }
  if(name==='home') renderHomeBadges();
  renderHeader();
}

function renderHeader(){
  const dl=$('diffLabel'); if(dl) dl.textContent=state.difficulty;
  const st=$('streak'); if(st) st.textContent=state.streak;
  const tl=$('topicLabel'); if(tl) tl.textContent = 'Allenamento: ' + (state.topicFilter || 'Tutti gli argomenti');
}

/* NEW: funzione idempotente per aggiornare i valori dell’overlay */
function updateOverlayFields(corToday, goal, accAll){
  const a=$('goalCount'), b=$('goalCountTot'), c=$('goalAcc');
  if(a) a.textContent = typeof corToday==='number' ? corToday : '';
  if(b) b.textContent = typeof goal==='number' ? goal : '';
  if(c) c.textContent = typeof accAll==='number' ? accAll : '';
}

function renderStats(){
  const corToday = todayHistory(state.history).filter(h=>h.ok).length;
  const accAll = state.answered? Math.round(100*state.correct/state.answered):0;

  $('correctToday').textContent = corToday;
  $('corToday2').textContent = corToday;
  $('goalSmall').textContent = state.dailyGoal;
  $('goalVal').textContent = state.dailyGoal;
  $('goalVal2').textContent = state.dailyGoal;
  $('totAns').textContent = state.answered;
  $('accTot').textContent = accAll+'%';

  const pct = Math.min(100, Math.round(100*corToday/Math.max(1,state.dailyGoal)));
  $('goalBar').style.width = pct+'%';
  $('goalBar2').style.width = pct+'%';
  const left = Math.max(0, state.dailyGoal - corToday);
  $('goalHint').textContent = left>0 ? ('Ti mancano '+left+' risposte corrette per l\'obiettivo di oggi.') : 'Obiettivo raggiunto!';
  $('goalNote').textContent = 'Se non completi oggi, domani salirà a circa '+Math.ceil(state.dailyGoal*1.10)+' (+10%)';
  $('daysDone').textContent = 'Giorni obiettivo completato: '+state.completions.length;

  // NEW: aggiorna sempre anche l’overlay (così non resta mai vuoto)
  updateOverlayFields(corToday, state.dailyGoal, accAll);
}

function makeQuestion(){
  const D=state.difficulty;
  if(state.topicFilter && Builders[state.topicFilter]) return Builders[state.topicFilter](D);
  const keys=Object.keys(Builders); return Builders[keys[Math.floor(Math.random()*keys.length)]](D);
}

function renderQuestion(){
  const q=makeQuestion(); state.question=q; state.input=''; state.answeredThis=false;
  setAccent(q.topic);
  $('topicLabel').textContent = 'Allenamento: ' + (state.topicFilter || 'Tutti gli argomenti');
  $('stem').textContent = q.stem; $('stemMeta').textContent = q.meta||'';
  $('feedback').innerHTML=''; const hints=$('hints'); hints.classList.add('hidden'); hints.textContent=(q.hints||[]).map(h=>'• '+h).join('\n');
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

function maybeCompleteGoal(){
  const corToday = todayHistory(state.history).filter(h=>h.ok).length;
  if(corToday >= state.dailyGoal && !state.goalShownToday){
    state.goalShownToday = true;
    const accAll = state.answered? Math.round(100*state.correct/state.answered):0;

    // NEW: valorizza SEMPRE i campi prima di mostrare l’overlay
    updateOverlayFields(corToday, state.dailyGoal, accAll);

    const key = dayKey();
    if(!state.completions.includes(key)) state.completions.push(key);
    addBadge('daily_hero','Daily Hero');
    addBadge('daily_goal_'+key, 'Obiettivo Giornaliero ('+key+')');
    save();

    const overlay=$('overlay'); overlay.classList.remove('hidden');
    let n=5; $('countdown').textContent=n;
    const int=setInterval(()=>{ n--; $('countdown').textContent=n; if(n<=0){ clearInterval(int); overlay.classList.add('hidden'); setScreen('home'); renderStats(); } },1000);
    $('btnHomeNow').onclick=()=>{ overlay.classList.add('hidden'); clearInterval(int); setScreen('home'); renderStats(); };
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
    $('feedback').innerHTML="<div class='ok'><b>Corretto!</b> Ben fatto.</div>";
    maybeCompleteGoal(); setTimeout(autoAdjustDifficulty,0);
    if(state.autoAdvance){ setTimeout(renderQuestion,900); }
  } else {
    state.streak=0;
    $('feedback').innerHTML="<div class='bad'><b>Non è corretto.</b> Proviamo insieme.<br><br><b>Soluzione attesa:</b> "+state.question.solution+(state.question.meta?("<br><br><b>Richiesta:</b> "+state.question.meta):"")+"</div>";
    setTimeout(autoAdjustDifficulty,0);
  }

  state.history.push({
    topic: state.question.topic, type: state.question.type, stem: state.question.stem, meta: state.question.meta,
    given: state.input, answer: state.question.answer, ok, ts: Date.now(), diff: state.difficulty
  });

  state.answeredThis=true;
  $('btnNext').disabled=false;
  renderStats(); save(); ensureCatalogBadges(); renderHomeBadges(); renderMastery();
}

function nextQuestion(){ renderQuestion(); }
function toggleHint(){ const h=$('hints'); h.classList.toggle('hidden'); }
function similar(){ if(!state.question) return; renderQuestion(); }

function addBadge(id,label){ if(state.badges.some(b=>b.id===id)) return; state.badges.push({id,label,ts:Date.now()}); save(); renderBadges(); renderBadgesList(); renderHomeBadges(); }
function renderBadges(){
  const c=$('badges'); if(!c) return; c.innerHTML='';
  if(!state.badges.length){ c.innerHTML="<span class='kicker'>Nessun badge ancora — completa l'obiettivo giornaliero!</span>"; return; }
  state.badges.slice().reverse().forEach(b=>{
    const el=document.createElement('div'); el.className='badge'; el.innerHTML='🏅 <b>'+b.label+'</b>'; c.appendChild(el);
  });
}
function renderBadgesList(){
  const c=$('badgesList'); if(!c) return; c.innerHTML='';
  if(!state.badges.length){ c.innerHTML='<div class="kicker">Nessun badge ancora</div>'; return; }
  state.badges.slice().reverse().forEach(b=>{
    const date=new Date(b.ts).toLocaleDateString();
    const row=document.createElement('div'); row.className='card'; row.innerHTML='<div><b>🏅 '+b.label+'</b></div><div class="kicker">'+date+'</div>'; c.appendChild(row);
  });
}
function progressPercent(text){
  const xy = String(text).match(/(\d+)\s*\/\s*(\d+)/);
  if(xy){ const num=Number(xy[1]), den=Number(xy[2]); return Math.max(0,Math.min(100, Math.round(100*num/den))); }
  const pc = String(text).match(/(\d+)\s*%/);
  if(pc){ const val=Number(pc[1]); const m = String(text).match(/\/\s*(\d+)\s*%/); const needed = m? Number(m[1]) : 100; return Math.max(0,Math.min(100, Math.round(100*val/needed))); }
  return 0;
}
const badgeCatalog = [
  { id:'daily_hero', label:'Daily Hero', cat:'Progressi', desc:'Completa l’obiettivo giornaliero una volta.',
    check:S=> S.completions.length>=1, progress:S=> String(Math.min(1,S.completions.length))+'/1' },
  { id:'streak_3', label:'Streak 3 giorni', cat:'Progressi', desc:'Completa l’obiettivo per 3 giorni di fila.',
    check:S=> streakInfo(S.completions).best>=3, progress:S=> String(Math.min(3,streakInfo(S.completions).best))+'/3' },
  { id:'streak_5', label:'Streak 5 giorni', cat:'Progressi', desc:'Completa l’obiettivo per 5 giorni di fila.',
    check:S=> streakInfo(S.completions).best>=5, progress:S=> String(Math.min(5,streakInfo(S.completions).best))+'/5' }
];
function streakInfo(days){
  const set={}; days.forEach(d=>set[d]=true);
  const arr=Object.keys(set).sort();
  let best=0,cur=0,prev=null;
  arr.forEach(d=>{
    if(prev){
      const n=new Date(prev); n.setDate(n.getDate()+1);
      const y=n.getFullYear(), m=('0'+(n.getMonth()+1)).slice(-2), da=('0'+n.getDate()).slice(-2);
      const nextKey
