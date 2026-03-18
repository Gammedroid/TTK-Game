/* HP */

function addHP(user, hp) {
  let p = players[user];
  if (!p) return;

  p.hp += hp;
  p.hpDiv.innerText = "❤️ " + p.hp;

  floating(p, "+" + hp, "green");
}

/* ESCUDO */

function addShield(user, seconds) {
  let p = players[user];
  if (!p) return;

  p.shield += seconds;
  p.el.classList.add("shield");
}

/* MORTE */

function kill(dead, killer) {
  socket.send(
    JSON.stringify({
      type: "dead",
      user: dead.user,
    }),
  );

  dead.el.remove();

  delete players[dead.user];

  if (killer) {
    killer.hp += 10;
    killer.hpDiv.innerText = "❤️ " + killer.hp;
    floating(killer, "+10", "green");
  }
}

window.addHP = addHP;
window.addShield = addShield;
window.kill = kill;
