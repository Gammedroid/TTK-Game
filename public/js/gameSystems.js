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

function activateHeartPower(user, shots = 5, interval = 300) {
  let p = players[user];
  if (!p) return;

  const now = Date.now();

  p.heartShots = Number(p.heartShots || 0) + Number(shots || 0);
  p.heartShotInterval = interval;
  p.nextHeartShotAt = now;

  floating(p, `HEART x${shots}`, "green");

  console.log(`❤️ ${user} recebeu ${shots} tiros do Heart`);
}

function createHandHeartStack(user, beams = 3, hitsPerBeam = 5, interval = 500) {
  return {
    casterUser: user,
    interval: interval,
    nextTickAt: 0,
    beams: Array.from({ length: beams }, (_, index) => ({
      id: index,
      remainingHits: hitsPerBeam,
      targetUser: null,
    })),
    reservedTargets: {},
  };
}

function queueHandHeartPower(user, stacks = 1, beams = 3, hitsPerBeam = 5, interval = 500) {
  const caster = players[user];
  if (!caster) return;

  const totalStacks = Number(stacks || 1);

  for (let i = 0; i < totalStacks; i++) {
    lifeStealQueue.push(createHandHeartStack(user, beams, hitsPerBeam, interval));
  }

  floating(caster, `HAND x${totalStacks}`, "green");
  console.log(`⚡ ${user} recebeu ${totalStacks} stack(s) de Hand Heart`);
}

function getAvailableLifeStealTargets(casterUser, reservedTargets) {
  return Object.values(players).filter(
    (p) => p.user !== casterUser && p.hp > 0 && !reservedTargets[p.user],
  );
}

function createLifeStealEffect(caster, target) {
  lifeStealEffects.push({
    x1: caster.x + 65,
    y1: caster.y + 65,
    x2: target.x + 65,
    y2: target.y + 65,
    expiresAt: Date.now() + 140,
  });
}

function updateHandHeartSystem() {
  const now = Date.now();

  // Preenche vagas livres com stacks da fila
  while (
    activeLifeStealStacks.length < MAX_ACTIVE_LIFE_STEAL_STACKS &&
    lifeStealQueue.length > 0
  ) {
    const nextStack = lifeStealQueue.shift();
    nextStack.nextTickAt = now;
    activeLifeStealStacks.push(nextStack);
  }

  if (activeLifeStealStacks.length === 0) return;

  for (let stackIndex = activeLifeStealStacks.length - 1; stackIndex >= 0; stackIndex--) {
    const stack = activeLifeStealStacks[stackIndex];

    if (now < stack.nextTickAt) continue;

    const caster = players[stack.casterUser];

    // Se o conjurador morreu/sumiu, encerra esse stack
    if (!caster || caster.hp <= 0) {
      activeLifeStealStacks.splice(stackIndex, 1);
      continue;
    }

    let hasWaitingBeam = false;

    for (const beam of stack.beams) {
      if (beam.remainingHits <= 0) continue;

      let target = beam.targetUser ? players[beam.targetUser] : null;

      // Se o alvo atual morreu ou sumiu, solta o vínculo atual,
      // mas NÃO remove de reservedTargets.
      if (!target || target.hp <= 0) {
        beam.targetUser = null;
        target = null;
      }

      // Se este raio não tem alvo, tenta achar um novo ainda não usado por ESTE stack
      if (!beam.targetUser) {
        const availableTargets = getAvailableLifeStealTargets(
          caster.user,
          stack.reservedTargets,
        );

        if (availableTargets.length > 0) {
          target =
            availableTargets[
              Math.floor(Math.random() * availableTargets.length)
            ];

          beam.targetUser = target.user;
          stack.reservedTargets[target.user] = true;
        } else {
          hasWaitingBeam = true;
          continue;
        }
      }

      target = players[beam.targetUser];

      if (!target || target.hp <= 0) {
        hasWaitingBeam = true;
        continue;
      }

      createLifeStealEffect(caster, target);

      if (target.shield > 0) {
        floating(target, "BLOCK", "blue");
      } else {
        target.hp -= 1;
        target.hpDiv.innerText = "❤️ " + target.hp;
        floating(target, "-1", "red");

        caster.hp += 1;
        caster.hpDiv.innerText = "❤️ " + caster.hp;
        floating(caster, "+1", "green");

        if (target.hp <= 0) {
          kill(target, caster);
          beam.targetUser = null;
        }
      }

      beam.remainingHits -= 1;

      // Quando esse raio acaba, ele solta só o vínculo atual.
      // O alvo continua marcado como já usado por ESTE stack.
      if (beam.remainingHits <= 0 && beam.targetUser) {
        beam.targetUser = null;
      }
    }

    caster.el.classList.toggle("lifeStealWaiting", hasWaitingBeam);

    const finished = stack.beams.every((beam) => beam.remainingHits <= 0);

    if (finished) {
      caster.el.classList.remove("lifeStealWaiting");
      activeLifeStealStacks.splice(stackIndex, 1);
    } else {
      stack.nextTickAt = now + stack.interval;
    }
  }
}

function renderLifeStealEffects() {
  document.querySelectorAll(".lifeStealBeam").forEach((el) => el.remove());

  const now = Date.now();
  lifeStealEffects = lifeStealEffects.filter((effect) => effect.expiresAt > now);

  for (const effect of lifeStealEffects) {
    const dx = effect.x2 - effect.x1;
    const dy = effect.y2 - effect.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const el = document.createElement("div");
    el.className = "lifeStealBeam";
    el.style.left = effect.x1 + "px";
    el.style.top = effect.y1 + "px";
    el.style.width = length + "px";
    el.style.transform = `rotate(${angle}rad)`;

    game.appendChild(el);
  }
}

function clearHandHeartSystem() {
  lifeStealQueue = [];
  activeLifeStealStacks = [];
  lifeStealEffects = [];

  document.querySelectorAll(".lifeStealBeam").forEach((el) => el.remove());

  for (const id in players) {
    players[id].el.classList.remove("lifeStealWaiting");
  }
}

window.addHP = addHP;
window.addShield = addShield;
window.kill = kill;
window.activateHeartPower = activateHeartPower;
window.queueHandHeartPower = queueHandHeartPower;
window.updateHandHeartSystem = updateHandHeartSystem;
window.renderLifeStealEffects = renderLifeStealEffects;
window.clearHandHeartSystem = clearHandHeartSystem;