let players = {};
let projectiles = [];
let lifeStealQueue = [];
let activeLifeStealStacks = [];
let lifeStealEffects = [];
const MAX_ACTIVE_LIFE_STEAL_STACKS = 2;

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

    heartShots: 0,
    heartShotInterval: 300,
    nextHeartShotAt: 0,
    heartNoTargetBurstDone: false,

    el: div,
    hpDiv: hp,
  };
}

function getRandomTarget(shooter) {
  let targets = Object.values(players).filter(
    (p) => p.user !== shooter.user && p.hp > 0,
  );

  if (targets.length === 0) return null;

  return targets[Math.floor(Math.random() * targets.length)];
}

function shootProjectile(shooter) {
  const target = getRandomTarget(shooter);

  if (!target) return false;

  projectiles.push({
    shooterUser: shooter.user,
    targetUser: target.user,
    x: shooter.x + 50,
    y: shooter.y + 50,
    vx: 0,
    vy: 0,
    speed: 26,
    damage: 1,
    homing: true,
  });

  return true;
}

function shootNoTargetBurst(shooter) {
  const total = 12; // quantidade de projéteis na onda

  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * 2 * i) / total;

    projectiles.push({
      shooterUser: shooter.user,
      targetUser: null,
      x: shooter.x + 50,
      y: shooter.y + 50,
      vx: Math.cos(angle) * 18,
      vy: Math.sin(angle) * 18,
      speed: 18,
      damage: 0,
      homing: false,
      life: 30,
    });
  }
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];

    // PROJÉTIL SEM ALVO (visual aleatório)
    if (!proj.homing) {
      proj.x += proj.vx;
      proj.y += proj.vy;

      proj.life -= 1;

      if (
        proj.life <= 0 ||
        proj.x < -50 ||
        proj.x > 1100 ||
        proj.y < -50 ||
        proj.y > 1950
      ) {
        projectiles.splice(i, 1);
      }

      continue;
    }

    // PROJÉTIL COM ALVO
    const target = players[proj.targetUser];

    // Se o alvo sumiu ou morreu, o projétil vira aleatório e continua visualmente
    if (!target || target.hp <= 0) {
      const angle = Math.random() * Math.PI * 2;

      proj.homing = false;
      proj.targetUser = null;
      proj.vx = Math.cos(angle) * 18;
      proj.vy = Math.sin(angle) * 18;
      proj.life = 25;

      continue;
    }

    const targetX = target.x + 50;
    const targetY = target.y + 50;

    const dx = targetX - proj.x;
    const dy = targetY - proj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= proj.speed) {
      if (target.shield > 0) {
        floating(target, "BLOCK", "blue");
      } else {
        target.hp -= proj.damage;
        target.hpDiv.innerText = "❤️ " + target.hp;
        floating(target, "-1", "red");

        const shooter = players[proj.shooterUser];

        if (target.hp <= 0) {
          kill(target, shooter || null);
        }
      }

      projectiles.splice(i, 1);
      continue;
    }

    proj.x += (dx / dist) * proj.speed;
    proj.y += (dy / dist) * proj.speed;
  }
}
function renderProjectiles() {
  document.querySelectorAll(".projectile").forEach((el) => el.remove());

  for (const proj of projectiles) {
    const el = document.createElement("div");
    el.className = "projectile";
    el.style.left = proj.x + "px";
    el.style.top = proj.y + "px";
    game.appendChild(el);
  }
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

    const now = Date.now();

    if (p.heartShots > 0 && now >= p.nextHeartShotAt) {
      const hasTarget = getRandomTarget(p);

      if (hasTarget) {
        const fired = shootProjectile(p);

        if (fired) {
          p.heartShots -= 1;
          p.heartNoTargetBurstDone = false;
        }

        p.nextHeartShotAt = now + p.heartShotInterval;
      } else {
        if (!p.heartNoTargetBurstDone) {
          shootNoTargetBurst(p);
          p.heartNoTargetBurstDone = true;
        }

        p.nextHeartShotAt = now + p.heartShotInterval;
      }
    }

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

  if (typeof updateHandHeartSystem === "function") {
    updateHandHeartSystem();
  }

  collision();
  updateProjectiles();
  renderProjectiles();

  if (typeof renderLifeStealEffects === "function") {
    renderLifeStealEffects();
  }

  requestAnimationFrame(update);
}

window.players = players;
window.projectiles = projectiles;
window.spawn = spawn;
window.update = update;

requestAnimationFrame(update);
