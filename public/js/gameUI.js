let floatingStack = {};
let confettiInterval = null;

/* FLOATING */

function floating(player, text, color) {
  if (!floatingStack[player.user]) floatingStack[player.user] = 0;

  floatingStack[player.user]++;

  let offset = floatingStack[player.user] * 40;

  let el = document.createElement("div");

  el.className = "floating " + color;
  el.innerText = text;

  el.style.left = player.x + 50 + "px";
  el.style.top = player.y - offset + "px";

  game.appendChild(el);

  setTimeout(() => {
    el.remove();
    floatingStack[player.user]--;
  }, 900);
}

/* PODIO */

function showPodium(top) {
  const podium = document.getElementById("podium");
  const row = document.getElementById("podiumRow");

  row.innerHTML = "";

  /* ORDEM VISUAL: 2º 1º 3º */

  let order = [1, 0, 2];

  order.forEach((pos) => {
    let p = top[pos];
    if (!p) return;

    let div = document.createElement("div");

    let cls = ["first", "second", "third"][pos];

    div.className = "podiumPlayer " + cls;

    div.innerHTML = `<img src="${p.photo}">
<div class="podiumName">${p.user}</div>
<div class="podiumHP">❤️ ${p.hp}</div>`;

    row.appendChild(div);
  });

  podium.style.display = "flex";

  /* REGISTRAR CAMPEÃO */

  if (top.length > 0) {
    socket.send(
      JSON.stringify({
        type: "champion",
        user: top[0].user,
        photo: top[0].photo,
      }),
    );
  }

  confetti();

  setTimeout(() => {
    podium.style.display = "none";

    clearInterval(confettiInterval);
    confettiInterval = null;

    resetGame();
  }, 7000);
}

/* CONFETTI */

function confetti() {
  if (confettiInterval) {
    clearInterval(confettiInterval);
  }

  let podium = document.getElementById("podium");

  confettiInterval = setInterval(() => {
    for (let i = 0; i < 100; i++) {
      let c = document.createElement("div");

      c.className = "confetti";

      c.style.left = Math.random() * 100 + "%";

      c.style.top = "-200px";

      c.style.background = [
        "#ff4d4d",
        "#ffd700",
        "#00bfff",
        "#00ff88",
        "#ff66ff",
      ][Math.floor(Math.random() * 5)];

      c.style.animationDuration = 3 + Math.random() * 4 + "s";

      podium.appendChild(c);

      setTimeout(() => c.remove(), 6000);
    }
  }, 300);
}

/* TOP WINNERS */

function updateTop(data) {
  const list = document.getElementById("winnerList");
  list.innerHTML = "";

  data.forEach((p) => {
    let row = document.createElement("div");
    row.className = "winnerRow";

    row.innerHTML = `<img src="${p.photo}">
<span>${p.user}</span>
<b>🏆 ${p.wins}</b>`;

    list.appendChild(row);
  });
}

window.floating = floating;
window.showPodium = showPodium;
window.confetti = confetti;
window.updateTop = updateTop;
