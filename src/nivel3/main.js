/* -------------------------------
   Mini platformer con sprites
   NIVEL 1: El Desierto Ardiente
-------------------------------- */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

// === Sprites ===
const imgBackground = new Image();
imgBackground.src = "../resources/laguna.jpg";

const imgPlayer = new Image();
imgPlayer.src = "../resources/astronaut.png";

const imgCoin = new Image();
imgCoin.src = "../resources/semilla.png";

const imgEnemy = new Image();
imgEnemy.src = "../resources/monstruo_nvl1.png";

// === Estado del juego ===
let keys = {};
let cameraX = 0;
let orbesRecolectadas = 0;
let orbesValidas = 0;
let gameOver = false;
let temperatura = 33;
const ORBES_NECESARIAS = 3;
let juegoIniciado = false;
let nivelPasado = false; // ← para evitar múltiples ejecuciones

// === Nivel ===
const level = [];
const TILE = 40;
const LEVEL_W = 200;
const LEVEL_H = Math.floor(H / TILE);

// Crear el mapa
for (let y = 0; y < LEVEL_H; y++) {
    level[y] = [];
    for (let x = 0; x < LEVEL_W; x++) level[y][x] = 0;
}

// Suelo
for (let x = 0; x < LEVEL_W; x++) {
    level[LEVEL_H - 1][x] = 1;
    if (Math.random() < 0.02) level[LEVEL_H - 2][x] = 1;
}

// Plataformas más bajas
for (let i = 0; i < 40; i++) {
    const px = 5 + Math.floor(Math.random() * (LEVEL_W - 10));
    const py = LEVEL_H - 3 - Math.floor(Math.random() * 2);
    const len = 2 + Math.floor(Math.random() * 4);
    for (let j = 0; j < len; j++) level[py][px + j] = 1;
}

// === Orbes ===
const totalOrbes = 15;
const validOrbes = new Set();
while (validOrbes.size < ORBES_NECESARIAS) {
    validOrbes.add(Math.floor(Math.random() * totalOrbes));
}

const orbList = [];
for (let i = 0; i < totalOrbes; i++) {
    orbList.push({
        x: Math.random() * (LEVEL_W * TILE - 60) + 30,
        y: H - 120 - Math.random() * 60,
        size: 20,
        isValid: validOrbes.has(i),
        collected: false
    });
}

// === Enemigos ===
const enemies = [];
for (let i = 0; i < 8; i++) {
    const ex = 8 + Math.floor(Math.random() * (LEVEL_W - 20));
    for (let y = 0; y < LEVEL_H - 1; y++) {
        if (level[y + 1][ex] === 1 && level[y][ex] === 0) {
            enemies.push({
                x: ex * TILE,
                y: y * TILE,
                w: 36,
                h: 36,
                dir: Math.random() < 0.5 ? -1 : 1,
                spd: 0.7
            });
            break;
        }
    }
}

// === Jugador ===
const player = {
    x: TILE * 2,
    y: (LEVEL_H - 3) * TILE,
    w: 36,
    h: 36,
    vx: 0,
    vy: 0,
    speed: 2.8,
    jumpPower: 12,
    onGround: false
};

// === Utilidad ===
function tileAtPixel(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || tx >= LEVEL_W || ty < 0 || ty >= LEVEL_H) return 0;
    return level[ty][tx];
}

// === Input ===
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (["ArrowUp", "Space", "KeyW"].includes(e.code)) e.preventDefault();
});
window.addEventListener("keyup", e => (keys[e.code] = false));

// === Click para iniciar ===
canvas.addEventListener("click", e => {
    if (!juegoIniciado) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x >= W / 2 - 50 && x <= W / 2 + 50 && y >= H / 2 && y <= H / 2 + 40) {
            juegoIniciado = true;
        }
    }
});

// === Update ===
function update(dt) {
    if (gameOver || !juegoIniciado || nivelPasado) return;

    const left = keys["ArrowLeft"] || keys["KeyA"];
    const right = keys["ArrowRight"] || keys["KeyD"];
    player.vx = (right ? player.speed : 0) - (left ? player.speed : 0);

    player.x += player.vx;
    if (player.vx !== 0) {
        const dir = player.vx > 0 ? 1 : -1;
        const probeX = dir > 0 ? player.x + player.w : player.x;
        for (let py of [player.y + 2, player.y + player.h - 2]) {
            if (tileAtPixel(probeX, py) === 1) {
                const tx = Math.floor(probeX / TILE);
                player.x =
                    dir > 0 ? tx * TILE - player.w - 0.01 : (tx + 1) * TILE + 0.01;
                player.vx = 0;
            }
        }
    }

    // Gravedad
    player.vy += 0.5;
    if (player.vy > 12) player.vy = 12;
    player.y += player.vy;
    player.onGround = false;

    const points = [player.x + 2, player.x + player.w - 2];
    for (let px of points) {
        if (tileAtPixel(px, player.y + player.h) === 1) {
            const ty = Math.floor((player.y + player.h) / TILE);
            player.y = ty * TILE - player.h - 0.01;
            player.vy = 0;
            player.onGround = true;
        }
        if (tileAtPixel(px, player.y) === 1) {
            const ty = Math.floor(player.y / TILE);
            player.y = (ty + 1) * TILE + 0.01;
            player.vy = 0.01;
        }
    }

    // Saltar
    if ((keys["Space"] || keys["ArrowUp"] || keys["KeyW"]) && player.onGround) {
        player.vy = -player.jumpPower;
        player.onGround = false;
    }

    // === Recolectar orbes ===
    for (let orb of orbList) {
        if (orb.collected) continue;
        const dx = player.x + player.w / 2 - orb.x;
        const dy = player.y + player.h / 2 - orb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 30) {
            orb.collected = true;
            orbesRecolectadas++;
            temperatura--;
            if (orb.isValid) orbesValidas++;

            // 🟢 Pasar a nivel 2 al llegar a 4 orbes válidas
            if (orbesRecolectadas == ORBES_NECESARIAS) {
                window.open("../nivel4/index.html", "_self");
            }
        }
    }

    // Enemigos
    for (let e of enemies) {
        e.vy = (e.vy || 0) + 0.5;
        if (e.vy > 12) e.vy = 12;
        e.y += e.vy;
        if (tileAtPixel(e.x + e.w / 2, e.y + e.h) === 1) {
            const ty = Math.floor((e.y + e.h) / TILE);
            e.y = ty * TILE - e.h - 0.01;
            e.vy = 0;
        }
        e.x += e.dir * e.spd;
        const frontX = e.dir > 0 ? e.x + e.w + 4 : e.x - 4;
        const underFront = tileAtPixel(frontX, e.y + e.h + 6);
        const frontHit = tileAtPixel(frontX, e.y + 8);
        if (underFront !== 1 || frontHit === 1) e.dir *= -1;
    }

    // Colisión con enemigos
    for (let e of enemies) {
    if (e.dead) continue; // ignora enemigos ya muertos

    if (rectsOverlap(player, e)) {
        // coordenadas relevantes
        const playerBottom = player.y + player.h;
        const enemyTop = e.y;
        const verticalOverlap = playerBottom - enemyTop; // cuánto "entra" el jugador desde arriba

        // condición de 'stomp': el jugador está cayendo y la superposición vertical es pequeña
        // ajusta 16 si quieres que sea más permisivo/estricto
        if (player.vy > 1 && verticalOverlap > 2 && verticalOverlap < 20) {
            e.dead = true;       // marcar para eliminar
            player.vy = -6;      // rebote al matar
            // si quieres, añade puntos o efecto aquí
        } else {
            gameOver = true;     // colisión lateral / por debajo => game over
        }
    }
}

// --- Eliminación segura de enemigos marcados como muertos ---
// Pégalo después del bucle anterior, antes de actualizar la cámara.
// Esto quita del array los enemigos muertos para que ya no se actualicen ni dibujen.
for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].dead) enemies.splice(i, 1);
}

    cameraX = Math.max(0, Math.min(player.x - 200, LEVEL_W * TILE - W));
}

function rectsOverlap(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

// === Dibujo ===
function draw() {
    if (imgBackground.complete) ctx.drawImage(imgBackground, 0, 0, W, H);
    else {
        ctx.fillStyle = "#9be7ff";
        ctx.fillRect(0, 0, W, H);
    }

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Bloques del nivel
    for (let y = 0; y < LEVEL_H; y++) {
        for (let x = 0; x < LEVEL_W; x++) {
            const t = level[y][x];
            if (t === 1) {
                ctx.fillStyle = "#7b4f1d";
                ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
                ctx.fillStyle = "#a56d39";
                ctx.fillRect(x * TILE, y * TILE + TILE - 8, TILE, 8);
            }
        }
    }

    // Orbes
    for (let orb of orbList) {
        if (!orb.collected && imgCoin.complete)
            ctx.drawImage(imgCoin, orb.x - 10, orb.y - 10, 20, 20);
    }

    // Enemigos
    for (let e of enemies) {
        if (imgEnemy.complete) ctx.drawImage(imgEnemy, e.x, e.y, e.w, e.h);
    }

    // Jugador
    if (imgPlayer.complete)
        ctx.drawImage(imgPlayer, player.x, player.y, player.w, player.h);

    ctx.restore();

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(20, 12, 200, 36);
    ctx.fillStyle = "#fff";
    ctx.font = "18px Arial";
    ctx.fillText(`Semillas: ${orbesRecolectadas} / ${ORBES_NECESARIAS}`, 30, 36);

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(W - 220, 12, 200, 36);
    ctx.fillStyle = "#fff";
    ctx.fillText(`Temp: ${temperatura}°C`, W - 200, 36);

    if (!juegoIniciado) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "32px Arial";
        ctx.fillText("Level 3: Seeds of Life", W / 2, H / 2 - 40);
        ctx.font = "18px Arial";
        ctx.fillText("Mission: Gather seeds to grow plants and reduce temperature to 30°C.", W / 2, H / 2 - 10);
        ctx.fillStyle = "#00b894";
        ctx.fillRect(W / 2 - 50, H / 2 + 10, 100, 40);
        ctx.fillStyle = "#fff";
        ctx.font = "20px Arial";
        ctx.fillText("OK", W / 2, H / 2 + 38);
        ctx.textAlign = "left";
    }

    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(W / 2 - 150, H / 2 - 40, 300, 90);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "28px Arial";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 4);
        ctx.font = "16px Arial";
        ctx.fillText("Refresca para jugar de nuevo", W / 2, H / 2 + 26);
    }
}

// === Loop ===
let last = 0;
function loop(ts) {
    const dt = (ts - last) / 16.666;
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);