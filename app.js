/* MathQuest – app.js v18.1 (no optional chaining; delega click; overlay via style) */
function $(id){ return document.getElementById(id); }
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function gcd(a,b){ return b ? gcd(b, a%b) : Math.abs(a); }
function lcm(a,b){ return Math.abs(a*b)/gcd(a,b); }
function dec(x,p){ p=(p==null?2:p); return Number.parseFloat(x.toFixed(p)); }
function approxEqual(a,b,eps){ eps=(eps==null?1e-6:eps); return Math.abs(Number(a)-Number(b))<=eps; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function dayKey(ts){ var d=new Date(ts||Date.now()); var m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2); return d.getFullYear()+"-"+m+"-"+dd; }

var topicAccent = {
  "Calcolo interi":"#2563eb","Decimali":"#0ea5e9","Frazioni":"#10b981","Percentuali":"#f59e0b",
  "Proporzioni":"#ec4899","Equazioni":"#7c3aed","Geometria":"#059669","Misure":"#0ea5e9",
  "Potenze":"#ef4444","Radici":"#8b5cf6","Numero teoria":"#22c55e","Problemi":"#f97316","Statistiche":"#14b8a6"
};
function setAccent(topic){ var c = topicAccent[topic] || "#2563eb"; document.documentElement.style.setProperty('--accent', c); }

var topicsList = ["Calcolo interi","Decimali","Frazioni","Percentuali","Proporzioni","Equazioni","Geometria","Misure","Potenze","Radici","Numero teoria","Problemi","Statistiche"];

var state = {
  screen:'home', difficulty:2, topicFilter:null,
  question:null, input:'', answeredThis:false, streak:0,
  answered:0, correct:0, history:[],
  autoAdvance:true, autoConfirmMC:true, autoDiff:true,
  dailyGoal:20, lastDailyGoal:20, lastDayKey:null, goalShownToday:false,
  completions:[]
};

function save(){ try{ localStorage.setItem('mqLiteState', JSON.stringify(state)); }catch(e){} }
function load(){
  var raw = null; try{ raw = localStorage.getItem('mqLiteState'); }catch(e){}
  if(!raw) return;
  try{
    var s=JSON.parse(raw);
    state.answered=s.answered||0; state.correct=s.correct||0; state.streak=s.streak||0;
    state.difficulty=(s.difficulty==null?2:s.difficulty);
    state.autoAdvance=(s.autoAdvance!==false); state.autoConfirmMC=(s.autoConfirmMC!==false); state.autoDiff=(s.autoDiff!==false);
    state.dailyGoal=s.dailyGoal||20; state.lastDailyGoal=s.lastDailyGoal||20;
    state.lastDayKey=s.lastDayKey||null; state.goalShownToday=!!s.goalShownToday;
    state.completions=s.completions||[]; state.topicFilter=s.topicFilter||null;
    state.history=s.history||[];
  }catch(e){ console.warn('load failed', e); }
}
function todayHistory(){ var k=dayKey(); return state.history.filter(function(h){ return dayKey(h.ts)===k; }); }
function rollDailyGoal(){
  var today = dayKey();
  var prevKey = state.lastDayKey;
  if(prevKey && prevKey!==today){
    var prevCorrect = state.history.filter(function(h){ return dayKey(h.ts)===prevKey && h.ok; }).length;
    var prevGoal = state.lastDailyGoal||20;
    var completed = prevCorrect >= prevGoal;
    var newGoal = completed ? 20 : clamp(Math.ceil(prevGoal*1.10),10,100);
    state.dailyGoal=newGoal; state.lastDailyGoal=newGoal; state.goalShownToday=false;
    if(completed && state.completions.indexOf(prevKey)===-1) state.completions.push(prevKey);
  }
  state.lastDayKey = today;
  save();
}

/* ===== Overlay ===== */
function updateOverlayFields(corToday, goal, accAll){
  var
