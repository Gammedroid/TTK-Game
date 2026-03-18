const socket = new WebSocket("ws://127.0.0.1:3000");

const game = document.getElementById("game");

/* RECEBER EVENTOS */

socket.onmessage = (e) => {
  let data = JSON.parse(e.data);

  console.log("CHEGOU:", data);

  if (data.type === "enter") {
    // Se o jogador já estiver vivo, ignora
    if (players[data.user]) return;

    // Só bloqueia novos joins quando restarem 15 segundos ou menos
    if (!allowJoin && matchTime <= 15) return;

    spawn(data.user, data.photo);
  }

  if (data.type === "shield") {
    addShield(data.user, data.seconds);
  }

  if (data.type === "hp") {
    addHP(data.user, data.hp);
  }

  if (data.type === "heartPower") {
    activateHeartPower(data.user, data.shots, data.interval);
  }

  if (data.type === "handHeart") {
    queueHandHeartPower(
      data.user,
      data.stacks,
      data.beams,
      data.hitsPerBeam,
      data.interval,
    );
  }

  if (data.type === "topWinners") {
    updateTop(data.data);
  }
};
