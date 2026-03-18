let timerEl = document.getElementById("timer");

let joinAttempts = {};

/* MUSICA */

const music = document.getElementById("music");
let musicStarted = false;


/* TIMER PARTIDA */

let matchTime = 300;
let allowJoin = true;
let matchEnded = false;

let timerInterval = null;

function drawTimer() {
  let m = Math.floor(matchTime / 60);
  let s = matchTime % 60;

  timerEl.innerText =
    String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function updateTimer() {
    drawTimer();

  if (matchTime === 15) {
    allowJoin = false;
  }

  if (matchTime <= 0) {
    endMatch();
    return;
  }

  matchTime--;
}

drawTimer();

/* FIM PARTIDA */

function endMatch() {
  if (matchEnded) return;
  matchEnded = true;
  clearInterval(timerInterval);

  let ranking = Object.values(players);

  if (ranking.length === 0) return;

  ranking.sort((a, b) => b.hp - a.hp);

  let top = ranking.slice(0, 3).map((p) => ({
    user: p.user,
    photo: p.photo,
    hp: p.hp,
  }));

  showPodium(top);
}

function resetGame() {
  clearInterval(timerInterval);
  clearInterval(confettiInterval);

  for (let id in players) {
    players[id].el.remove();
  }

  clearHandHeartSystem();
  players = {};
  projectiles = [];
  floatingStack = {};
  joinAttempts = {};

  matchTime = 300;
  allowJoin = true;
  matchEnded = false;

  drawTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

if (!timerInterval) {
  timerInterval = setInterval(updateTimer, 1000);
}

window.endMatch = endMatch;
window.resetGame = resetGame;
