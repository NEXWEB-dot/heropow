/* ==========================================================================
   HERO POWDER — MONSTER & KAIJU ENTITY SYSTEM
   AI-driven enemies: ground crawlers, armored brutes, flying drones & giant Kaiju
   ========================================================================== */

// ========================== MONSTER DEFINITIONS ============================
const MONSTER_TYPES = {
  STOMPER: {
    name: 'Stomper',
    emoji: '👾',
    width: 10, height: 12,
    hp: 80, maxHp: 80,
    speed: 0.9, jumpPower: -4.5,
    colorBody: '#22c55e', colorDetail: '#16a34a', colorEye: '#ff0',
    destroyRadius: 5, destroyRate: 0.25,
    score: 100,
    canFly: false,
    breathesFire: false,
  },
  BRUTE: {
    name: 'Brute',
    emoji: '🤖',
    width: 14, height: 18,
    hp: 200, maxHp: 200,
    speed: 0.6, jumpPower: -5.5,
    colorBody: '#f97316', colorDetail: '#ea580c', colorEye: '#fff',
    destroyRadius: 9, destroyRate: 0.4,
    score: 300,
    canFly: false,
    breathesFire: false,
  },
  FLYER: {
    name: 'Hover Drone',
    emoji: '🛸',
    width: 12, height: 8,
    hp: 60, maxHp: 60,
    speed: 1.4, jumpPower: 0,
    colorBody: '#a855f7', colorDetail: '#7c3aed', colorEye: '#f0f',
    destroyRadius: 4, destroyRate: 0.15,
    score: 200,
    canFly: true,
    breathesFire: false,
  },
  KAIJU: {
    name: 'Kaiju Rex',
    emoji: '🦕',
    width: 34, height: 50,
    hp: 1500, maxHp: 1500,
    speed: 0.45, jumpPower: -6.5,
    colorBody: '#dc2626', colorDetail: '#991b1b', colorEye: '#fbbf24',
    destroyRadius: 22, destroyRate: 0.75,
    score: 2000,
    canFly: false,
    breathesFire: true,
    fireBreathRange: 80,
  },
};

// ========================== MONSTER CLASS ==================================
class Monster {
  constructor(type, worldX, worldY, worldManager) {
    this.def = MONSTER_TYPES[type];
    this.type = type;
    this.worldManager = worldManager;

    this.worldX = worldX;
    this.worldY = worldY;
    this.vx = 0;
    this.vy = 0;
    this.width = this.def.width;
    this.height = this.def.height;

    this.hp = this.def.hp;
    this.maxHp = this.def.maxHp;
    this.isGrounded = false;
    this.facing = 1; // 1 = right, -1 = left
    this.isDead = false;

    // AI State: idle / chase / attack / stomp / flee
    this.state = 'idle';
    this.stateTimer = 0;
    this.idleTimer = Math.random() * 60;
    this.attackCooldown = 0;
    this.stomp = { active: false, timer: 0, maxTimer: 18 };
    this.fireBreath = { active: false, timer: 0, sparks: [] };

    // Visual effects
    this.hitFlash = 0;
    this.deathTimer = 0;
    this.animTick = 0;
  }

  get centerX() { return this.worldX + this.width / 2; }
  get centerY() { return this.worldY + this.height / 2; }

  // Receive damage from hero superpowers
  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 8;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.deathTimer = 30;
      this.explodeDeath();
    }
  }

  // On death, scatter explosion into the grid
  explodeDeath() {
    const grid = this.worldManager.grid;
    const { gx, gy, inBounds } = this.worldManager.worldToGrid(this.centerX, this.centerY);
    if (!inBounds) return;
    grid.destroyRadius(gx, gy, this.def.destroyRadius + 4, true);
  }

  // AI Update: choose behavior based on hero proximity
  update(hero, effectsArray) {
    if (this.isDead) return;
    this.animTick++;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    this.stateTimer++;

    // Distance to hero
    const dx = hero.worldX - this.worldX;
    const dy = hero.worldY - this.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // AI State Machine
    if (dist < 280) {
      this.state = 'chase';
    } else if (this.stateTimer > 120) {
      this.state = 'idle';
      this.stateTimer = 0;
    }

    // Decide direction
    if (this.state === 'chase' || this.state === 'attack') {
      this.facing = dx > 0 ? 1 : -1;
    }

    switch (this.state) {
      case 'idle':
        this.vx *= 0.85;
        // Occasional idle roam
        if (Math.random() < 0.008) {
          this.vx = (Math.random() - 0.5) * this.def.speed * 1.5;
        }
        break;

      case 'chase':
        if (dist > this.def.width * 3) {
          // Move towards hero
          this.vx += this.facing * this.def.speed * 0.25;
          this.vx = Math.max(-this.def.speed, Math.min(this.def.speed, this.vx));
        } else {
          // Close enough — attack!
          this.state = 'attack';
          this.stateTimer = 0;
        }
        // Jump over terrain obstacles
        if (this.isGrounded && !this.def.canFly) {
          const frontX = this.worldX + (this.facing > 0 ? this.width + 2 : -2);
          if (this.isSolid(frontX, this.worldY + this.height - 2)) {
            this.vy = this.def.jumpPower;
          }
        }
        break;

      case 'attack':
        this.vx *= 0.7;
        if (this.attackCooldown <= 0 && dist < this.def.width * 5) {
          this.attackCooldown = 55;
          // Stomp the ground
          if (!this.def.canFly) {
            this.stomp.active = true;
            this.stomp.timer = 0;
          }
          // Kaiju fire breath
          if (this.def.breathesFire && dist < this.def.fireBreathRange) {
            this.fireBreath.active = true;
            this.fireBreath.timer = 0;
            this.doFireBreath(hero, effectsArray);
          }
        }
        if (dist > this.def.width * 6) {
          this.state = 'chase';
        }
        break;
    }

    // Stomp ground pound
    if (this.stomp.active) {
      this.stomp.timer++;
      if (this.stomp.timer >= this.stomp.maxTimer) {
        this.stomp.active = false;
        this.doStomp(effectsArray);
      }
    }

    // Fire breath cooldown
    if (this.fireBreath.active && this.fireBreath.timer++ > 20) {
      this.fireBreath.active = false;
    }
    this.updateFireBreathSparks();

    // Physics
    this.applyPhysics();
    this.destroyTerrain();
  }

  // Destroy terrain cells the monster overlaps or stomps
  destroyTerrain() {
    if (!this.def.destroyRate || Math.random() > this.def.destroyRate) return;

    const grid = this.worldManager.grid;
    const cx = Math.floor(this.centerX);
    const cy = Math.floor(this.worldY + this.height);

    const { gx, gy, inBounds } = this.worldManager.worldToGrid(cx, cy);
    if (!inBounds) return;

    // Only destroy terrain directly under/around monster — not the sky!
    for (let dx2 = -1; dx2 <= 1; dx2++) {
      for (let dy2 = 0; dy2 <= 2; dy2++) {
        const ngx = gx + dx2;
        const ngy = gy + dy2;
        if (this.worldManager.grid.inBounds(ngx, ngy)) {
          const t = grid.getType(ngx, ngy);
          if (t === ELEMENTS.STONE || t === ELEMENTS.WOOD || t === ELEMENTS.GLASS) {
            grid.set(ngx, ngy, ELEMENTS.SMOKE);
          }
        }
      }
    }
  }

  // Ground stomp attack: shockwave into the grid
  doStomp(effectsArray) {
    const grid = this.worldManager.grid;
    const cx = Math.floor(this.centerX);
    const cy = Math.floor(this.worldY + this.height);
    const { gx, gy, inBounds } = this.worldManager.worldToGrid(cx, cy);
    if (inBounds) {
      grid.destroyRadius(gx, gy, this.def.destroyRadius, true);
    }
    // Add shockwave visual FX
    effectsArray.push({
      type: 'shockwave',
      x: this.centerX,
      y: this.worldY + this.height,
      radius: 4,
      maxRadius: this.def.destroyRadius + 10,
      life: 12,
      color: '#f97316',
    });
  }

  // Kaiju fire breath: scatter fire cells in hero's direction
  doFireBreath(hero, effectsArray) {
    const grid = this.worldManager.grid;
    const dx = hero.worldX - this.centerX;
    const dy = hero.worldY - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    for (let step = 4; step <= this.def.fireBreathRange; step += 3) {
      const wx = this.centerX + nx * step + (Math.random() - 0.5) * 8;
      const wy = this.centerY + ny * step + (Math.random() - 0.5) * 8;
      const { gx, gy, inBounds } = this.worldManager.worldToGrid(wx, wy);
      if (!inBounds) break;
      grid.set(gx, gy, ELEMENTS.FIRE);

      // Fire spark FX
      this.fireBreath.sparks.push({
        x: wx, y: wy,
        vx: nx * 2 + (Math.random() - 0.5),
        vy: ny * 2 + (Math.random() - 0.5) - 0.5,
        life: 14,
        color: Math.random() < 0.5 ? '#ff6a00' : '#ffe600',
      });
    }
  }

  updateFireBreathSparks() {
    for (let i = this.fireBreath.sparks.length - 1; i >= 0; i--) {
      const s = this.fireBreath.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.12;
      s.life--;
      if (s.life <= 0) this.fireBreath.sparks.splice(i, 1);
    }
  }

  // Physics: gravity, movement, ground collision
  applyPhysics() {
    if (this.def.canFly) {
      // Flying monsters hover and drift
      const heroOffset = this.worldManager && this.state === 'chase' ? 0 : 0;
      this.vy *= 0.88;
      if (this.worldY > WORLD_CONFIG.GROUND_LEVEL - 40) {
        this.vy -= 0.3; // Push back up
      }
    } else {
      // Gravity
      this.vy += CONFIG.GRAVITY * 0.85;
      if (this.vy > 7) this.vy = 7;
    }

    // Horizontal move
    this.worldX += this.vx;
    this.worldX = Math.max(this.worldManager.worldOriginX + 2, this.worldX);

    // Vertical move + ground check
    this.isGrounded = false;
    this.worldY += this.vy;

    // Simple terrain collision: land on solid pixel below
    const footX = Math.floor(this.centerX);
    const footY = Math.floor(this.worldY + this.height);
    const { gx, gy, inBounds } = this.worldManager.worldToGrid(footX, footY);

    if (inBounds) {
      const underType = this.worldManager.grid.getType(gx, gy);
      const underDef = ELEMENT_DEFS[underType];
      const isSolid = underDef && (underDef.category === CATEGORIES.SOLID || underDef.category === CATEGORIES.POWDER);

      if ((this.vy >= 0 && isSolid) || this.worldY + this.height >= WORLD_CONFIG.GROUND_LEVEL) {
        this.vy = 0;
        this.isGrounded = true;
        if (isSolid) {
          this.worldY = footY - this.height;
        } else {
          this.worldY = WORLD_CONFIG.GROUND_LEVEL - this.height;
        }
      }
    } else if (this.worldY + this.height >= WORLD_CONFIG.GROUND_LEVEL) {
      this.worldY = WORLD_CONFIG.GROUND_LEVEL - this.height;
      this.vy = 0;
      this.isGrounded = true;
    }
  }

  isSolid(wx, wy) {
    const { gx, gy, inBounds } = this.worldManager.worldToGrid(wx, wy);
    if (!inBounds) return false;
    const t = this.worldManager.grid.getType(gx, gy);
    const d = ELEMENT_DEFS[t];
    return d && (d.category === CATEGORIES.SOLID || d.category === CATEGORIES.POWDER);
  }

  // Render monster on canvas with camera offset
  render(ctx, cameraX) {
    if (this.isDead) return;

    const sx = Math.round(this.worldX - cameraX);
    const sy = Math.round(this.worldY);
    const w = this.width;
    const h = this.height;

    // Skip if off-screen
    if (sx + w < 0 || sx > 360) return;

    // Hit flash effect
    const flashAlpha = this.hitFlash > 0 ? (this.hitFlash % 2 === 0 ? 0.85 : 0.0) : 1.0;
    ctx.save();
    ctx.globalAlpha = flashAlpha;

    // Kaiju gets extra glow
    if (this.type === 'KAIJU') {
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 10;
    }

    // Body
    ctx.fillStyle = this.def.colorBody;
    ctx.fillRect(sx, sy + 4, w, h - 4);

    // Head
    ctx.fillStyle = this.def.colorDetail;
    ctx.fillRect(sx + 1, sy, w - 2, 6);

    // Eyes (glowing)
    ctx.fillStyle = this.def.colorEye;
    const eyeX = this.facing === 1 ? sx + w - 4 : sx + 2;
    ctx.fillRect(eyeX, sy + 1, 3, 2);

    // Flyer rotors / Kaiju spines
    if (this.def.canFly) {
      ctx.fillStyle = this.def.colorDetail;
      ctx.fillRect(sx - 3, sy + 2, 3, 2);
      ctx.fillRect(sx + w, sy + 2, 3, 2);
    }
    if (this.type === 'KAIJU') {
      // Back spines
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = this.def.colorDetail;
        ctx.fillRect(sx + w - 3 - i * 2, sy - 4 - i * 2, 2, 4 + i * 2);
      }
    }

    // Stomp wind-up animation
    if (this.stomp.active) {
      const chargeRatio = this.stomp.timer / this.stomp.maxTimer;
      ctx.fillStyle = `rgba(255, 100, 0, ${chargeRatio * 0.6})`;
      ctx.fillRect(sx - 4, sy - 4, w + 8, h + 8);
    }

    // Fire breath sparks
    ctx.shadowBlur = 0;
    for (const spark of this.fireBreath.sparks) {
      ctx.fillStyle = spark.color;
      ctx.fillRect(Math.round(spark.x - cameraX), Math.round(spark.y), 2, 2);
    }

    ctx.restore();

    // Health Bar
    if (this.hp < this.maxHp) {
      const barW = w + 4;
      const barH = 3;
      const barX = sx - 2;
      const barY = sy - 7;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(barX, barY, barW, barH);
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, Math.round(barW * hpRatio), barH);

      // Monster name label
      ctx.font = '4px monospace';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(this.def.name, barX, barY - 2);
    }
  }
}

// ========================== MONSTER MANAGER ================================
class MonsterManager {
  constructor(worldManager) {
    this.worldManager = worldManager;
    this.monsters = [];
    this.score = 0;
    this.killCount = 0;
  }

  // Spawn a monster in front of the hero
  spawn(type, hero) {
    const spawnDir = Math.random() < 0.5 ? 1 : -1;
    const spawnDist = 180 + Math.random() * 60;
    const def = MONSTER_TYPES[type];

    const wx = hero.worldX + spawnDir * spawnDist;
    let wy;
    if (def.canFly) {
      wy = WORLD_CONFIG.GROUND_LEVEL - 80 - Math.random() * 40;
    } else {
      wy = WORLD_CONFIG.GROUND_LEVEL - def.height - 5;
    }

    this.monsters.push(new Monster(type, wx, wy, this.worldManager));
  }

  // Spawn a wave of monsters
  spawnWave(hero) {
    this.spawn('STOMPER', hero);
    this.spawn('STOMPER', hero);
    this.spawn('FLYER', hero);
    this.spawn('BRUTE', hero);
  }

  // Apply damage to monsters hit by superpowers at world coordinate (cx, cy) within radius
  damageInRadius(cx, cy, radius, damage) {
    for (const m of this.monsters) {
      if (m.isDead) continue;
      const dx = m.centerX - cx;
      const dy = m.centerY - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        m.takeDamage(damage);
      }
    }
  }

  // Update all monsters and clean up dead ones
  update(hero, effectsArray) {
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.isDead) {
        m.deathTimer--;
        if (m.deathTimer <= 0) {
          this.score += m.def.score;
          this.killCount++;
          this.monsters.splice(i, 1);
        }
        continue;
      }
      m.update(hero, effectsArray);
    }
  }

  // Render all monsters
  render(ctx, cameraX) {
    for (const m of this.monsters) {
      m.render(ctx, cameraX);
    }
  }
}
