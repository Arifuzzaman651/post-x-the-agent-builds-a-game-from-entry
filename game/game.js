// Star Catcher — a tiny browser game built from one prompt:
// "Build a tiny browser game: a basket catches falling stars. Arrow keys move
//  the basket, each star caught scores a point, three missed stars ends the game."
//
// Controls: ArrowLeft / ArrowRight (or A / D) to move, pointer drag works too,
// R (or tap) to restart after game over. ?demo=1 runs an attract mode in which
// the basket tracks the nearest star on its own — the same movement code.
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const DEMO = new URLSearchParams(location.search).has('demo');
const TAU = Math.PI * 2;

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// --- background stars (twinkling, never fall) ---
const bgStars = Array.from({ length: 90 }, () => ({
  x: Math.random(), y: Math.random() * 0.7,
  r: 0.6 + Math.random() * 1.6,
  phase: Math.random() * TAU, speed: 0.4 + Math.random() * 1.2,
}));

// --- game state ---
const game = {
  score: 0,
  misses: 0,
  over: false,
  started: false,
  basketX: 0,          // centre x of the basket
  basketW: 0,
  basketY: 0,
  speed: 0,
  stars: [],           // falling stars
  spawnIn: 0,
  time: 0,
};
window.__game = game; // for playtests: read score / misses / over live

const keys = { left: false, right: false };
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if ((e.key === 'r' || e.key === 'R') && game.over) reset();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') e.preventDefault();
  game.started = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

// Pointer drag moves the basket; a tap restarts after game over.
let dragging = false;
function pointerX(e) {
  const t = e.touches ? e.touches[0] : e;
  return t.clientX;
}
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  game.started = true;
  if (game.over) { reset(); return; }
  game.basketX = clamp(pointerX(e), game.basketW / 2, W - game.basketW / 2);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  game.basketX = clamp(pointerX(e), game.basketW / 2, W - game.basketW / 2);
});
window.addEventListener('pointerup', () => { dragging = false; });

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function reset() {
  game.score = 0;
  game.misses = 0;
  game.over = false;
  game.stars = [];
  game.spawnIn = 0.4;
  game.basketX = W / 2;
  game.started = true;
}

function spawnStar() {
  const size = 16 + Math.random() * 14;
  game.stars.push({
    x: 30 + Math.random() * (W - 60),
    y: -30,
    r: size,
    vy: (150 + Math.random() * 90 + game.score * 4) * (DEMO ? 1.7 : 1), // demo runs snappier for the recording
    sway: Math.random() * TAU,
    swayAmp: 12 + Math.random() * 26,
    rot: Math.random() * TAU,
    rotSpeed: (Math.random() - 0.5) * 1.6,
  });
}

function drawStar(cx, cy, r, rot, fill) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.shadowColor = '#ffd76a';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.restore();
}

function drawBasket() {
  const bw = game.basketW, bh = 54;
  const x = game.basketX - bw / 2, y = game.basketY;
  ctx.save();
  // body
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + bw, y);
  ctx.lineTo(x + bw - 14, y + bh);
  ctx.lineTo(x + 14, y + bh);
  ctx.closePath();
  const grad = ctx.createLinearGradient(x, y, x, y + bh);
  grad.addColorStop(0, '#c98a4b');
  grad.addColorStop(1, '#8a5a28');
  ctx.fillStyle = grad;
  ctx.fill();
  // weave lines
  ctx.strokeStyle = 'rgba(60,32,8,0.55)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 8, y + (bh * i) / 3);
    ctx.lineTo(x + bw - 8, y + (bh * i) / 3);
    ctx.stroke();
  }
  // rim
  ctx.beginPath();
  ctx.ellipse(game.basketX, y, bw / 2, 9, 0, 0, TAU);
  ctx.fillStyle = '#e0a866';
  ctx.fill();
  ctx.restore();
}

function drawHUD() {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('★ ' + game.score, 22, 18);
  // lives: three small stars, lost ones dimmed
  for (let i = 0; i < 3; i++) {
    const lx = W - 34 - i * 44, ly = 36;
    drawStar(lx, ly, 15, 0, i < 3 - game.misses ? '#ffd76a' : 'rgba(255,255,255,0.18)');
  }
  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 18, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '800 58px system-ui, sans-serif';
  ctx.fillText('Game over', W / 2, H / 2 - 110);
  ctx.font = '400 34px system-ui, sans-serif';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText('You caught ' + game.score + (game.score === 1 ? ' star' : ' stars'), W / 2, H / 2 - 30);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '400 26px system-ui, sans-serif';
  ctx.fillText('Press R or tap to play again', W / 2, H / 2 + 30);
  ctx.restore();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.time += dt;
  game.basketW = Math.max(120, Math.min(190, W * 0.17));
  game.basketY = H - 130;

  if (!game.over) {
    // --- move the basket ---
    if (DEMO) {
      // attract mode: track the lowest falling star with the same speed limit
      const target = game.stars.reduce((best, s) => (!best || s.y > best.y ? s : best), null);
      if (target) {
        const dx = target.x - game.basketX;
        game.basketX += clamp(dx, -game.speed * dt, game.speed * dt);
      }
    } else {
      if (keys.left) game.basketX -= game.speed * dt;
      if (keys.right) game.basketX += game.speed * dt;
    }
    game.basketX = clamp(game.basketX, game.basketW / 2, W - game.basketW / 2);

    // --- spawn + fall ---
    game.spawnIn -= dt;
    if (game.spawnIn <= 0) {
      spawnStar();
      game.spawnIn = DEMO
        ? Math.max(0.3, 0.55 - game.score * 0.015)
        : Math.max(0.35, 0.9 - game.score * 0.02);
    }
    for (const s of game.stars) {
      s.y += s.vy * dt;
      s.sway += dt * 2;
      s.rot += s.rotSpeed * dt;
    }
    // --- catch / miss ---
    const basketTop = game.basketY;
    game.stars = game.stars.filter((s) => {
      const sx = s.x + Math.sin(s.sway) * s.swayAmp;
      if (s.y > basketTop - 6 && s.y < basketTop + 44 &&
          Math.abs(sx - game.basketX) < game.basketW / 2) {
        game.score += 1; // caught!
        return false;
      }
      if (s.y > H + 40) {
        game.misses += 1;
        if (game.misses >= 3) game.over = true;
        return false;
      }
      return true;
    });
  }

  // --- draw ---
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#070b1d');
  sky.addColorStop(0.6, '#101a3d');
  sky.addColorStop(1, '#1d2a52');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // moon
  ctx.save();
  ctx.beginPath();
  ctx.arc(W * 0.8, H * 0.12, 46, 0, TAU);
  ctx.fillStyle = '#f4ecd8';
  ctx.shadowColor = '#f4ecd8';
  ctx.shadowBlur = 40;
  ctx.fill();
  ctx.restore();

  // twinkling background stars
  for (const b of bgStars) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(game.time * b.speed + b.phase));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(b.x * W, b.y * H, b.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const s of game.stars) {
    drawStar(s.x + Math.sin(s.sway) * s.swayAmp, s.y, s.r, s.rot, '#ffd76a');
  }
  drawBasket();
  drawHUD();
  if (game.over) drawGameOver();

  requestAnimationFrame(frame);
}

game.basketX = W / 2;
game.speed = Math.max(520, W * 0.9);
game.spawnIn = 0.5;
requestAnimationFrame(frame);
