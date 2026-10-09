/* ==========================================================================
   HERO POWDER — CELLULAR AUTOMATA SIMULATION ENGINE
   Granular falling sand, fluid dynamics, thermodynamics & chemical reactions
   ========================================================================== */

class PhysicsEngine {
  constructor(grid) {
    this.grid = grid;
    this.sweepDir = 0; // Alternates 0 and 1 to prevent left/right bias
  }

  // Execute one cellular automata physics tick
  update() {
    this.grid.beginFrame();
    this.sweepDir = 1 - this.sweepDir;

    const width = this.grid.width;
    const height = this.grid.height;

    // Scan bottom-to-top so falling particles only move once per frame
    for (let y = height - 1; y >= 0; y--) {
      // Alternate horizontal scan direction to prevent diagonal flow bias
      if (this.sweepDir === 0) {
        for (let x = 0; x < width; x++) {
          this.updateCell(x, y);
        }
      } else {
        for (let x = width - 1; x >= 0; x--) {
          this.updateCell(x, y);
        }
      }
    }
  }

  // Update an individual cell
  updateCell(x, y) {
    if (this.grid.isUpdated(x, y)) return;

    const type = this.grid.getType(x, y);
    if (type === ELEMENTS.AIR || type === ELEMENTS.STONE || type === ELEMENTS.GLASS) {
      return; // Immobile solids or empty space
    }

    const def = ELEMENT_DEFS[type];
    if (!def) return;

    switch (def.category) {
      case CATEGORIES.POWDER:
        this.updatePowder(x, y, def);
        break;
      case CATEGORIES.LIQUID:
        this.updateLiquid(x, y, def);
        break;
      case CATEGORIES.GAS:
        this.updateGas(x, y, def);
        break;
      case CATEGORIES.ENERGY:
        this.updateEnergy(x, y, def);
        break;
      case CATEGORIES.SOLID:
        this.updateReactiveSolid(x, y, def);
        break;
    }
  }

  // --- Falling Sand / Granular Powder Mechanics ---
  updatePowder(x, y, def) {
    const belowY = y + 1;
    if (belowY >= this.grid.height) return;

    const belowType = this.grid.getType(x, belowY);

    // 1. Fall directly down if empty
    if (belowType === ELEMENTS.AIR) {
      this.grid.move(x, y, x, belowY);
      return;
    }

    // 2. Sink through lighter liquids (e.g. sand sinks in water)
    const belowDef = ELEMENT_DEFS[belowType];
    if (belowDef && belowDef.category === CATEGORIES.LIQUID && def.density > belowDef.density) {
      this.grid.swap(x, y, x, belowY);
      return;
    }

    // 3. Slide down-left or down-right diagonally (45-degree angle of repose)
    const dir = Math.random() < 0.5 ? -1 : 1;
    const dirs = [dir, -dir];

    for (const d of dirs) {
      const nx = x + d;
      if (nx >= 0 && nx < this.grid.width) {
        const diagType = this.grid.getType(nx, belowY);
        if (diagType === ELEMENTS.AIR) {
          this.grid.move(x, y, nx, belowY);
          return;
        }
        const diagDef = ELEMENT_DEFS[diagType];
        if (diagDef && diagDef.category === CATEGORIES.LIQUID && def.density > diagDef.density) {
          this.grid.swap(x, y, nx, belowY);
          return;
        }
      }
    }
  }

  // --- Liquid Flow & Density Displacement ---
  updateLiquid(x, y, def) {
    const type = this.grid.getType(x, y);

    // Acid corrosion check
    if (type === ELEMENTS.ACID) {
      if (this.handleAcidReactions(x, y)) return;
    }

    // Lava thermal reactions
    if (type === ELEMENTS.LAVA) {
      if (this.handleLavaReactions(x, y)) return;
    }

    const belowY = y + 1;

    // 1. Fall down
    if (belowY < this.grid.height) {
      const belowType = this.grid.getType(x, belowY);
      if (belowType === ELEMENTS.AIR) {
        this.grid.move(x, y, x, belowY);
        return;
      }
      const belowDef = ELEMENT_DEFS[belowType];
      if (belowDef && belowDef.category === CATEGORIES.LIQUID && def.density > belowDef.density) {
        this.grid.swap(x, y, x, belowY);
        return;
      }
    }

    // 2. Diagonal slide
    if (belowY < this.grid.height) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const dirs = [dir, -dir];
      for (const d of dirs) {
        const nx = x + d;
        if (nx >= 0 && nx < this.grid.width) {
          const diagType = this.grid.getType(nx, belowY);
          if (diagType === ELEMENTS.AIR) {
            this.grid.move(x, y, nx, belowY);
            return;
          }
          const diagDef = ELEMENT_DEFS[diagType];
          if (diagDef && diagDef.category === CATEGORIES.LIQUID && def.density > diagDef.density) {
            this.grid.swap(x, y, nx, belowY);
            return;
          }
        }
      }
    }

    // 3. Horizontal dispersion (surface leveling)
    const disp = def.dispersion || 2;
    const hDir = Math.random() < 0.5 ? -1 : 1;
    const hDirs = [hDir, -hDir];

    for (const d of hDirs) {
      for (let step = 1; step <= disp; step++) {
        const nx = x + d * step;
        if (nx < 0 || nx >= this.grid.width) break;

        const sideType = this.grid.getType(nx, y);
        if (sideType === ELEMENTS.AIR) {
          this.grid.move(x, y, nx, y);
          return;
        }
        const sideDef = ELEMENT_DEFS[sideType];
        if (sideDef && sideDef.category === CATEGORIES.LIQUID && def.density > sideDef.density) {
          this.grid.swap(x, y, nx, y);
          return;
        }
        if (sideDef && (sideDef.category === CATEGORIES.SOLID || sideDef.category === CATEGORIES.POWDER)) {
          break; // Blocked by terrain
        }
      }
    }
  }

  // --- Rising Gases (Smoke, Steam) ---
  updateGas(x, y, def) {
    const idx = this.grid.getIndex(x, y);
    if (this.grid.lifeGrid[idx] > 0) {
      this.grid.lifeGrid[idx]--;
      if (this.grid.lifeGrid[idx] <= 0) {
        this.grid.clearCell(x, y);
        return;
      }
    }

    const aboveY = y - 1;
    if (aboveY < 0) {
      this.grid.clearCell(x, y); // Escapes screen top
      return;
    }

    // Rise straight up
    if (this.grid.getType(x, aboveY) === ELEMENTS.AIR) {
      this.grid.move(x, y, x, aboveY);
      return;
    }

    // Rise diagonally or drift sideways
    const dir = Math.random() < 0.5 ? -1 : 1;
    const dirs = [dir, -dir];
    for (const d of dirs) {
      const nx = x + d;
      if (nx >= 0 && nx < this.grid.width) {
        if (this.grid.getType(nx, aboveY) === ELEMENTS.AIR) {
          this.grid.move(x, y, nx, aboveY);
          return;
        }
        if (Math.random() < 0.3 && this.grid.getType(nx, y) === ELEMENTS.AIR) {
          this.grid.move(x, y, nx, y);
          return;
        }
      }
    }
  }

  // --- Energy & Fire Mechanics ---
  updateEnergy(x, y, def) {
    const idx = this.grid.getIndex(x, y);
    if (this.grid.lifeGrid[idx] > 0) {
      this.grid.lifeGrid[idx]--;
      if (this.grid.lifeGrid[idx] <= 0) {
        // Chance to turn dying fire into smoke
        if (Math.random() < 0.4) {
          this.grid.set(x, y, ELEMENTS.SMOKE);
        } else {
          this.grid.clearCell(x, y);
        }
        return;
      }
    }

    // Check neighbors to ignite flammable materials
    const neighbors = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    for (const [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.grid.inBounds(nx, ny)) continue;

      const nType = this.grid.getType(nx, ny);

      // Gunpowder Explosion!
      if (nType === ELEMENTS.GUNPOWDER) {
        this.triggerExplosion(nx, ny, 16);
        return;
      }

      // C4 Massive Explosion!
      if (nType === ELEMENTS.C4) {
        this.triggerExplosion(nx, ny, 34);
        return;
      }

      // Burn wood or plant
      if (nType === ELEMENTS.WOOD || nType === ELEMENTS.PLANT) {
        if (Math.random() < 0.2) {
          this.grid.set(nx, ny, ELEMENTS.FIRE);
        }
      }

      // Ignite Oil
      if (nType === ELEMENTS.OIL) {
        this.grid.set(nx, ny, ELEMENTS.FIRE);
      }

      // Melt Ice into Water
      if (nType === ELEMENTS.ICE) {
        if (Math.random() < 0.15) {
          this.grid.set(nx, ny, ELEMENTS.WATER);
        }
      }

      // Water extinguishes Fire
      if (nType === ELEMENTS.WATER) {
        this.grid.set(x, y, ELEMENTS.STEAM);
        if (Math.random() < 0.3) {
          this.grid.clearCell(nx, ny);
        }
        return;
      }
    }

    // Flickering motion upwards
    const aboveY = y - 1;
    if (aboveY >= 0 && Math.random() < 0.4) {
      const driftX = x + (Math.random() < 0.5 ? -1 : 1);
      if (this.grid.inBounds(driftX, aboveY) && this.grid.getType(driftX, aboveY) === ELEMENTS.AIR) {
        this.grid.move(x, y, driftX, aboveY);
      }
    }
  }

  // --- Reactive Solids (Plant growth, Ice melting) ---
  updateReactiveSolid(x, y, def) {
    const type = this.grid.getType(x, y);

    // Plant growth near water
    if (type === ELEMENTS.PLANT) {
      if (Math.random() < 0.015) {
        const neighbors = [[0, -1], [-1, 0], [1, 0]];
        for (const [dx, dy] of neighbors) {
          const nx = x + dx;
          const ny = y + dy;
          if (this.grid.inBounds(nx, ny) && this.grid.getType(nx, ny) === ELEMENTS.WATER) {
            this.grid.set(nx, ny, ELEMENTS.PLANT);
            break;
          }
        }
      }
    }
  }

  // --- Acid Dissolution Logic ---
  handleAcidReactions(x, y) {
    const neighbors = [[0, 1], [-1, 0], [1, 0], [0, -1]];
    for (const [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.grid.inBounds(nx, ny)) continue;

      const nType = this.grid.getType(nx, ny);
      if (nType === ELEMENTS.AIR || nType === ELEMENTS.ACID || nType === ELEMENTS.GLASS || nType === ELEMENTS.STONE) {
        continue; // Acid cannot eat stone or glass
      }

      const nDef = ELEMENT_DEFS[nType];
      if (nDef && nDef.corrodible) {
        if (Math.random() < 0.7) {
          this.grid.clearCell(nx, ny);
          this.grid.set(x, y, ELEMENTS.SMOKE);
          return true; // Acid consumed itself dissolving the element
        }
      }
    }
    return false;
  }

  // --- Lava Thermal Reactions ---
  handleLavaReactions(x, y) {
    const neighbors = [[0, 1], [-1, 0], [1, 0], [0, -1]];
    for (const [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.grid.inBounds(nx, ny)) continue;

      const nType = this.grid.getType(nx, ny);

      // Lava + Water = Stone & Steam!
      if (nType === ELEMENTS.WATER) {
        this.grid.set(x, y, ELEMENTS.STONE);
        this.grid.set(nx, ny, ELEMENTS.STEAM);
        return true;
      }

      // Lava melts Ice
      if (nType === ELEMENTS.ICE) {
        this.grid.set(nx, ny, ELEMENTS.STEAM);
      }

      // Lava ignites explosives
      if (nType === ELEMENTS.GUNPOWDER || nType === ELEMENTS.C4) {
        this.triggerExplosion(nx, ny, nType === ELEMENTS.C4 ? 36 : 18);
        return true;
      }

      // Lava burns flammable solids
      const nDef = ELEMENT_DEFS[nType];
      if (nDef && nDef.flammable) {
        this.grid.set(nx, ny, ELEMENTS.FIRE);
      }
    }
    return false;
  }

  // --- Radial Explosions (Gunpowder, C4, Hero Smashes) ---
  triggerExplosion(cx, cy, radius) {
    const r2 = radius * radius;
    const startX = Math.max(0, Math.floor(cx - radius));
    const endX = Math.min(this.grid.width - 1, Math.ceil(cx + radius));
    const startY = Math.max(0, Math.floor(cy - radius));
    const endY = Math.min(this.grid.height - 1, Math.ceil(cy + radius));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;

        if (distSq <= r2) {
          const type = this.grid.getType(x, y);

          // Chain reaction for explosives
          if (type === ELEMENTS.GUNPOWDER && (dx !== 0 || dy !== 0) && Math.random() < 0.25) {
            this.triggerExplosion(x, y, 14);
            continue;
          }

          if (type === ELEMENTS.C4 && (dx !== 0 || dy !== 0)) {
            this.triggerExplosion(x, y, 30);
            continue;
          }

          // Inner blast vaporizes everything
          if (distSq < r2 * 0.45) {
            if (Math.random() < 0.3) {
              this.grid.set(x, y, ELEMENTS.FIRE);
            } else {
              this.grid.clearCell(x, y);
            }
          }
          // Outer blast scatters fire, embers and smoke
          else if (Math.random() < 0.6) {
            if (Math.random() < 0.4) {
              this.grid.set(x, y, ELEMENTS.FIRE);
            } else if (Math.random() < 0.5) {
              this.grid.set(x, y, ELEMENTS.SMOKE);
            } else {
              this.grid.set(x, y, ELEMENTS.EMBER);
            }
          }
        }
      }
    }
  }
}
