let players = {};

/* SPAWN */

function spawn(user, photo) {
  if (players[user]) return;

  if (!musicStarted) {
    musicStarted = true;
    music.volume = 0.35;
    music.play().catch(() => {
      document.body.addEventListener(
        "click",
        () => {
          music.play();
        },
        { once: true },
      );
    });
  }

  let div = document.createElement("div");
  div.className = "player";
  div.style.backgroundImage = `url(${photo})`;

  let name = document.createElement("div");
  name.className = "name";
  name.innerText = user;

  let hp = document.createElement("div");
  hp.className = "hp";
  hp.innerText = "❤️ 10";

  div.appendChild(name);
  div.appendChild(hp);

  game.appendChild(div);

  players[user] = {
    user: user,
    photo: photo,
    hp: 10,
    shield: 0,

    x: Math.random() * 900,
    y: Math.random() * 1700,

    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.5) * 12,

    el: div,
    hpDiv: hp,
  };
}

/* COLISOES */

function collision() {
  let list = Object.values(players);

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      let a = list[i];
      let b = list[j];

      let dx = a.x - b.x;
      let dy = a.y - b.y;

      let dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 130) {
        let aShield = a.shield > 0;
        let bShield = b.shield > 0;

        if (!aShield) {
          a.hp--;
          floating(a, "-1", "red");
        } else floating(a, "1", "blue");

        if (!bShield) {
          b.hp--;
          floating(b, "-1", "red");
        } else floating(b, "1", "blue");

        a.hpDiv.innerText = "❤️ " + a.hp;
        b.hpDiv.innerText = "❤️ " + b.hp;

        let angle = Math.atan2(dy, dx);
        let force = 20;

        a.vx = Math.cos(angle) * force;
        a.vy = Math.sin(angle) * force;

        b.vx = -Math.cos(angle) * force;
        b.vy = -Math.sin(angle) * force;

        if (a.hp <= 0) kill(a, b);
        if (b.hp <= 0) kill(b, a);
      }
    }
  }
}

/* UPDATE LOOP */

function update() {
  for (let id in players) {
    let p = players[id];

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) {
      p.x = 0;
      p.vx *= -1;
    }
    if (p.x > 950) {
      p.x = 950;
      p.vx *= -1;
    }
    if (p.y < 0) {
      p.y = 0;
      p.vy *= -1;
    }
    if (p.y > 1800) {
      p.y = 1800;
      p.vy *= -1;
    }

    p.el.style.left = p.x + "px";
    p.el.style.top = p.y + "px";

    if (p.shield > 0) {
      p.shield -= 1 / 60;

      if (p.shield <= 0) {
        p.el.classList.remove("shield");
      }
    }
  }

  collision();

  requestAnimationFrame(update);
}

window.players = players;
window.spawn = spawn;
window.update = update;

update()
