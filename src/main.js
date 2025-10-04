/* -------------------------------
   Mini platformer con sprites
   Usa imágenes para:
   - Personaje
   - Fondo
   - Enemigos
   - Monedas
-------------------------------- */

const canvas = document.getElementById("game");
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// Sprites
const imgBackground = new Image();
imgBackground.src = "resources/nivel1.jpg";   // Fondo del nivel

const imgPlayer = new Image();
imgPlayer.src = "resources/astronaut.png";       // Personaje principal

const imgCoin = new Image();
imgCoin.src = "resources/semilla.png";           // Moneda/orbe de fuego

const imgEnemy = new Image();
imgEnemy.src = "resources/monstruo_nvl1.png";         // Enemigo

// Game state
let keys = {};
let cameraX = 0;
let score = 0;
let gameOver = false;

// Level setup
const level = [];
const TILE = 40;
const LEVEL_W = 200;
const LEVEL_H = Math.floor(H / TILE);

// build simple level (ground + some platforms and coins)
for (let y = 0; y < LEVEL_H; y++) {
    level[y] = [];
    for (let x = 0; x < LEVEL_W; x++) level[y][x] = 0;
}
// ground
for (let x = 0; x < LEVEL_W; x++) {
    level[LEVEL_H - 1][x] = 1;
    if (Math.random() < 0.02) level[LEVEL_H - 2][x] = 1;
}
// platforms + coins
for (let i = 0; i < 60; i++) {
    const px = 5 + Math.floor(Math.random() * (LEVEL_W - 10));
    const py = 4 + Math.floor(Math.random() * (LEVEL_H - 6));
    const len = 2 + Math.floor(Math.random() * 4);
    for (let j = 0; j < len; j++) level[py][px + j] = 1;
    if (Math.random() < 0.8) level[py - 1][px + Math.floor(Math.random() * len)] = 2;
}

// enemies
const enemies = [];
for (let i = 0; i < 12; i++) {
    const ex = 8 + Math.floor(Math.random() * (LEVEL_W - 20));
    for (let y = 0; y < LEVEL_H - 1; y++) {
        if (level[y + 1][ex] === 1 && level[y][ex] === 0) {
            enemies.push({x: ex * TILE, y: y * TILE, w: 36, h: 36, dir: Math.random() < 0.5 ? -1 : 1, spd: 0.7});
            break;
        }
    }
}

// Player
const player = {
    x: TILE * 2,
    y: (LEVEL_H - 2) * TILE - 36,
    w: 36,
    h: 36,
    vx: 0,
    vy: 0,
    speed: 2.8,
    jumpPower: 10,
    onGround: false
};

// Utility
function tileAtPixel(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || tx >= LEVEL_W || ty < 0 || ty >= LEVEL_H) return 0;
    return level[ty][tx];
}

// Input
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['ArrowUp', 'Space', 'KeyW'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => keys[e.code] = false);

function update(dt) {
    if (gameOver) return;
    // Horizontal
    const left = keys['ArrowLeft'] || keys['KeyA'];
    const right = keys['ArrowRight'] || keys['KeyD'];
    let accel = 0;
    if (left) accel = -player.speed;
    if (right) accel = player.speed;
    player.vx = accel;

    player.x += player.vx;
    if (player.vx !== 0) {
        const dir = player.vx > 0 ? 1 : -1;
        const probeX = dir > 0 ? player.x + player.w : player.x;
        for (let py of [player.y + 2, player.y + player.h - 2]) {
            if (tileAtPixel(probeX, py) === 1) {
                const tx = Math.floor(probeX / TILE);
                if (dir > 0) player.x = tx * TILE - player.w - 0.01;
                else player.x = (tx + 1) * TILE + 0.01;
                player.vx = 0;
            }
        }
    }

    // Gravity + vertical collisions
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

    // Jump
    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.onGround) {
        player.vy = -player.jumpPower;
        player.onGround = false;
    }

    // Coins
    const cx = Math.floor((player.x + player.w / 2) / TILE);
    const cy = Math.floor((player.y + player.h / 2) / TILE);
    if (level[cy] && level[cy][cx] === 2) {
        level[cy][cx] = 0;
        score += 10;
    }

    // Enemies
    for (let e of enemies) {
        e.vy = e.vy ? e.vy + 0.5 : 0.5;
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

    // Player <-> Enemy
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (rectsOverlap(player, e)) {
            if (player.vy > 1) {
                enemies.splice(i, 1);
                player.vy = -6;
                score += 50;
            } else {
                gameOver = true;
            }
        }
    }

    // Camera
    cameraX = player.x - 200;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > LEVEL_W * TILE - W) cameraX = LEVEL_W * TILE - W;
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function draw() {
    // Fondo
    if (imgBackground.complete) {
        ctx.drawImage(imgBackground, 0, 0, W, H);
    } else {
        ctx.fillStyle = '#9be7ff';
        ctx.fillRect(0, 0, W, H);
    }

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Tiles
    for (let y = 0; y < LEVEL_H; y++) {
        for (let x = 0; x < LEVEL_W; x++) {
            const t = level[y][x];
            if (t === 1) {
                ctx.fillStyle = '#7b4f1d';
                ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
                ctx.fillStyle = '#a56d39';
                ctx.fillRect(x * TILE, y * TILE + TILE - 8, TILE, 8);
            } else if (t === 2 && imgCoin.complete) {
                ctx.drawImage(imgCoin, x * TILE + 10, y * TILE + 10, 20, 20);
            }
        }
    }

    // Enemigos
    for (let e of enemies) {
        if (imgEnemy.complete) ctx.drawImage(imgEnemy, e.x, e.y, e.w, e.h);
        else {
            ctx.fillStyle = '#c33';
            ctx.fillRect(e.x, e.y, e.w, e.h);
        }
    }

    // Jugador
    if (imgPlayer.complete)
        ctx.drawImage(imgPlayer, player.x, player.y, player.w, player.h);
    else {
        ctx.fillStyle = '#ff4d4d';
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    ctx.restore();

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(320, 12, 180, 36);
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText('Orbes de fuego: ' + score, 335, 36);

    if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(W / 2 - 150, H / 2 - 40, 300, 90);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '28px Arial';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 4);
        ctx.font = '16px Arial';
        ctx.fillText('Refresca para jugar de nuevo', W / 2, H / 2 + 26);
        ctx.textAlign = 'left';
    }
}

let last = 0;
function loop(ts) {
    const dt = (ts - last) / 16.666;
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
