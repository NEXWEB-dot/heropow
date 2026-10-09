/* ==========================================================================
   HERO POWDER — SIMULATION GRID & BUFFER RENDERER
   TypedArray memory grid with direct Uint32Array canvas pixel rendering
   ========================================================================== */

class SimulationGrid {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.size = width * height;

    // Fast Typed Array Buffers
    this.typeGrid = new Uint8Array(this.size);
    this.colorGrid = new Uint32Array(this.size);
    this.lifeGrid = new Uint8Array(this.size);
    this.updatedGrid = new Uint8Array(this.size);

    this.frameId = 1;
    this.particleCount = 0;

    // Direct Canvas ImageData Buffer
    this.imageData = null;
    this.screenPixels = null;
  }

  // Initialize canvas rendering context buffer
  initRenderer(ctx) {
    this.imageData = ctx.createImageData(this.width, this.height);
    this.screenPixels = new Uint32Array(this.imageData.data.buffer);
  }

  // Boundary check
  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // Get index from (x, y)
  getIndex(x, y) {
    return y * this.width + x;
  }

  // Get element type at (x, y)
  getType(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return ELEMENTS.STONE; // Treat out-of-bounds as solid boundary
    }
    return this.typeGrid[y * this.width + x];
  }

  // Set cell at (x, y)
  set(x, y, type, color = null, life = 0) {
    if (!this.inBounds(x, y)) return false;
    const idx = y * this.width + x;

    this.typeGrid[idx] = type;
    this.colorGrid[idx] = color !== null ? color : getElementColor(type);
    this.lifeGrid[idx] = life > 0 ? life : getElementInitialLife(type);
    this.updatedGrid[idx] = this.frameId;
    return true;
  }

  // Clear a cell to AIR
  clearCell(x, y) {
    if (!this.inBounds(x, y)) return;
    const idx = y * this.width + x;
    this.typeGrid[idx] = ELEMENTS.AIR;
    this.colorGrid[idx] = 0;
    this.lifeGrid[idx] = 0;
  }

  // Swap two cells (for sinking powder & rising fluids)
  swap(x1, y1, x2, y2) {
    if (!this.inBounds(x1, y1) || !this.inBounds(x2, y2)) return;
    const idx1 = y1 * this.width + x1;
    const idx2 = y2 * this.width + x2;

    const t1 = this.typeGrid[idx1];
    const c1 = this.colorGrid[idx1];
    const l1 = this.lifeGrid[idx1];

    this.typeGrid[idx1] = this.typeGrid[idx2];
    this.colorGrid[idx1] = this.colorGrid[idx2];
    this.lifeGrid[idx1] = this.lifeGrid[idx2];

    this.typeGrid[idx2] = t1;
    this.colorGrid[idx2] = c1;
    this.lifeGrid[idx2] = l1;

    this.updatedGrid[idx1] = this.frameId;
    this.updatedGrid[idx2] = this.frameId;
  }

  // Move particle from (x1, y1) to (x2, y2)
  move(x1, y1, x2, y2) {
    if (!this.inBounds(x1, y1) || !this.inBounds(x2, y2)) return;
    const idx1 = y1 * this.width + x1;
    const idx2 = y2 * this.width + x2;

    this.typeGrid[idx2] = this.typeGrid[idx1];
    this.colorGrid[idx2] = this.colorGrid[idx1];
    this.lifeGrid[idx2] = this.lifeGrid[idx1];
    this.updatedGrid[idx2] = this.frameId;

    this.typeGrid[idx1] = ELEMENTS.AIR;
    this.colorGrid[idx1] = 0;
    this.lifeGrid[idx1] = 0;
  }

  // Check if cell was already updated in the current frame
  isUpdated(x, y) {
    if (!this.inBounds(x, y)) return true;
    return this.updatedGrid[y * this.width + x] === this.frameId;
  }

  markUpdated(x, y) {
    if (this.inBounds(x, y)) {
      this.updatedGrid[y * this.width + x] = this.frameId;
    }
  }

  // Advance simulation frame tick
  beginFrame() {
    this.frameId = (this.frameId + 1) & 0xff; // Wrap around 255
    if (this.frameId === 0) this.frameId = 1;
  }

  // Clear entire grid
  clearAll() {
    this.typeGrid.fill(ELEMENTS.AIR);
    this.colorGrid.fill(0);
    this.lifeGrid.fill(0);
    this.updatedGrid.fill(0);
    this.particleCount = 0;
  }

  // Draw circular brush
  drawCircle(cx, cy, radius, type) {
    const r2 = radius * radius;
    const startX = Math.max(0, Math.floor(cx - radius));
    const endX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const startY = Math.max(0, Math.floor(cy - radius));
    const endY = Math.min(this.height - 1, Math.ceil(cy + radius));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          if (type === ELEMENTS.AIR) {
            this.clearCell(x, y);
          } else {
            // Apply slight noise for natural powder look
            if (Math.random() > 0.08 || radius <= 1) {
              this.set(x, y, type);
            }
          }
        }
      }
    }
  }

  // Radial destruction zone (for superhero punches, meteors, lasers)
  destroyRadius(cx, cy, radius, turnToFire = false) {
    const r2 = radius * radius;
    const startX = Math.max(0, Math.floor(cx - radius));
    const endX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const startY = Math.max(0, Math.floor(cy - radius));
    const endY = Math.min(this.height - 1, Math.ceil(cy + radius));

    let destroyed = 0;
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq <= r2) {
          const type = this.getType(x, y);
          if (type !== ELEMENTS.AIR) {
            destroyed++;
            if (turnToFire && Math.random() < 0.25) {
              this.set(x, y, ELEMENTS.FIRE);
            } else if (Math.random() < 0.15) {
              this.set(x, y, ELEMENTS.SMOKE);
            } else {
              this.clearCell(x, y);
            }
          }
        }
      }
    }
    return destroyed;
  }

  // Count active particles and write colors into screen buffer
  renderToBuffer(ctx) {
    let count = 0;
    const len = this.size;
    const types = this.typeGrid;
    const colors = this.colorGrid;
    const pixels = this.screenPixels;

    for (let i = 0; i < len; i++) {
      if (types[i] !== ELEMENTS.AIR) {
        pixels[i] = colors[i];
        count++;
      } else {
        pixels[i] = 0xff000000; // Solid black background (ABGR little endian)
      }
    }

    this.particleCount = count;
    ctx.putImageData(this.imageData, 0, 0);
  }
}
