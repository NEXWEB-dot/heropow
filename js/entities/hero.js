/* ==========================================================================
   HERO POWDER — SUPERHERO PLAYER CONTROLLER & CAPE PHYSICS
   World-space physics, infinite terrain collision, supersonic flight & cape simulation
   ========================================================================== */

class Superhero {
  constructor(worldX, worldY, worldManager) {
    this.worldManager = worldManager;
    this.worldX = worldX;
    this.worldY = worldY;
    this.vx = 0;
    this.vy = 0;
    this.width = HERO_CONFIG.WIDTH;
    this.height = HERO_CONFIG.HEIGHT;

    this.isGrounded = false;
    this.isFlying = false;
    this.isSupersonic = false;
    this.facing = 1; // 1 = right, -1 = left
    this.auraTimer = 0;

    // Dynamic Cape Physics (world coordinates)
    this.cape = [
      { x: this.worldX, y: this.worldY + 2 },
      { x: this.worldX - 2, y: this.worldY + 5 },
      { x: this.worldX - 4, y: this.worldY + 9 },
      { x: this.worldX - 6, y: this.worldY + 13 },
    ];

    // Input States
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      boost: false, // Shift key for supersonic flight
    };
  }

  // Respawn superhero at specific world location
  respawn(worldX = 180, worldY = 60) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.vx = 0;
    this.vy = 0;
    this.isFlying = false;
    this.isGrounded = false;
    this.initCape();
  }

  initCape() {
    for (let i = 0; i < this.cape.length; i++) {
      this.cape[i].x = this.worldX - this.facing * (i * 2);
      this.cape[i].y = this.worldY + i * 3;
    }
  }

  // Update hero physics, inputs, and collision with cellular automata grid
  update() {
    this.auraTimer += 0.15;
    this.isSupersonic = this.isFlying && this.keys.boost;

    const maxSpeed = this.isSupersonic
      ? HERO_CONFIG.SUPER_FLY_SPEED
      : this.isFlying
      ? HERO_CONFIG.FLY_SPEED
      : HERO_CONFIG.WALK_SPEED;

    const accel = this.isSupersonic ? HERO_CONFIG.RUN_ACCEL * 1.8 : HERO_CONFIG.RUN_ACCEL;

    // 1. Horizontal Acceleration
    if (this.keys.left) {
      this.vx -= accel;
      this.facing = -1;
    } else if (this.keys.right) {
      this.vx += accel;
      this.facing = 1;
    } else {
      this.vx *= HERO_CONFIG.FRICTION;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }

    this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

    // 2. Flight vs Gravity
    if (this.isFlying) {
      if (this.keys.up || this.keys.jump) {
        this.vy -= accel * 1.2;
      } else if (this.keys.down) {
        this.vy += accel * 1.2;
      } else {
        this.vy *= 0.85; // Hover damping
        if (Math.abs(this.vy) < 0.05) this.vy = 0;
      }
      this.vy = Math.max(-maxSpeed, Math.min(maxSpeed, this.vy));
    } else {
      // Normal Gravity
      this.vy += CONFIG.GRAVITY;
      if (this.vy > HERO_CONFIG.MAX_FALL_SPEED) {
        this.vy = HERO_CONFIG.MAX_FALL_SPEED;
      }

      // Jump
      if ((this.keys.jump || this.keys.up) && this.isGrounded) {
        this.vy = HERO_CONFIG.JUMP_POWER;
        this.isGrounded = false;
      }
    }

    // 3. Move & Collide with Infinite Terrain
    this.moveAndCollide();

    // 4. Update Cape Physics
    this.updateCape();
  }

  // Check if cell at world coordinates is solid
  isSolidWorld(wx, wy) {
    if (wy >= WORLD_CONFIG.GROUND_LEVEL + 10) return true; // Below underground bedrock
    if (wy < 0) return false; // Open sky

    const { gx, gy, inBounds } = this.worldManager.worldToGrid(wx, wy);
    if (!inBounds) return false;

    const type = this.worldManager.grid.getType(gx, gy);
    if (type === ELEMENTS.AIR || type === ELEMENTS.SMOKE || type === ELEMENTS.STEAM) return false;

    const def = ELEMENT_DEFS[type];
    if (!def) return false;

    return def.category === CATEGORIES.SOLID || def.category === CATEGORIES.POWDER;
  }

  // Move hero and handle destruction penetration / collision
  moveAndCollide() {
    const grid = this.worldManager.grid;

    // Horizontal Movement
    this.worldX += this.vx;
    if (this.checkCollision()) {
      // Step up small bumps (1-2 pixels) for stairs and slopes
      let stepped = false;
      for (let step = 1; step <= 2; step++) {
        this.worldY -= step;
        if (!this.checkCollision()) {
          stepped = true;
          break;
        }
        this.worldY += step;
      }

      if (!stepped) {
        // High-speed flight smashes through walls!
        if (Math.abs(this.vx) > 3.0) {
          const smashX = this.worldX + (this.vx > 0 ? this.width : 0);
          const { gx, gy, inBounds } = this.worldManager.worldToGrid(smashX, this.worldY + this.height / 2);
          if (inBounds) {
            grid.destroyRadius(gx, gy, 8, true);
          }
        } else {
          this.worldX -= this.vx;
          this.vx = 0;
        }
      }
    }

    // Vertical Movement
    this.isGrounded = false;
    this.worldY += this.vy;

    if (this.checkCollision()) {
      if (this.vy > 0) {
        // Landing on ground or roof
        this.isGrounded = true;

        // Meteor Stomp impact crater when falling fast!
        if (this.vy > 5.0) {
          const { gx, gy, inBounds } = this.worldManager.worldToGrid(this.worldX + this.width / 2, this.worldY + this.height);
          if (inBounds) {
            grid.destroyRadius(gx, gy, 14, true);
          }
        }

        this.worldY -= this.vy;
        this.vy = 0;
      } else if (this.vy < 0) {
        // Hitting ceiling
        if (this.isFlying && this.vy < -3.0) {
          const { gx, gy, inBounds } = this.worldManager.worldToGrid(this.worldX + this.width / 2, this.worldY);
          if (inBounds) {
            grid.destroyRadius(gx, gy, 8);
          }
        } else {
          this.worldY -= this.vy;
          this.vy = 0;
        }
      }
    }

    // Keep above bedrock
    if (this.worldY + this.height > WORLD_CONFIG.GROUND_LEVEL + 8) {
      this.worldY = WORLD_CONFIG.GROUND_LEVEL + 8 - this.height;
      this.vy = 0;
      this.isGrounded = true;
    }
  }

  // Check collision bounding box
  checkCollision() {
    const startX = Math.floor(this.worldX);
    const endX = Math.floor(this.worldX + this.width);
    const startY = Math.floor(this.worldY);
    const endY = Math.floor(this.worldY + this.height);

    for (let py = startY; py <= endY; py++) {
      for (let px = startX; px <= endX; px++) {
        if (this.isSolidWorld(px, py)) {
          return true;
        }
      }
    }
    return false;
  }

  // Dynamic spring cape simulation in world space
  updateCape() {
    const anchorX = this.facing === 1 ? this.worldX + 1 : this.worldX + this.width - 1;
    const anchorY = this.worldY + 2;

    this.cape[0].x = anchorX;
    this.cape[0].y = anchorY;

    const flutter = Math.sin(this.auraTimer * 2.5) * (this.isSupersonic ? 2.5 : this.isFlying ? 1.5 : 0.6);

    for (let i = 1; i < this.cape.length; i++) {
      const prev = this.cape[i - 1];
      const curr = this.cape[i];

      let targetX = prev.x - this.facing * 2.5 - this.vx * 1.6;
      let targetY = prev.y + 3.0 - this.vy * 0.8 + flutter;

      curr.x += (targetX - curr.x) * 0.45;
      curr.y += (targetY - curr.y) * 0.45;
    }
  }

  // Render superhero and cape on Canvas 2D relative to camera
  render(ctx, cameraX) {
    const screenX = Math.round(this.worldX - cameraX);
    const screenY = Math.round(this.worldY);

    // 1. Render Flowing Cape
    for (let i = 0; i < this.cape.length - 1; i++) {
      const p1 = this.cape[i];
      const p2 = this.cape[i + 1];
      ctx.beginPath();
      ctx.strokeStyle = i % 2 === 0 ? '#ef4444' : '#b91c1c';
      ctx.lineWidth = Math.max(1, 3 - i * 0.5);
      ctx.moveTo(Math.round(p1.x - cameraX), Math.round(p1.y));
      ctx.lineTo(Math.round(p2.x - cameraX), Math.round(p2.y));
      ctx.stroke();
    }

    // 2. Render Supersonic Shockwave Cone & Aura
    if (this.isSupersonic) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenX + this.width / 2, screenY + this.height / 2, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (this.isFlying) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
      ctx.lineWidth = 1;
      const auraPulse = Math.sin(this.auraTimer * 3) * 1.5;
      ctx.strokeRect(screenX - 2 - auraPulse, screenY - 2 - auraPulse, this.width + 4 + auraPulse * 2, this.height + 4 + auraPulse * 2);
      ctx.restore();
    }

    // 3. Render Hero Pixel Body
    // Suit Body (Electric Blue)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(screenX, screenY + 4, this.width, this.height - 4);

    // Head / Mask
    ctx.fillStyle = '#fde047'; // Blonde/gold hero hair
    ctx.fillRect(screenX + 1, screenY, this.width - 2, 2);
    ctx.fillStyle = '#fed7aa'; // Skin face
    ctx.fillRect(screenX + 1, screenY + 2, this.width - 2, 2);

    // Glowing Laser Eyes
    ctx.fillStyle = '#00f0ff';
    const eyeOffset = this.facing === 1 ? this.width - 2 : 1;
    ctx.fillRect(screenX + eyeOffset, screenY + 2, 2, 1);

    // Gold Belt
    ctx.fillStyle = '#eab308';
    ctx.fillRect(screenX + 1, screenY + 7, this.width - 2, 2);

    // Boots (Crimson Red)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(screenX + 1, screenY + this.height - 2, 2, 2);
    ctx.fillRect(screenX + this.width - 3, screenY + this.height - 2, 2, 2);
  }
}
