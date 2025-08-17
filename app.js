// app.js

// Stato iniziale dei progressi e risposte
let progress = {
  correct: 0,
  total: 0,
  topics: {}
};

// Funzione per caricare progressi dal localStorage
function loadProgress() {
  const saved = localStorage.getItem("mathquest-progress");
  if (saved) {
    progress = JSON.parse(saved);
  }
  updateUI();
}

// Funzione per salvare i progressi
function saveProgress() {
  localStorage.setItem("mathquest-progress", JSON.stringify(progress));
}

// Funzione di aggiornamento UI
function updateUI() {
  document.getElementById("correctToday").innerText = progress.correct;
  document.getElementById("totalToday").innerText = progress.total;

  // Aggiorna barra di avanzamento
  const percent = progress.total > 0 ? (progress.correct / progress.total) * 100 : 0;
  document.getElementById("progressBar").style.width = percent + "%";

  // Aggiorna comprensione per argomento
  const topicsContainer = document.getElementById("topics-level");
  if (topicsContainer) {
    topicsContainer.innerHTML = "";
    Object.keys(progress.topics).forEach(topic => {
      const score = Math.round(progress.topics[topic] * 100);
      const div = document.createElement("div");
      div.className = "topic-score";
      div.innerText = `${topic}: ${score}% comprensione`;
      topicsContainer.appendChild(div);
    });
  }
}

// Funzione per registrare risposta
function recordAnswer(topic, isCorrect) {
  progress.total++;
  if (isCorrect) {
    progress.correct++;
    progress.topics[topic] = progress.topics[topic] ? Math.min(progress.topics[topic] + 0.05, 1) : 0.5;
  } else {
    progress.topics[topic] = progress.topics[topic] ? Math.max(progress.topics[topic] - 0.05, 0) : 0.2;
  }
  saveProgress();
  updateUI();
}

// Inizializza all’avvio
document.addEventListener("DOMContentLoaded", () => {
  loadProgress();

  // Esempio click su opzioni (puoi adattare con logica vera delle domande)
  document.querySelectorAll(".option").forEach(btn => {
    btn.addEventListener("click", () => {
      const isCorrect = Math.random() > 0.5; // simulazione
      recordAnswer("Frazioni", isCorrect);
      alert(isCorrect ? "Corretto!" : "Sbagliato!");
    });
  });
});