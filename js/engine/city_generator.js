/* ==========================================================================
   HERO POWDER — PROCEDURAL INFINITE CITY GENERATOR
   Endless metropolis architecture: skyscrapers, water towers, chemical labs & explosive depots
   ========================================================================== */

class CityGenerator {
  // Simple deterministic pseudo-random generator based on integer seed
  static pseudoRandom(seed) {
    const x = Math.sin(seed * 9999.123) * 10000;
    return x - Math.floor(x);
  }

  // Populate an empty chunk grid (180x240) based on chunk index
  static generateChunk(chunkIndex, targetGrid, offsetX = 0) {
    const w = WORLD_CONFIG.CHUNK_WIDTH;
    const h = WORLD_CONFIG.CHUNK_HEIGHT;
    const groundY = WORLD_CONFIG.GROUND_LEVEL;

    // Use chunkIndex as reproducible seed
    const seed = Math.abs(chunkIndex) * 7331 + 42;
    const rand = (offset = 0) => CityGenerator.pseudoRandom(seed + offset);

    // 1. Bedrock & Asphalt Street
    for (let lx = 0; lx < w; lx++) {
      const gx = offsetX + lx;

      // Paved Street & Foundations
      for (let gy = groundY; gy < h; gy++) {
        if (gy === groundY) {
          // Sidewalk & curbs
          targetGrid.set(gx, gy, ELEMENTS.STONE);
        } else if (gy === groundY + 1 || gy === groundY + 2) {
          // Asphalt road
          targetGrid.set(gx, gy, ELEMENTS.STONE);
        } else {
          // Subterranean earth / rock
          targetGrid.set(gx, gy, ELEMENTS.STONE);
        }
      }

      // Street amenities: Trees and plants in plazas
      if (lx % 45 === 10 && rand(lx) > 0.4) {
        // Small city tree
        targetGrid.set(gx, groundY - 1, ELEMENTS.WOOD);
        targetGrid.set(gx, groundY - 2, ELEMENTS.WOOD);
        targetGrid.set(gx - 1, groundY - 3, ELEMENTS.PLANT);
        targetGrid.set(gx, groundY - 3, ELEMENTS.PLANT);
        targetGrid.set(gx + 1, groundY - 3, ELEMENTS.PLANT);
        targetGrid.set(gx, groundY - 4, ELEMENTS.PLANT);
      }
    }

    // 2. Determine architectural theme for this block
    const blockTheme = Math.floor(rand(1) * 6);

    switch (blockTheme) {
      case 0:
        // Theme 0: Giant Skyscraper with Rooftop Water Tower
        CityGenerator.buildSkyscraper(targetGrid, offsetX + 15, groundY, 70, 140 + Math.floor(rand(2) * 40), true, false);
        break;

      case 1:
        // Theme 1: High-Tech Glass High-Rise & Chemical Lab
        CityGenerator.buildSkyscraper(targetGrid, offsetX + 20, groundY, 80, 110 + Math.floor(rand(3) * 50), false, true);
        break;

      case 2:
        // Theme 2: Demolition & Fuel Depot (Packed with C4 and Gunpowder!)
        CityGenerator.buildFuelDepot(targetGrid, offsetX + 25, groundY, 130);
        break;

      case 3:
        // Theme 3: Twin Towers with Skybridge
        CityGenerator.buildTwinTowers(targetGrid, offsetX + 10, groundY, rand);
        break;

      case 4:
        // Theme 4: Construction Skyscraper with Crane
        CityGenerator.buildConstructionSite(targetGrid, offsetX + 15, groundY, 120 + Math.floor(rand(4) * 40), rand);
        break;

      case 5:
      default:
        // Theme 5: Commercial High-Rise & Rooftop Helipad
        CityGenerator.buildSkyscraper(targetGrid, offsetX + 25, groundY, 75, 130 + Math.floor(rand(5) * 35), true, true);
        break;
    }
  }

  // --- Build Classic Multi-Story Skyscraper ---
  static buildSkyscraper(grid, startX, groundY, width, height, hasWaterTower = false, hasChemicals = false) {
    const topY = groundY - height;
    const endX = startX + width;

    for (let x = startX; x <= endX; x++) {
      for (let y = topY; y < groundY; y++) {
        // Outer stone walls & vertical structural pillars every 15px
        if (x === startX || x === endX || (x - startX) % 18 === 0) {
          grid.set(x, y, ELEMENTS.STONE);
        }
        // Horizontal floors every 20px
        else if ((groundY - y) % 20 === 0 || y === topY) {
          grid.set(x, y, ELEMENTS.WOOD);
        }
        // Windows
        else if ((groundY - y) % 20 > 4 && (x - startX) % 18 > 4 && (x - startX) % 18 < 14) {
          grid.set(x, y, ELEMENTS.GLASS);
        }
      }
    }

    // Rooftop Antenna / Lightning Rod
    const midX = Math.floor((startX + endX) / 2);
    for (let y = topY - 14; y < topY; y++) {
      grid.set(midX, y, ELEMENTS.STONE);
    }
    grid.set(midX, topY - 15, ELEMENTS.FIRE); // Flashing beacon ember

    // Rooftop Water Tower (Splashes active water when smashed!)
    if (hasWaterTower) {
      const towerX = startX + 12;
      const towerY = topY - 24;
      CityGenerator.buildWaterTower(grid, towerX, towerY, 20, 16);
    }

    // Basework Chemical Lab
    if (hasChemicals) {
      const vatX = startX + 6;
      const vatY = groundY - 18;
      for (let x = vatX; x <= vatX + 16; x++) {
        for (let y = vatY; y < groundY - 2; y++) {
          if (x === vatX || x === vatX + 16 || y === vatY || y === groundY - 3) {
            grid.set(x, y, ELEMENTS.GLASS);
          } else {
            grid.set(x, y, ELEMENTS.ACID);
          }
        }
      }
    }
  }

  // --- Build Rooftop Water Tower ---
  static buildWaterTower(grid, x, y, width, height) {
    // Wooden tank perimeter
    for (let px = x; px <= x + width; px++) {
      for (let py = y; py <= y + height; py++) {
        if (px === x || px === x + width || py === y || py === y + height) {
          grid.set(px, py, ELEMENTS.WOOD);
        } else {
          // Filled with liquid water!
          grid.set(px, py, ELEMENTS.WATER);
        }
      }
    }
    // Support stilts
    for (let sY = y + height + 1; sY <= y + height + 6; sY++) {
      grid.set(x + 2, sY, ELEMENTS.WOOD);
      grid.set(x + width - 2, sY, ELEMENTS.WOOD);
    }
  }

  // --- Build Explosive Munitions & Fuel Depot ---
  static buildFuelDepot(grid, startX, groundY, width) {
    const endX = startX + width;
    const bunkerTopY = groundY - 45;

    // Reinforced Stone Bunker
    for (let x = startX; x <= endX; x++) {
      for (let y = bunkerTopY; y < groundY; y++) {
        if (x === startX || x === endX || y === bunkerTopY) {
          grid.set(x, y, ELEMENTS.STONE);
        }
      }
    }

    // Stacks of C4 and Gunpowder inside!
    for (let x = startX + 8; x < endX - 8; x++) {
      for (let y = bunkerTopY + 12; y < groundY - 2; y++) {
        if ((x + y) % 7 === 0) {
          grid.set(x, y, ELEMENTS.C4);
        } else if ((x * y) % 5 === 0) {
          grid.set(x, y, ELEMENTS.GUNPOWDER);
        } else if ((x - startX) % 12 === 0) {
          grid.set(x, y, ELEMENTS.OIL);
        }
      }
    }

    // Rooftop warning beacon
    grid.set(startX + 10, bunkerTopY - 1, ELEMENTS.C4);
    grid.set(endX - 10, bunkerTopY - 1, ELEMENTS.C4);
  }

  // --- Build Twin Towers with Skybridge ---
  static buildTwinTowers(grid, startX, groundY, rand) {
    const towerW = 45;
    const gap = 35;
    const h1 = 125 + Math.floor(rand(10) * 35);
    const h2 = 135 + Math.floor(rand(11) * 30);

    // Tower 1
    CityGenerator.buildSkyscraper(grid, startX, groundY, towerW, h1, true, false);

    // Tower 2
    CityGenerator.buildSkyscraper(grid, startX + towerW + gap, groundY, towerW, h2, false, true);

    // Skybridge connecting the two towers
    const bridgeY = Math.min(groundY - h1, groundY - h2) + 30;
    const bridgeStart = startX + towerW;
    const bridgeEnd = startX + towerW + gap;

    for (let x = bridgeStart; x <= bridgeEnd; x++) {
      grid.set(x, bridgeY, ELEMENTS.STONE);     // Ceiling
      grid.set(x, bridgeY + 8, ELEMENTS.STONE); // Floor
      grid.set(x, bridgeY + 3, ELEMENTS.GLASS); // Window
      grid.set(x, bridgeY + 4, ELEMENTS.GLASS);
    }
  }

  // --- Build Construction Skyscraper with Crane ---
  static buildConstructionSite(grid, startX, groundY, height, rand) {
    const width = 65;
    const topY = groundY - height;
    const endX = startX + width;

    // Incomplete steel/wood framework
    for (let x = startX; x <= endX; x++) {
      for (let y = topY; y < groundY; y++) {
        if (x === startX || x === endX || (x - startX) % 15 === 0) {
          grid.set(x, y, ELEMENTS.STONE);
        } else if ((groundY - y) % 22 === 0) {
          grid.set(x, y, ELEMENTS.WOOD);
        } else if (y > topY + 40 && (x - startX) % 15 > 3 && (x - startX) % 15 < 12) {
          grid.set(x, y, ELEMENTS.GLASS);
        }
      }
    }

    // Construction Crane Arm on Top
    const craneTowerX = startX + 15;
    for (let cy = topY - 28; cy <= topY; cy++) {
      grid.set(craneTowerX, cy, ELEMENTS.STONE);
    }
    // Horizontal Boom
    for (let bx = craneTowerX - 10; bx <= craneTowerX + 45; bx++) {
      grid.set(bx, topY - 28, ELEMENTS.WOOD);
    }
    // Suspended Crate of Gunpowder or Sand!
    const hookX = craneTowerX + 35;
    for (let hy = topY - 27; hy <= topY - 14; hy++) {
      grid.set(hookX, hy, ELEMENTS.STONE); // Cable
    }
    // Crate
    for (let cx = hookX - 4; cx <= hookX + 4; cx++) {
      for (let cy = topY - 13; cy <= topY - 6; cy++) {
        grid.set(cx, cy, rand(cx) > 0.5 ? ELEMENTS.GUNPOWDER : ELEMENTS.SAND);
      }
    }
  }
}
