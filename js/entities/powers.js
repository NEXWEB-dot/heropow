/* ==========================================================================
   HERO POWDER — SUPERHERO DESTRUCTION POWERS & VISUAL FX
   World-space superpowers: raycast laser, kinetic shockwave, singularity vortex & cryo freeze
   ========================================================================== */

class SuperpowerSystem {
  constructor(worldManager, hero) {
    this.worldManager = worldManager;
    this.hero = hero;
    this.activePower = 'laser';
    this.effects = []; // Visual FX (in world coordinates)
  }

  setPower(powerKey) {
    this.activePower = powerKey;
  }

  // Trigger active superpower towards target world coordinates (tx, ty)
  trigger(tx, ty) {
    switch (this.activePower) {
      case 'laser':
        this.fireLaser(tx, ty);
        break;
      case 'smash':
        this.kineticSmash(tx, ty);
        break;
      case 'disintegrate':
        this.singularityVortex(tx, ty);
        break;
      case 'freeze':
        this.cryoFreeze(tx, ty);
        break;
      case 'stomp':
        this.meteorStomp();
        break;
    }
  }

  // --- 1. Heat Vision / Laser Eyes ---
  fireLaser(targetWorldX, targetWorldY) {
    const eyeWorldX = this.hero.worldX + (this.hero.facing === 1 ? this.hero.width : 0);
    const eyeWorldY = this.hero.worldY + 2;

    const dx = targetWorldX - eyeWorldX;
    const dy = targetWorldY - eyeWorldY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const steps = Math.min(dist, 260);
    const stepX = dx / dist;
    const stepY = dy / dist;
    const grid = this.worldManager.grid;

    // Laser beam raycast through world space
    for (let i = 0; i <= steps; i++) {
      const wx = eyeWorldX + stepX * i;
      const wy = eyeWorldY + stepY * i;

      const { gx, gy, inBounds } = this.worldManager.worldToGrid(wx, wy);
      if (!inBounds) break;

      const type = grid.getType(gx, gy);
      if (type !== ELEMENTS.AIR) {
        // High heat destruction
        if (type === ELEMENTS.GUNPOWDER || type === ELEMENTS.C4) {
          grid.set(gx, gy, ELEMENTS.FIRE); // Triggers explosive chain!
          break;
        } else if (type === ELEMENTS.WATER) {
          grid.set(gx, gy, ELEMENTS.STEAM);
        } else if (type === ELEMENTS.ICE) {
          grid.set(gx, gy, ELEMENTS.WATER);
        } else if (type === ELEMENTS.SAND) {
          grid.set(gx, gy, Math.random() < 0.4 ? ELEMENTS.GLASS : ELEMENTS.LAVA);
        } else if (type === ELEMENTS.WOOD || type === ELEMENTS.PLANT || type === ELEMENTS.OIL) {
          grid.set(gx, gy, ELEMENTS.FIRE);
        } else if (type === ELEMENTS.STONE) {
          if (Math.random() < 0.6) {
            grid.set(gx, gy, ELEMENTS.LAVA);
          } else {
            grid.clearCell(gx, gy);
          }
        } else {
          grid.clearCell(gx, gy);
        }

        // Add impact sparks in world coordinates
        this.addSpark(wx, wy, -stepX * 2 + (Math.random() - 0.5), -stepY * 2 + (Math.random() - 0.5), '#ff2a5f');
      }
    }

    // Add visual laser beam FX
    this.effects.push({
      type: 'laser',
      x1: eyeWorldX,
      y1: eyeWorldY,
      x2: eyeWorldX + stepX * steps,
      y2: eyeWorldY + stepY * steps,
      life: 3,
      color: '#ff1744',
    });
  }

  // --- 2. Kinetic Shockwave Punch ---
  kineticSmash(targetWorldX, targetWorldY) {
    const radius = HERO_CONFIG.SMASH_RADIUS;
    const { gx, gy, inBounds } = this.worldManager.worldToGrid(targetWorldX, targetWorldY);
    if (inBounds) {
      this.worldManager.grid.destroyRadius(gx, gy, radius, false);
    }

    // Shockwave distortion ring FX in world coordinates
    this.effects.push({
      type: 'shockwave',
      x: targetWorldX,
      y: targetWorldY,
      radius: 4,
      maxRadius: radius + 10,
      life: 14,
      color: '#00f0ff',
    });

    // Scatter debris sparks
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.addSpark(
        targetWorldX,
        targetWorldY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#f59e0b'
      );
    }
  }

  // --- 3. Singularity / Black Hole Matter Annihilation ---
  singularityVortex(targetWorldX, targetWorldY) {
    const radius = HERO_CONFIG.SINGULARITY_RADIUS;
    const r2 = radius * radius;
    const grid = this.worldManager.grid;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq > r2 || distSq === 0) continue;

        const wx = targetWorldX + dx;
        const wy = targetWorldY + dy;

        const { gx, gy, inBounds } = this.worldManager.worldToGrid(wx, wy);
        if (!inBounds) continue;

        const type = grid.getType(gx, gy);
        if (type !== ELEMENTS.AIR) {
          if (distSq < 16) {
            grid.clearCell(gx, gy);
          } else {
            const dist = Math.sqrt(distSq);
            const pullWx = Math.round(wx - (dx / dist) * 1.6);
            const pullWy = Math.round(wy - (dy / dist) * 1.6);

            const dest = this.worldManager.worldToGrid(pullWx, pullWy);
            if (dest.inBounds && grid.getType(dest.gx, dest.gy) === ELEMENTS.AIR) {
              grid.move(gx, gy, dest.gx, dest.gy);
            }
          }
        }
      }
    }

    // Swirling black hole visual FX
    this.effects.push({
      type: 'singularity',
      x: targetWorldX,
      y: targetWorldY,
      radius: radius,
      life: 8,
      rotation: Math.random() * Math.PI,
    });
  }

  // --- 4. Cryo Freeze Breath ---
  cryoFreeze(targetWorldX, targetWorldY) {
    const radius = HERO_CONFIG.FREEZE_RADIUS;
    const r2 = radius * radius;
    const grid = this.worldManager.grid;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;

        const wx = targetWorldX + dx;
        const wy = targetWorldY + dy;

        const { gx, gy, inBounds } = this.worldManager.worldToGrid(wx, wy);
        if (!inBounds) continue;

        const type = grid.getType(gx, gy);

        if (type === ELEMENTS.WATER) {
          grid.set(gx, gy, ELEMENTS.ICE);
        } else if (type === ELEMENTS.LAVA) {
          grid.set(gx, gy, ELEMENTS.STONE);
        } else if (type === ELEMENTS.FIRE || type === ELEMENTS.EMBER) {
          grid.set(gx, gy, ELEMENTS.SMOKE);
        } else if (type === ELEMENTS.STEAM) {
          grid.set(gx, gy, Math.random() < 0.5 ? ELEMENTS.WATER : ELEMENTS.ICE);
        }
      }
    }

    this.effects.push({
      type: 'frost',
      x: targetWorldX,
      y: targetWorldY,
      radius: radius,
      life: 10,
    });
  }

  // --- 5. Meteor Stomp Activation ---
  meteorStomp() {
    this.hero.isFlying = false;
    this.hero.vy = 9.0; // Supersonic rocket dive!
    this.hero.vx = 0;
  }

  // Helper: Spawn flying FX particle
  addSpark(worldX, worldY, vx, vy, color) {
    this.effects.push({
      type: 'spark',
      x: worldX,
      y: worldY,
      vx,
      vy,
      color,
      life: 12 + Math.floor(Math.random() * 8),
    });
  }

  // Update & Render Superpower Visual FX with Camera Offset
  updateAndRenderFX(ctx, cameraX) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life--;

      if (fx.life <= 0) {
        this.effects.splice(i, 1);
        continue;
      }

      ctx.save();
      if (fx.type === 'laser') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(Math.round(fx.x1 - cameraX), Math.round(fx.y1));
        ctx.lineTo(Math.round(fx.x2 - cameraX), Math.round(fx.y2));
        ctx.stroke();
      } else if (fx.type === 'shockwave') {
        fx.radius += (fx.maxRadius - fx.radius) * 0.25;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = fx.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(Math.round(fx.x - cameraX), Math.round(fx.y), fx.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === 'singularity') {
        const sx = Math.round(fx.x - cameraX);
        const sy = Math.round(fx.y);
        ctx.fillStyle = '#050510';
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 10, fx.rotation, fx.rotation + Math.PI * 1.5);
        ctx.stroke();
        fx.rotation += 0.4;
      } else if (fx.type === 'frost') {
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(Math.round(fx.x - cameraX), Math.round(fx.y), fx.radius * (1 - fx.life / 10), 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === 'spark') {
        fx.x += fx.vx;
        fx.y += fx.vy;
        fx.vy += 0.15;
        ctx.fillStyle = fx.color;
        ctx.fillRect(Math.round(fx.x - cameraX), Math.round(fx.y), 1.5, 1.5);
      }
      ctx.restore();
    }
  }
}
