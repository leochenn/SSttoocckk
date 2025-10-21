// Simple entity classes for the airplane war game
// Using a fixed logical coordinate system (BASE_WIDTH x BASE_HEIGHT)

export const BASE_WIDTH = 360;
export const BASE_HEIGHT = 640;

export class Player {
  constructor() {
    this.w = 28; this.h = 28;
    this.speed = 220; // px/s
    this.reset();
  }
  reset() {
    this.x = (BASE_WIDTH - this.w) / 2;
    this.y = BASE_HEIGHT - this.h - 24;
    this.lives = 3;
    this.invul = 0; // seconds remaining
    this.fireCooldown = 0; // seconds
  }
  update(dt, input) {
    let dx = 0, dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      this.x += dx * this.speed * dt;
      this.y += dy * this.speed * dt;
    }
    // Boundaries
    if (this.x < 4) this.x = 4;
    if (this.y < 4) this.y = 4;
    if (this.x + this.w > BASE_WIDTH - 4) this.x = BASE_WIDTH - this.w - 4;
    if (this.y + this.h > BASE_HEIGHT - 4) this.y = BASE_HEIGHT - this.h - 4;

    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.invul > 0) this.invul -= dt;
  }
  canFire() { return this.fireCooldown <= 0; }
  fire() { this.fireCooldown = 0.18; }
  hit() { if (this.invul <= 0) { this.lives -= 1; this.invul = 1.2; return true; } return false; }
  draw(ctx) {
    ctx.save();
    const cx = this.x + this.w/2, cy = this.y + this.h/2;
    // Blink when invulnerable
    const blink = this.invul > 0 ? Math.sin(Date.now()/60) > 0 : true;
    if (blink) {
      // Ship body
      ctx.translate(cx, cy);
      ctx.fillStyle = '#5bd1ff';
      ctx.strokeStyle = '#9be3ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -this.h*0.6);
      ctx.lineTo(this.w*0.45, this.h*0.5);
      ctx.lineTo(0, this.h*0.3);
      ctx.lineTo(-this.w*0.45, this.h*0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // cockpit
      ctx.beginPath();
      ctx.fillStyle = '#d5f3ff';
      ctx.arc(0, -this.h*0.2, 4, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class Bullet {
  constructor() {
    this.active = false;
    this.w = 3; this.h = 10;
    this.vy = -520;
    this.x = 0; this.y = 0;
  }
  reset(x, y) { this.x = x; this.y = y; this.active = true; }
  update(dt) { if (!this.active) return; this.y += this.vy * dt; if (this.y + this.h < -10) this.active = false; }
  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.restore();
  }
  get aabb() { return {x:this.x, y:this.y, w:this.w, h:this.h}; }
}

export class Enemy {
  constructor() {
    this.active = false;
    this.w = 26; this.h = 26;
    this.hp = 1;
    this.y = -40; this.x = 0;
    this.speed = 60; // base vertical speed
    this.amp = 20;   // sine amplitude
    this.phase = 0;  // internal phase
    this.sineSpeed = 3.5; // sine angular speed
  }
  reset(x, speed, hp, amp, sineSpeed) {
    this.x = x; this.y = -this.h - 4; this.active = true;
    this.speed = speed; this.hp = hp;
    this.amp = amp; this.sineSpeed = sineSpeed;
    this.phase = Math.random() * Math.PI * 2;
    this.baseX = x;
  }
  update(dt) {
    if (!this.active) return;
    this.y += this.speed * dt;
    this.phase += this.sineSpeed * dt;
    this.x = this.baseX + Math.sin(this.phase) * this.amp;
    if (this.y - this.h > BASE_HEIGHT + 20) this.active = false;
  }
  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x + this.w/2, this.y + this.h/2);
    ctx.fillStyle = '#ff6b9a';
    ctx.strokeStyle = '#ffc1d6';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -this.h*0.55);
    ctx.lineTo(this.w*0.4, this.h*0.4);
    ctx.lineTo(-this.w*0.4, this.h*0.4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // eye
    ctx.beginPath();
    ctx.fillStyle = '#2b0a1b';
    ctx.arc(0, -2, 2.5, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  get aabb() { return {x:this.x, y:this.y, w:this.w, h:this.h}; }
}

export class Particle {
  constructor() {
    this.active = false;
    this.x=0; this.y=0; this.vx=0; this.vy=0; this.life=0; this.ttl=0; this.size=2; this.color='#fff';
  }
  reset(x, y, vx, vy, ttl, size, color) {
    this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.ttl=ttl; this.life=0; this.size=size; this.color=color; this.active = true;
  }
  update(dt) {
    if (!this.active) return;
    this.life += dt; if (this.life >= this.ttl) { this.active=false; return; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.99; this.vy *= 0.99;
  }
  draw(ctx) {
    if (!this.active) return;
    const t = 1 - (this.life / this.ttl);
    ctx.save();
    ctx.globalAlpha = Math.max(0, t);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * (0.5 + t), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function aabbIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
