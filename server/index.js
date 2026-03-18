const { WebcastPushConnection } = require("tiktok-live-connector");
const WebSocket = require("ws");
const express = require("express");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

/* ========================= */
/* CONFIG */
/* ========================= */

const TIKTOK_USERNAME = "tikgames";
const DEV_MODE = false;
const CHAMPIONS_FILE = path.join(__dirname, "..", "data", "champions.json");

const HEART_GIFT_ID = 5327;
const HAND_HEART_GIFT_ID = 5660;

/* ========================= */
/* RANKING GLOBAL */
/* ========================= */

let champions = {};

try {
  if (!fs.existsSync(CHAMPIONS_FILE)) {
    fs.writeFileSync(CHAMPIONS_FILE, "{}");
  }

  champions = JSON.parse(fs.readFileSync(CHAMPIONS_FILE, "utf8"));
} catch {
  champions = {};
}

function saveChampions() {
  fs.writeFileSync(CHAMPIONS_FILE, JSON.stringify(champions, null, 2));
}

function getTop() {
  let arr = Object.entries(champions).map(([user, data]) => ({
    user: user,
    wins: data.wins,
    photo: data.photo,
  }));

  arr.sort((a, b) => b.wins - a.wins);

  return arr.slice(0, 5);
}

/* ========================= */
/* SERVIDOR WEB */
/* ========================= */

const app = express();

app.use(express.static(path.join(__dirname, "../public")));

app.listen(8080, () => {
  console.log("🌐 Servidor web rodando em http://localhost:8080");
});

/* ========================= */
/* WEBSOCKET */
/* ========================= */

const wss = new WebSocket.Server({ port: 3000 });

console.log("🔌 WebSocket rodando na porta 3000");

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

/* ========================= */
/* CONTROLE PLAYERS */
/* ========================= */

let players = new Set();
let likeTracker = {};

/* ========================= */
/* TIKTOK CONNECTION */
/* ========================= */

let tiktok = null;
if (!DEV_MODE) {
  tiktok = new WebcastPushConnection(TIKTOK_USERNAME);
}

/* ========================= */
/* CONECTAR LIVE */
/* ========================= */

function connectLive() {
  if (DEV_MODE) return;

  tiktok
    .connect()
    .then(() => {
      console.log("🟢 Conectado à live!");
    })
    .catch((err) => {
      console.log("🔴 Live offline, tentando novamente em 10s");
      setTimeout(connectLive, 10000);
    });
}

connectLive();

/* ========================= */
/* EVENTOS TIKTOK */
/* ========================= */

if (!DEV_MODE) {
  // CHAT
  tiktok.on("chat", (data) => {
    let msg = data.comment.toLowerCase();
    if (!msg.includes("enter")) return;
    if (players.has(data.uniqueId)) return;

    players.add(data.uniqueId);
    console.log("👤 SPAWN:", data.uniqueId);

    broadcast({
      type: "enter",
      user: data.uniqueId,
      photo:
        data.profilePictureUrl ||
        `https://i.pravatar.cc/150?u=${data.uniqueId}`,
    });
  });

  // GIFTS
  tiktok.on("gift", (data) => {
    if (!data.repeatEnd) return;
    if (!players.has(data.uniqueId)) {
      players.add(data.uniqueId);
      broadcast({
        type: "enter",
        user: data.uniqueId,
        photo:
          data.profilePictureUrl ||
          `https://i.pravatar.cc/150?u=${data.uniqueId}`,
      });
    }

    const giftId = Number(data.giftId || 0);
    const coins =
      Number(data.diamondCount || 0) * Number(data.repeatCount || 1);

    console.log("🎁 GIFT:", data.uniqueId, "giftId:", giftId, "coins:", coins);

    if (giftId === HEART_GIFT_ID) {
      const repeatCount = Number(data.repeatCount || 1);
      const shots = repeatCount * 5;

      console.log("❤️ HEART POWER-UP:", data.uniqueId, "| tiros:", shots);

      broadcast({
        type: "heartPower",
        user: data.uniqueId,
        shots: shots,
        interval: 300, // 1 tiro a cada 300ms
      });

      return;
    }

    if (giftId === HAND_HEART_GIFT_ID) {
      const repeatCount = Number(data.repeatCount || 1);

      console.log("⚡ HAND HEART:", data.uniqueId, "| stacks:", repeatCount);

      broadcast({
        type: "handHeart",
        user: data.uniqueId,
        stacks: repeatCount,
        beams: 3,
        hitsPerBeam: 5,
        interval: 500,
      });

      return;
    }

    broadcast({
      type: "shield",
      user: data.uniqueId,
      seconds: coins,
    });
  });

  // LIKES
  tiktok.on("like", (data) => {
    const user = data.uniqueId;

    if (!players.has(user)) return;

    if (!likeTracker[user]) {
      likeTracker[user] = 0;
    }

    likeTracker[user] += data.likeCount;

    console.log("❤️ Likes recebidos:", user, data.likeCount);

    while (likeTracker[user] >= 100) {
      likeTracker[user] -= 100;

      console.log("❤️ +10 HP:", user);

      broadcast({
        type: "hp",
        user: user,
        hp: 10,
      });
    }
  });
}

/* ========================= */
/* WEBSOCKET CONNECTION */
/* ========================= */

wss.on("connection", (ws) => {
  console.log("🟢 Cliente conectado");

  ws.send(
    JSON.stringify({
      type: "topWinners",
      data: getTop(),
    }),
  );

  ws.on("message", (msg) => {
    try {
      let data = JSON.parse(msg);

      if (data.type === "dead") {
        console.log("💀 MORREU:", data.user);
        players.delete(data.user);
      }

      if (data.type === "champion") {
        let user = data.user;
        let photo = data.photo;

        console.log("🏆 CAMPEÃO:", user);

        if (!champions[user]) {
          champions[user] = { wins: 0, photo: photo };
        }

        champions[user].wins++;
        if (photo) champions[user].photo = photo;

        saveChampions();

        broadcast({
          type: "topWinners",
          data: getTop(),
        });

        players.clear();
        likeTracker = {};

        console.log("🔄 NOVA RODADA LIBERADA");
      }
    } catch (err) {
      console.log("Erro ao processar mensagem:", err);
    }
  });
});

/* ========================= */
/* TESTE LOCAL */
/* ========================= */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("");
console.log("🧪 COMANDOS DE TESTE");
console.log("enter nome");
console.log("gift nome moedas");
console.log("heart nome");
console.log("like nome quantidade");
console.log("champ nome");
console.log("");

rl.on("line", (input) => {
  let args = input.split(" ");

  if (args[0] === "enter") {
    if (players.has(args[1])) return;
    players.add(args[1]);

    broadcast({
      type: "enter",
      user: args[1],
      photo: `https://i.pravatar.cc/150?u=${args[1]}`,
    });

    console.log("👤 SPAWN:", args[1]);
  }

  if (args[0] === "gift") {
    broadcast({
      type: "shield",
      user: args[1],
      seconds: parseInt(args[2]),
    });

    console.log("🛡 ESCUDO:", args[1], args[2]);
  }

  if (args[0] === "heart") {
    const amount = parseInt(args[2] || "1", 10);
    const shots = amount * 5;

    broadcast({
      type: "heartPower",
      user: args[1],
      shots: shots,
      interval: 300,
    });

    console.log(
      "❤️ HEART POWER:",
      args[1],
      "| hearts:",
      amount,
      "| tiros:",
      shots,
    );
  }

  if (args[0] === "like") {
    let likes = parseInt(args[2]);
    let hp = Math.floor(likes / 100) * 10;

    broadcast({
      type: "hp",
      user: args[1],
      hp: hp,
    });

    console.log("❤️ HP:", args[1], hp);
  }

  if (args[0] === "champ") {
    let user = args[1];

    if (!champions[user]) {
      champions[user] = {
        wins: 0,
        photo: `https://i.pravatar.cc/150?u=${user}`,
      };
    }

    champions[user].wins++;
    saveChampions();

    broadcast({
      type: "topWinners",
      data: getTop(),
    });

    console.log("🏆 vitória adicionada:", user);
  }

  if (args[0] === "handheart") {
    const user = args[1];
    const stacks = Number(args[2] || 1);

    console.log(`⚡ TESTE HAND HEART -> ${user} | stacks: ${stacks}`);

    broadcast({
      type: "handHeart",
      user: user,
      stacks: stacks,
      beams: 3,
      hitsPerBeam: 5,
      interval: 500,
    });

    return;
  }
});
