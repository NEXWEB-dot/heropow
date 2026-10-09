/* ==========================================================================
   HERO POWDER — INFINITE WORLD STREAMING & DAYTIME METROPOLIS SKY
   Seamless chunk loading, camera follow, multi-layer parallax skyline & sky renderer
   ========================================================================== */

class WorldManager {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;

    // Viewport resolution
    this.viewWidth = WORLD_CONFIG.VIEW_WIDTH;   // 360
    this.viewHeight = WORLD_CONFIG.VIEW_HEIGHT; // 240

    // Active simulation buffer (4 chunks = 720 x 240)
    this.activeChunksCount = 4;
    this.chunkWidth = WORLD_CONFIG.CHUNK_WIDTH; // 180
    this.simWidth = this.activeChunksCount * this.chunkWidth; // 720
    this.simHeight = WORLD_CONFIG.CHUNK_HEIGHT; // 240

    // Primary simulation grid for the active window
    this.grid = new SimulationGrid(this.simWidth, this.simHeight);
    this.physics = new PhysicsEngine(this.grid);

    // World chunk indexing
    // leftChunkIndex is the chunk index at x = 0 of the sim grid
    this.leftChunkIndex = -1;
    this.worldOriginX = this.leftChunkIndex * this.chunkWidth;

    // Chunk Cache: stores modified chunks so destroyed buildings stay destroyed!
    this.chunkCache = new Map();

    // Camera
    this.cameraX = 0; // World coordinate of left edge of viewport
    this.cameraY = 0;
    this.targetCameraX = 0;

    // Direct Canvas Screen Buffer (360x240)
    this.screenImageData = ctx.createImageData(this.viewWidth, this.viewHeight);
    this.screenPixels = new Uint32Array(this.screenImageData.data.buffer);

    // Precomputed Daytime Metropolis Sky Gradient (240 rows)
    this.skyGradient = new Uint32Array(this.viewHeight);
    this.initSkyGradient();

    // Parallax Clouds
    this.clouds = [
      { x: 30, y: 22, w: 46, h: 10, speed: 0.12 },
      { x: 140, y: 38, w: 62, h: 12, speed: 0.08 },
      { x: 250, y: 16, w: 38, h: 8, speed: 0.15 },
      { x: 340, y: 45, w: 52, h: 11, speed: 0.10 },
      { x: 480, y: 28, w: 58, h: 12, speed: 0.11 },
    ];

    // Initialize initial active chunks
    this.loadActiveChunks(0);
  }

  // Precompute smooth atmospheric sky colors for all 240 scanlines
  initSkyGradient() {
    for (let y = 0; y < this.viewHeight; y++) {
      let r, g, b;
      if (y < 110) {
        // Deep Azure Blue -> Vibrant Sky Blue
        const t = y / 110;
        r = Math.round(21 + t * (66 - 21));
        g = Math.round(101 + t * (165 - 101));
        b = Math.round(192 + t * (245 - 192));
      } else if (y < 210) {
        // Vibrant Sky Blue -> Warm Glowing Horizon Haze
        const t = (y - 110) / 100;
        r = Math.round(66 + t * (225 - 66));
        g = Math.round(165 + t * (245 - 165));
        b = Math.round(245 + t * (254 - 245));
      } else {
        // Ground-level warm haze
        r = 230; g = 245; b = 255;
      }
      this.skyGradient[y] = packRGBA(r, g, b, 255);
    }
  }

  // Initialize or re-center active simulation window around centerChunk
  loadActiveChunks(centerChunk) {
    const newLeftChunk = centerChunk - 1;
    this.leftChunkIndex = newLeftChunk;
    this.worldOriginX = this.leftChunkIndex * this.chunkWidth;

    this.grid.clearAll();

    for (let i = 0; i < this.activeChunksCount; i++) {
      const cIdx = newLeftChunk + i;
      this.populateChunkIntoGrid(cIdx, i * this.chunkWidth);
    }
  }

  // Populate chunk (from cache or procedural generator) into grid at localOffsetX
  populateChunkIntoGrid(cIdx, localOffsetX) {
    if (this.chunkCache.has(cIdx)) {
      // Restore from cache
      const cached = this.chunkCache.get(cIdx);
      for (let y = 0; y < this.simHeight; y++) {
        for (let x = 0; x < this.chunkWidth; x++) {
          const srcIdx = y * this.chunkWidth + x;
          const gx = localOffsetX + x;
          const type = cached.types[srcIdx];
          if (type !== ELEMENTS.AIR) {
            this.grid.set(gx, y, type, cached.colors[srcIdx], cached.lives[srcIdx]);
          }
        }
      }
    } else {
      // Generate freshly from procedural architecture engine!
      CityGenerator.generateChunk(cIdx, this.grid, localOffsetX);
    }
  }

  // Save chunk from grid into cache
  saveChunkFromGrid(cIdx, localOffsetX) {
    const types = new Uint8Array(this.chunkWidth * this.simHeight);
    const colors = new Uint32Array(this.chunkWidth * this.simHeight);
    const lives = new Uint8Array(this.chunkWidth * this.simHeight);

    for (let y = 0; y < this.simHeight; y++) {
      for (let x = 0; x < this.chunkWidth; x++) {
        const destIdx = y * this.chunkWidth + x;
        const gx = localOffsetX + x;
        const gIdx = this.grid.getIndex(gx, y);
        types[destIdx] = this.grid.typeGrid[gIdx];
        colors[destIdx] = this.grid.colorGrid[gIdx];
        lives[destIdx] = this.grid.lifeGrid[gIdx];
      }
    }
    this.chunkCache.set(cIdx, { types, colors, lives });
  }

  // Shift active chunks when camera moves too far left or right
  checkChunkStreaming() {
    // Current camera center in world coordinates
    const cameraCenterX = this.cameraX + this.viewWidth / 2;
    const currentChunk = Math.floor(cameraCenterX / this.chunkWidth);

    // If camera center moves towards chunk boundary, shift by 1 chunk
    const relativeChunk = currentChunk - this.leftChunkIndex;

    // Moving Right
    if (relativeChunk >= 3) {
      // Save leftmost chunk
      this.saveChunkFromGrid(this.leftChunkIndex, 0);

      // Shift grid memory left by 1 chunk (180px)
      this.shiftGridLeft();

      this.leftChunkIndex++;
      this.worldOriginX = this.leftChunkIndex * this.chunkWidth;

      // Populate brand-new incoming right chunk
      const newRightChunk = this.leftChunkIndex + this.activeChunksCount - 1;
      this.populateChunkIntoGrid(newRightChunk, (this.activeChunksCount - 1) * this.chunkWidth);
    }
    // Moving Left
    else if (relativeChunk <= 0) {
      // Save rightmost chunk
      this.saveChunkFromGrid(this.leftChunkIndex + this.activeChunksCount - 1, (this.activeChunksCount - 1) * this.chunkWidth);

      // Shift grid memory right by 1 chunk (180px)
      this.shiftGridRight();

      this.leftChunkIndex--;
      this.worldOriginX = this.leftChunkIndex * this.chunkWidth;

      // Populate brand-new incoming left chunk
      this.populateChunkIntoGrid(this.leftChunkIndex, 0);
    }
  }

  // Fast memory copy shifting grid left by 180px
  shiftGridLeft() {
    const shift = this.chunkWidth;
    for (let y = 0; y < this.simHeight; y++) {
      const rowStart = y * this.simWidth;
      // Shift left
      this.grid.typeGrid.copyWithin(rowStart, rowStart + shift, rowStart + this.simWidth);
      this.grid.colorGrid.copyWithin(rowStart, rowStart + shift, rowStart + this.simWidth);
      this.grid.lifeGrid.copyWithin(rowStart, rowStart + shift, rowStart + this.simWidth);

      // Clear the vacated right chunk row to AIR
      const emptyStart = rowStart + this.simWidth - shift;
      this.grid.typeGrid.fill(ELEMENTS.AIR, emptyStart, emptyStart + shift);
      this.grid.colorGrid.fill(0, emptyStart, emptyStart + shift);
      this.grid.lifeGrid.fill(0, emptyStart, emptyStart + shift);
    }
  }

  // Fast memory copy shifting grid right by 180px
  shiftGridRight() {
    const shift = this.chunkWidth;
    for (let y = 0; y < this.simHeight; y++) {
      const rowStart = y * this.simWidth;
      // Shift right
      this.grid.typeGrid.copyWithin(rowStart + shift, rowStart, rowStart + this.simWidth - shift);
      this.grid.colorGrid.copyWithin(rowStart + shift, rowStart, rowStart + this.simWidth - shift);
      this.grid.lifeGrid.copyWithin(rowStart + shift, rowStart, rowStart + this.simWidth - shift);

      // Clear the vacated left chunk row to AIR
      this.grid.typeGrid.fill(ELEMENTS.AIR, rowStart, rowStart + shift);
      this.grid.colorGrid.fill(0, rowStart, rowStart + shift);
      this.grid.lifeGrid.fill(0, rowStart, rowStart + shift);
    }
  }

  // Convert World Coordinates (worldX, worldY) to Local Simulation Grid (gx, gy)
  worldToGrid(worldX, worldY) {
    const gx = Math.floor(worldX - this.worldOriginX);
    const gy = Math.floor(worldY);
    return { gx, gy, inBounds: gx >= 0 && gx < this.simWidth && gy >= 0 && gy < this.simHeight };
  }

  // Convert Local Simulation Grid to World Coordinates
  gridToWorld(gx, gy) {
    return { worldX: gx + this.worldOriginX, worldY: gy };
  }

  // Smooth camera tracking
  updateCamera(targetX, targetY) {
    this.targetCameraX = targetX - this.viewWidth / 2;
    // Smooth camera lerp
    this.cameraX += (this.targetCameraX - this.cameraX) * 0.12;

    // Check if new chunks need streaming in
    this.checkChunkStreaming();
  }

  // Render Daytime Metropolis Sky and Foreground Particles directly to screen buffer
  renderViewport() {
    const camX = Math.round(this.cameraX);
    const localCamX = camX - this.worldOriginX;

    const types = this.grid.typeGrid;
    const colors = this.grid.colorGrid;
    const pixels = this.screenPixels;
    const simW = this.simWidth;
    const vw = this.viewWidth;
    const vh = this.viewHeight;

    let activeParticlesCount = 0;

    // Render each scanline
    for (let vy = 0; vy < vh; vy++) {
      const rowPixelStart = vy * vw;
      const simRowStart = vy * simW;
      const skyBaseColor = this.skyGradient[vy];

      for (let vx = 0; vx < vw; vx++) {
        const gx = localCamX + vx;
        const pIdx = rowPixelStart + vx;

        // Check if there is a foreground particle in the simulation grid
        let particleType = ELEMENTS.AIR;
        let particleColor = 0;

        if (gx >= 0 && gx < simW) {
          const gIdx = simRowStart + gx;
          particleType = types[gIdx];
          particleColor = colors[gIdx];
        }

        if (particleType !== ELEMENTS.AIR) {
          pixels[pIdx] = particleColor;
          activeParticlesCount++;
        } else {
          // Render Daytime Sky, Sun, Clouds & Parallax Skyline!
          pixels[pIdx] = this.getSkyPixel(vx, vy, camX, skyBaseColor);
        }
      }
    }

    this.grid.particleCount = activeParticlesCount;
    this.ctx.putImageData(this.screenImageData, 0, 0);
  }

  // Procedural Daytime Metropolis Sky with Sun, Clouds & Multi-Layer Parallax Skyline
  getSkyPixel(vx, vy, camX, baseSky) {
    const worldX = camX + vx;

    // 1. Radiant Pixel Sun (Upper sky, moves with slight parallax)
    const sunX = ((camX * 0.05 + 80) % 450);
    const sunY = 32;
    const sunDx = vx - sunX;
    const sunDy = vy - sunY;
    const sunDistSq = sunDx * sunDx + sunDy * sunDy;

    if (sunDistSq < 16) {
      return SKY_CONFIG.SUN_COLOR; // Sun core
    } else if (sunDistSq < 36) {
      return packRGBA(255, 240, 160, 240); // Inner sun glow
    } else if (sunDistSq < 70) {
      return packRGBA(255, 220, 120, 160); // Outer halo
    }

    // 2. Parallax Drifting Clouds
    for (let c of this.clouds) {
      const cloudScreenX = Math.round((c.x - camX * c.speed + 10000) % (this.viewWidth + 100)) - 50;
      if (vx >= cloudScreenX && vx < cloudScreenX + c.w && vy >= c.y && vy < c.y + c.h) {
        // Curved cloud silhouette
        const cdx = (vx - (cloudScreenX + c.w / 2)) / (c.w / 2);
        const cdy = (vy - (c.y + c.h / 2)) / (c.h / 2);
        if (cdx * cdx + cdy * cdy <= 1.0) {
          return vy > c.y + c.h - 3 ? SKY_CONFIG.CLOUD_SHADOW : SKY_CONFIG.CLOUD_COLOR;
        }
      }
    }

    // 3. Parallax Skyline Layer 1 (Far Metropolis Silhouettes - 25% speed)
    const farX = Math.floor(worldX * 0.22);
    const farBuildingHeight = this.getDistantBuildingHeight(farX, 1);
    if (farBuildingHeight > 0 && vy >= WORLD_CONFIG.GROUND_LEVEL - farBuildingHeight) {
      // Subtle window glimmer
      if ((vy % 6 === 2) && (farX % 5 === 2) && Math.sin(farX * 13) > 0.2) {
        return packRGBA(255, 255, 200, 210); // Glowing distant window
      }
      return SKY_CONFIG.DISTANT_SKYLINE_FAR;
    }

    // 4. Parallax Skyline Layer 2 (Mid Metropolis Silhouettes - 45% speed)
    const midX = Math.floor(worldX * 0.45);
    const midBuildingHeight = this.getDistantBuildingHeight(midX, 2);
    if (midBuildingHeight > 0 && vy >= WORLD_CONFIG.GROUND_LEVEL - midBuildingHeight) {
      // Golden yellow window lights
      if ((vy % 5 === 2) && (midX % 4 === 2) && Math.sin(midX * 7) > 0.0) {
        return packRGBA(255, 235, 150, 230);
      }
      return SKY_CONFIG.DISTANT_SKYLINE_MID;
    }

    return baseSky;
  }

  // Fast procedural skyline silhouette height calculation
  getDistantBuildingHeight(x, layer) {
    const block = Math.floor(x / 20);
    const inBlock = x % 20;
    if (inBlock === 0 || inBlock === 19) return 0; // Gap between buildings

    const hash = Math.sin(block * 12.9898 + layer * 78.233) * 43758.5453;
    const r = hash - Math.floor(hash);

    if (r > 0.2) {
      return layer === 1 ? Math.floor(50 + r * 70) : Math.floor(35 + r * 55);
    }
    return 0;
  }
}
