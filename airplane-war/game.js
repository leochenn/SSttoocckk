import { BASE_WIDTH, BASE_HEIGHT, Player, Bullet, Enemy, Particle, aabbIntersect } from './entities.js';

const $ = (sel) => document.querySelector(sel);

const canvas = $('#game');
const ctx = canvas.getContext('2d');

const scoreEl = $('#score');
const hiscoreEl = $('#hiscore');
const livesEl = $('#lives');
const startBtn = $('#btn-start');
const pauseBtn = $('#btn-pause');
const restartBtn = $('#btn-restart');
const muteBtn = $('#btn-mute');
const overlay = $('#overlay');
const overlayTitle = $('#overlay-title');
const overlayDesc = $('#overlay-desc');

const ctrlLeft = $('#ctrl-left');
const ctrlRight = $('#ctrl-right');
const ctrlFire = $('#ctrl-fire');

let scale = 1, dpr = Math.max(1, window.devicePixelRatio || 1);

// Logical world dimensions
const WORLD_W = BASE_WIDTH;
const WORLD_H = BASE_HEIGHT;

// Game state machine
const State = Object.freeze({ start: 'start', playing: 'playing', paused: 'paused', gameover: 'gameover' });
let state = State.start;

// Input state
const input = { left:false, right:false, up:false, down:false, fire:false };

// Entities
const player = new Player();
const bullets = [];
const bulletPool = [];
const enemies = [];
const enemyPool = [];
const particles = [];
const particlePool = [];

// Stars for background
const stars = new Array(80).fill(0).map(() => ({ x: Math.random()*WORLD_W, y: Math.random()*WORLD_H, s: Math.random()*1.5 + .3, v: Math.random()*18 + 12 }));

// Score
let score = 0;
const HISCORE_KEY = 'airplaneWarHighScore';
let hiscore = Number(localStorage.getItem(HISCORE_KEY) || 0);
hiscoreEl.textContent = String(hiscore);

// Enemy spawn control
let spawnTimer = 0;
let elapsed = 0; // total playing time for difficulty scaling

// Audio manager
class Sound {
  constructor() { this.muted = false; this.ctx = null; this.enabled = true; }
  ensure() {
    if (this.ctx || !this.enabled || this.muted) return;
    try {
      // Create after a user gesture (start button / key press)
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
  }
  muteToggle() { this.muted = !this.muted; if (this.ctx && this.ctx.state === 'suspended' && !this.muted) this.ctx.resume(); return this.muted; }
  beep(freq = 500, time = 0.05, type = 'square', gain=0.02) {
    if (this.muted || !this.enabled) return;
    this.ensure(); if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    g.gain.value = gain; g.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0 + time);
  }
  fire() { this.beep(880, 0.06, 'square', 0.02); }
  boom() { this.beep(160, 0.12, 'sawtooth', 0.03); }
}
const sound = new Sound();

function setLivesUI(n) {
  livesEl.innerHTML = '';
  for (let i=0;i<n;i++) {
    const span = document.createElement('span');
    span.className = 'heart';
    livesEl.appendChild(span);
  }
}

function resetGame() {
  player.reset();
  bullets.length = 0; enemies.length = 0; particles.length = 0;
  score = 0; scoreEl.textContent = '0'; setLivesUI(player.lives);
  spawnTimer = 0; elapsed = 0;
  overlay.classList.add('hidden');
}

function startGame() {
  if (state === State.playing) return;
  sound.ensure();
  resetGame();
  state = State.playing;
  startBtn.textContent = '开始';
  restartBtn.style.display = 'none';
}

function pauseToggle() {
  if (state === State.playing) { state = State.paused; overlay.classList.remove('hidden'); overlayTitle.textContent = '暂停中'; overlayDesc.textContent = '按 P 或点击继续'; }
  else if (state === State.paused) { state = State.playing; overlay.classList.add('hidden'); }
}

function gameOver() {
  state = State.gameover;
  overlay.classList.remove('hidden'); overlayTitle.textContent = 'Game Over'; overlayDesc.textContent = '点击重新开始或按空格键';
  restartBtn.style.display = '';
  if (score > hiscore) { hiscore = score; localStorage.setItem(HISCORE_KEY, String(hiscore)); hiscoreEl.textContent = String(hiscore); }
}

function fireBullet() {
  if (!player.canFire()) return;
  const b = bulletPool.pop() || new Bullet();
  b.reset(player.x + player.w/2 - 1.5, player.y - 10);
  bullets.push(b);
  player.fire();
  sound.fire();
}

function spawnExplosion(x, y, color='#ffec99') {
  for (let i=0;i<12;i++) {
    const p = particlePool.pop() || new Particle();
    const a = Math.random() * Math.PI * 2;
    const s = Math.random()*140 + 60;
    const vx = Math.cos(a) * s, vy = Math.sin(a) * s;
    const ttl = Math.random()*0.4 + 0.25;
    const size = Math.random()*1.8 + 1.2;
    p.reset(x, y, vx, vy, ttl, size, color);
    particles.push(p);
  }
}

function spawnEnemy(dt) {
  const diff = 1 + Math.min(1.8, elapsed / 60); // scale 1..2.8 over 2 minutes
  const baseInterval = 1.0; // seconds
  const interval = Math.max(0.28, baseInterval / diff);

  spawnTimer -= dt; if (spawnTimer > 0) return;
  spawnTimer = interval;

  const e = enemyPool.pop() || new Enemy();
  const x = Math.random() * (WORLD_W - 40) + 20;
  const speed = 45 + Math.random()*35 + (diff-1)*40; // increases with diff
  const hp = Math.random() < Math.min(0.6, (diff-1)*0.5) ? 2 : 1; // more 2-HP later
  const amp = 10 + Math.random()*20 + (diff-1)*10;
  const sineSpeed = 2 + Math.random()*3 + (diff-1)*1.5;
  e.reset(x, speed, hp, amp, sineSpeed);
  enemies.push(e);
}

function updateEntities(dt) {
  player.update(dt, input);
  if (input.fire) fireBullet();

  for (let i=0;i<bullets.length;i++) {
    const b = bullets[i]; if (!b) continue; b.update(dt); if (!b.active) { bullets.splice(i,1); bulletPool.push(b); i--; }
  }
  for (let i=0;i<enemies.length;i++) {
    const e = enemies[i]; if (!e) continue; e.update(dt); if (!e.active) { enemies.splice(i,1); enemyPool.push(e); i--; }
  }
  for (let i=0;i<particles.length;i++) {
    const p = particles[i]; if (!p) continue; p.update(dt); if (!p.active) { particles.splice(i,1); particlePool.push(p); i--; }
  }

  // Collisions: bullets vs enemies
  for (let i=0;i<bullets.length;i++) {
    const b = bullets[i]; if (!b.active) continue; const ab = b.aabb;
    for (let j=0;j<enemies.length;j++) {
      const e = enemies[j]; const ae = e.aabb;
      if (aabbIntersect(ab, ae)) {
        // hit
        b.active = false;
        e.hp -= 1;
        if (e.hp <= 0) {
          spawnExplosion(e.x + e.w/2, e.y + e.h/2);
          e.active = false;
          score += 10; scoreEl.textContent = String(score);
          sound.boom();
        } else {
          spawnExplosion(e.x + e.w/2, e.y + e.h/2, '#ffd3e3');
        }
        break;
      }
    }
  }

  // Collisions: enemies vs player
  for (let i=0;i<enemies.length;i++) {
    const e = enemies[i];
    if (!e.active) continue;
    const ap = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (aabbIntersect(ap, e.aabb)) {
      if (player.hit()) {
        setLivesUI(player.lives);
        spawnExplosion(player.x + player.w/2, player.y + player.h/2, '#aee7ff');
        if (player.lives <= 0) { gameOver(); }
      }
      e.active = false;
    }
  }
}

function drawBackground(dt) {
  // Starfield
  ctx.save();
  ctx.fillStyle = '#02060c';
  ctx.fillRect(0,0,WORLD_W,WORLD_H);
  for (const st of stars) {
    st.y += st.v * dt; if (st.y > WORLD_H) { st.y = -2; st.x = Math.random()*WORLD_W; }
    ctx.globalAlpha = Math.min(1, 0.3 + st.s*0.4);
    ctx.fillStyle = '#bcd2f5';
    ctx.fillRect(st.x, st.y, st.s, st.s);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawEntities() {
  for (const p of particles) p.draw(ctx);
  for (const e of enemies) e.draw(ctx);
  for (const b of bullets) b.draw(ctx);
  player.draw(ctx);
}

let lastTime = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - lastTime) / 1000); // clamp to avoid spikes
  lastTime = now;

  // Resize handling ensures crisp rendering on hiDPI
  handleResize();

  // Set world transform: scale to maintain fixed logical size
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

  if (state === State.playing) {
    elapsed += dt;
    spawnEnemy(dt);
    updateEntities(dt);
  }

  drawBackground(dt);

  if (state === State.paused) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0,0,WORLD_W,WORLD_H); ctx.restore();
  }
  drawEntities();
}

function handleResize() {
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width; const cssH = rect.height;
  const newDpr = Math.max(1, window.devicePixelRatio || 1);
  const needResize = canvas.width !== Math.round(cssW * newDpr) || canvas.height !== Math.round(cssH * newDpr) || dpr !== newDpr;
  if (needResize) {
    dpr = newDpr;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = cssW / WORLD_W; // aspect ratio fixed by CSS
  }
}

// Input handling
function setFire(v) { input.fire = v; }
function setLeft(v) { input.left = v; }
function setRight(v) { input.right = v; }

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) { e.preventDefault(); }
  if (e.repeat) return;
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': setLeft(true); break;
    case 'ArrowRight': case 'KeyD': setRight(true); break;
    case 'ArrowUp': case 'KeyW': input.up = true; break;
    case 'ArrowDown': case 'KeyS': input.down = true; break;
    case 'Space': input.fire = true; if (state === State.start || state === State.gameover) startGame(); break;
    case 'KeyP': if (state === State.playing || state === State.paused) pauseToggle(); break;
    default: break;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': setLeft(false); break;
    case 'ArrowRight': case 'KeyD': setRight(false); break;
    case 'ArrowUp': case 'KeyW': input.up = false; break;
    case 'ArrowDown': case 'KeyS': input.down = false; break;
    case 'Space': input.fire = false; break;
    default: break;
  }
});
window.addEventListener('blur', () => { input.left=input.right=input.up=input.down=input.fire=false; });

// Mouse / touch to fire on canvas
let isPointerDown = false;
canvas.addEventListener('pointerdown', (e) => { isPointerDown = true; setFire(true); if (state === State.start) startGame(); });
window.addEventListener('pointerup', () => { isPointerDown = false; setFire(false); });
canvas.addEventListener('pointerleave', () => { if (!isPointerDown) setFire(false); });

// Touch controls
function hold(btn, on) {
  const down = (e) => { e.preventDefault(); on(true); };
  const up = (e) => { e.preventDefault(); on(false); };
  btn.addEventListener('touchstart', down, { passive: false });
  btn.addEventListener('touchend', up, { passive: false });
  btn.addEventListener('touchcancel', up, { passive: false });
  btn.addEventListener('mousedown', down);
  btn.addEventListener('mouseup', up);
  btn.addEventListener('mouseleave', up);
}
hold(ctrlLeft, setLeft);
hold(ctrlRight, setRight);
hold(ctrlFire, setFire);

// Buttons
startBtn.addEventListener('click', () => { if (state === State.playing) { resetGame(); } else { startGame(); } });
pauseBtn.addEventListener('click', () => { if (state === State.playing || state === State.paused) pauseToggle(); });
restartBtn.addEventListener('click', () => { resetGame(); state = State.playing; overlay.classList.add('hidden'); restartBtn.style.display = 'none'; });
muteBtn.addEventListener('click', () => { const muted = sound.muteToggle(); muteBtn.textContent = muted ? '🔇' : '🔊'; });

// Initialize UI
setLivesUI(player.lives);
startBtn.textContent = '开始';
overlay.classList.remove('hidden');
overlayTitle.textContent = '飞机大战';
overlayDesc.textContent = '按下“开始”或空格键开始游戏';
muteBtn.textContent = '🔊';

// Start loop
requestAnimationFrame(frame);
