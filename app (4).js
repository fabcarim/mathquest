/* MathQuest – app.js v18.3 (render domanda+risposte visibili) */
(function(){
  // ===== Util =====
  function $(id){ return document.getElementById(id); }
  function el(tag, attrs, children){
    var n = document.createElement(tag);
    if(attrs){ Object.keys(attrs).forEach(function(k){
      if(k === 'class') n.className = attrs[k];
      else if(k === 'text') n.textContent = attrs[k];
      else if(k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });}
    if(children){ children.forEach(function(c){ n.appendChild(c); }); }
    return n;
  }
  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

  var state = {
    screen:'home',
    difficulty: 2,
    q: null,               // {prompt, type:'mc'|'input', correct, choices?}
    selected: null,
    streak:0,
    correctToday:0,
    dailyGoal:20
  };

  // ====== Screens ======
  function show(id){
    ['home','train','play'].forEach(function(s){
      var elx = $(s);
      if(!elx) return;
      if(s===id){ elx.classList.remove('hidden'); }
      else { elx.classList.add('hidden'); }
    });
    if(id==='play'){
      if(!state.q) newQuestion(); // genera subito
      renderQuestion();
    }
    window.scrollTo(0,0);
  }

  // ====== Generator semplice ======
  function genArithmetic(d){
    // d=1 facile, d=2 medio, d=3 difficile
    var max = d===1?10:(d===2?20:50);
    var a = randInt(1,max), b = randInt(1,max);
    var ops = ['+','-','×','÷'];
    var op = ops[randInt(0,ops.length-1)];
    var correct, prompt, meta='';

    if(op==='+'){ correct = a + b; prompt = a+' + '+b; }
    else if(op==='-'){ correct = a - b; prompt = a+' − '+b; }
    else if(op==='×'){ correct = a * b; prompt = a+' × '+b; }
    else { // divisione con resto zero (scegli multiplo)
      correct = randInt(2,10);
      b = randInt(2,10);
      a = correct * b;
      prompt = a+' ÷ '+b;
    }

    // multiple choice 4 opzioni
    var choices = [correct];
    while(choices.length<4){
      var delta = randInt(1, d===3?7:4) * (Math.random()<0.5?-1:1);
      var cand = correct + delta;
      if(choices.indexOf(cand)===-1) choices.push(cand);
    }
    shuffle(choices);

    return { prompt: prompt, type:'mc', correct: correct, choices: choices, meta: meta };
  }

  function newQuestion(){
    var d = state.difficulty;
    state.q = genArithmetic(d);
    state.selected = null;
  }

  // ====== Render ======
  function renderQuestion(){
    var stem = $('stem'), meta = $('stemMeta'), ans = $('answerUI'), fb = $('feedback'), hints = $('hints');
    if(!stem || !ans) return;

    stem.textContent = state.q.prompt;
    meta.textContent = 'Scegli la risposta corretta';
    fb.innerHTML = '';
    hints.classList.add('hidden');
    ans.innerHTML = '';

    if(state.q.type==='mc'){
      var wrap = el('div', {'class':'grid-choices'}, []);
      state.q.choices.forEach(function(val){
        var btn = el('button', {'class':'choice', 'data-value': String(val), 'type':'button', 'text': String(val)});
        wrap.appendChild(btn);
      });
      ans.appendChild(wrap);
    }else{
      var inp = el('input', {'class':'answer', 'type':'number', 'id':'answerInput', 'inputmode':'numeric'});
      ans.appendChild(inp);
      setTimeout(function(){ inp.focus(); }, 50);
    }

    $('btnNext').disabled = true;
  }

  // ====== Answer handling ======
  function selectChoice(btn){
    var parent = btn.parentNode;
    Array.prototype.forEach.call(parent.querySelectorAll('.choice'), function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    state.selected = btn.getAttribute('data-value');
  }

  function checkAnswer(){
    var user;
    if(state.q.type==='mc'){
      user = state.selected;
      if(user==null){ toast('Seleziona una risposta'); return false; }
    }else{
      var inp = $('answerInput');
      user = inp ? inp.value : '';
      if(user===''){ toast('Inserisci una risposta'); return false; }
    }
    var isCorrect = Number(user) === Number(state.q.correct);
    var fb = $('feedback');
    fb.innerHTML = isCorrect
      ? '<div class="ok">✅ Corretto!</div>'
      : '<div class="bad">❌ Non esatto. Risposta: <b>'+state.q.correct+'</b></div>';
    $('btnNext').disabled = false;
    if(isCorrect){ state.streak++; state.correctToday++; } else { state.streak = 0; }
    updateProgress();
    return isCorrect;
  }

  function updateProgress(){
    var g1 = $('goalBar'), g2 = $('goalBar2'), c1 = $('correctToday'), c2 = $('corToday2'), gSmall=$('goalSmall'), gVal=$('goalVal'), gVal2=$('goalVal2');
    if(c1) c1.textContent = String(state.correctToday);
    if(c2) c2.textContent = String(state.correctToday);
    if(gSmall) gSmall.textContent = String(state.dailyGoal);
    if(gVal) gVal.textContent = String(state.dailyGoal);
    if(gVal2) gVal2.textContent = String(state.dailyGoal);
    var pct = Math.max(0, Math.min(100, Math.floor((state.correctToday/state.dailyGoal)*100)));
    [g1,g2].forEach(function(bar){ if(bar) bar.style.width = pct+'%'; });
    var streakLbl = $('streak'); if(streakLbl) streakLbl.textContent = String(state.streak);
  }

  function toast(text){
    var fb = $('feedback');
    if(!fb) return;
    fb.innerHTML = '<div class="ok">'+text+'</div>';
    setTimeout(function(){ if(fb) fb.innerHTML=''; }, 1000);
  }

  // ====== Event delegation ======
  function bindClicks(){
    document.addEventListener('click', function(e){
      var t = e.target;
      if(!(t instanceof Element)) return;
      var id = t.id;

      // nav
      if(id==='btnHome'){ e.preventDefault(); show('home'); return; }
      if(id==='btnPlay'){ e.preventDefault(); show('play'); return; }
      if(id==='btnTrain'){ e.preventDefault(); show('train'); return; }

      if(id==='startQuick'){ e.preventDefault(); show('play'); newQuestion(); renderQuestion(); toast('Via!'); return; }
      if(id==='trainGo'){ e.preventDefault(); show('play'); newQuestion(); renderQuestion(); return; }

      // choices
      if(t.classList.contains('choice')){ e.preventDefault(); selectChoice(t); return; }

      // answer flow
      if(id==='btnConfirm'){ e.preventDefault(); checkAnswer(); return; }
      if(id==='btnNext'){ e.preventDefault(); newQuestion(); renderQuestion(); return; }

      if(id==='btnHint'){ e.preventDefault(); var h=$('hints'); h.textContent='Suggerimento: prova a scomporre il calcolo.'; h.classList.remove('hidden'); return; }
      if(id==='btnSimilar'){ e.preventDefault(); toast('Esempio simile: tra poco!'); return; }
      if(id==='btnHomeNow'){ e.preventDefault(); show('home'); return; }
    }, {passive:false});
  }

  function boot(){
    bindClicks();
    updateProgress();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();