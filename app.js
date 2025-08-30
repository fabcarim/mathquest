/* MathQuest – app.js v18.2 (fix: clean code, event binding, simple screens) */
(function(){
  function $(id){ return document.getElementById(id); }
  function qs(sel){ return document.querySelector(sel); }
  function show(id){
    ['home','train','play'].forEach(function(s){
      var el = $(s);
      if(!el) return;
      if(s===id){ el.classList.remove('hidden'); }
      else { el.classList.add('hidden'); }
    });
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function toast(text){
    var fb = $('feedback');
    if(!fb) return;
    fb.innerHTML = '<div class="ok">'+text+'</div>';
    setTimeout(function(){ fb.innerHTML=''; }, 1200);
  }

  function bindClicks(){
    var m = {
      btnHome: function(){ show('home'); },
      btnPlay: function(){ show('play'); toast('Modalità Gioco pronta'); },
      btnTrain: function(){ show('train'); },
      btnProg: function(){ alert('Sezione Progressi: WIP'); },
      btnSettings: function(){ alert('Impostazioni: WIP'); },
      startQuick: function(){ show('play'); toast('Via! Domanda generata'); },
      startTrain: function(){ show('train'); },
      clearTopic: function(){ alert('Filtro rimosso'); },
      trainGo: function(){ show('play'); toast('Allenamento avviato'); },
      resetTopic: function(){ alert('Argomento resettato'); },
      btnConfirm: function(){
        $('btnNext').disabled = false;
        toast('Risposta controllata');
      },
      btnNext: function(){
        this.disabled = true;
        toast('Nuova domanda pronta');
      },
      btnHint: function(){
        var h = $('hints');
        h.classList.remove('hidden');
        h.textContent = 'Suggerimento: ragiona a piccoli passi.';
      },
      btnSimilar: function(){ alert('Esempio simile in arrivo (mock)'); },
      btnHomeNow: function(){ show('home'); }
    };

    document.addEventListener('click', function(e){
      var id = (e.target && e.target.id) ? e.target.id : null;
      if(id && m[id]){
        e.preventDefault();
        m[id].call(e.target, e);
      }
    }, {passive:false});
  }

  function boot(){
    bindClicks();
    // inizializza qualche testo UI
    var goalVal = $('goalVal'); var goalVal2 = $('goalVal2');
    if(goalVal) goalVal.textContent = '20';
    if(goalVal2) goalVal2.textContent = '20';
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
