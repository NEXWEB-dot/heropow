/* ==========================================================================
   HERO POWDER — CONFIG & ELEMENT REGISTRY
   High-performance constants, element IDs, 32-bit color packers, and Infinite City specs
   ========================================================================== */

// --- Grid Resolution & Simulation Limits ---
const CONFIG = {
  GRID_WIDTH: 360,
  GRID_HEIGHT: 240,
  FPS_TARGET: 60,
  GRAVITY: 0.35,
  MAX_PARTICLES: 360 * 240,
  BRUSH_SIZE: 3,
};

// --- Infinite Metropolis World Streaming ---
const WORLD_CONFIG = {
  VIEW_WIDTH: 360,
  VIEW_HEIGHT: 240,
  CHUNK_WIDTH: 180,
  CHUNK_HEIGHT: 240,
  BUFFER_CHUNKS: 2, // 2 chunks buffer left and right = 5 active chunks (900px wide)
  GROUND_LEVEL: 228, // Y-coordinate of street level
};

// --- Daytime Metropolis Sky & Parallax Skyline ---
const SKY_CONFIG = {
  COLOR_TOP: packRGBA(21, 101, 192),      // Deep Azure Blue
  COLOR_MID: packRGBA(66, 165, 245),      // Vibrant Sky Blue
  COLOR_HORIZON: packRGBA(225, 245, 254), // Warm Glowing Horizon
  SUN_COLOR: packRGBA(255, 255, 220),     // Radiant Sun
  CLOUD_COLOR: packRGBA(255, 255, 255, 230),
  CLOUD_SHADOW: packRGBA(207, 216, 220, 200),
  DISTANT_SKYLINE_FAR: packRGBA(120, 165, 215, 200), // Far skyscraper silhouette
  DISTANT_SKYLINE_MID: packRGBA(80, 125, 180, 220),  // Mid skyscraper silhouette
};

// --- Element Type IDs (0 to 255 for Uint8Array) ---
const ELEMENTS = {
  AIR: 0,
  SAND: 1,
  WATER: 2,
  FIRE: 3,
  WOOD: 4,
  STONE: 5,
  GUNPOWDER: 6,
  ACID: 7,
  LAVA: 8,
  ICE: 9,
  C4: 10,
  GLASS: 11,
  OIL: 12,
  PLANT: 13,
  SMOKE: 14,
  STEAM: 15,
  EMBER: 16,
};

// --- Material Categories ---
const CATEGORIES = {
  EMPTY: 0,
  SOLID: 1,
  POWDER: 2,
  LIQUID: 3,
  GAS: 4,
  ENERGY: 5,
};

// --- Helper: Pack RGBA into 32-bit Little-Endian Integer (ABGR) ---
function packRGBA(r, g, b, a = 255) {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

// --- Dan-Ball Style Element Color Palettes (with natural pixel noise) ---
const PALETTES = {
  [ELEMENTS.AIR]: [0], // 0 is transparent so Sky renders through!

  [ELEMENTS.SAND]: [
    packRGBA(232, 196, 92),
    packRGBA(218, 180, 80),
    packRGBA(245, 208, 108),
    packRGBA(205, 168, 68),
  ],

  [ELEMENTS.WATER]: [
    packRGBA(45, 125, 245, 220),
    packRGBA(55, 140, 255, 220),
    packRGBA(35, 110, 230, 220),
  ],

  [ELEMENTS.FIRE]: [
    packRGBA(255, 80, 10, 240),
    packRGBA(255, 160, 20, 255),
    packRGBA(255, 220, 50, 255),
    packRGBA(240, 40, 0, 230),
  ],

  [ELEMENTS.WOOD]: [
    packRGBA(139, 90, 43),
    packRGBA(120, 75, 35),
    packRGBA(155, 105, 55),
    packRGBA(105, 65, 30),
  ],

  [ELEMENTS.STONE]: [
    packRGBA(150, 155, 165),
    packRGBA(135, 140, 150),
    packRGBA(165, 170, 180),
    packRGBA(120, 125, 135),
  ],

  [ELEMENTS.GUNPOWDER]: [
    packRGBA(105, 110, 120),
    packRGBA(90, 95, 105),
    packRGBA(120, 125, 135),
    packRGBA(80, 85, 95),
  ],

  [ELEMENTS.ACID]: [
    packRGBA(50, 240, 80, 230),
    packRGBA(70, 255, 100, 230),
    packRGBA(40, 220, 65, 230),
  ],

  [ELEMENTS.LAVA]: [
    packRGBA(255, 95, 10),
    packRGBA(255, 130, 20),
    packRGBA(230, 70, 0),
    packRGBA(255, 170, 40),
  ],

  [ELEMENTS.ICE]: [
    packRGBA(170, 220, 255, 225),
    packRGBA(190, 235, 255, 225),
    packRGBA(150, 205, 245, 225),
  ],

  [ELEMENTS.C4]: [
    packRGBA(225, 45, 80),
    packRGBA(245, 60, 95),
    packRGBA(205, 30, 65),
  ],

  [ELEMENTS.GLASS]: [
    packRGBA(180, 225, 245, 190),
    packRGBA(200, 240, 255, 190),
    packRGBA(160, 210, 235, 190),
  ],

  [ELEMENTS.OIL]: [
    packRGBA(100, 50, 15, 235),
    packRGBA(80, 40, 10, 235),
    packRGBA(115, 60, 20, 235),
  ],

  [ELEMENTS.PLANT]: [
    packRGBA(34, 160, 50),
    packRGBA(25, 140, 40),
    packRGBA(45, 180, 65),
  ],

  [ELEMENTS.SMOKE]: [
    packRGBA(90, 95, 105, 160),
    packRGBA(110, 115, 125, 150),
    packRGBA(75, 80, 90, 170),
  ],

  [ELEMENTS.STEAM]: [
    packRGBA(200, 215, 235, 140),
    packRGBA(220, 230, 245, 130),
  ],

  [ELEMENTS.EMBER]: [
    packRGBA(255, 180, 40, 255),
    packRGBA(255, 100, 10, 255),
    packRGBA(255, 230, 100, 255),
  ],
};

// --- Superhero Entity Settings ---
const HERO_CONFIG = {
  WIDTH: 7,
  HEIGHT: 13,
  COLOR_SUIT: packRGBA(10, 130, 250),    // Vibrant Hero Blue
  COLOR_CAPE: packRGBA(235, 30, 55),     // Crimson Red Cape
  COLOR_BELT: packRGBA(255, 215, 0),     // Gold Belt
  COLOR_EYES: packRGBA(0, 245, 255),     // Glowing Cyan / Laser Eyes
  COLOR_SKIN: packRGBA(255, 215, 175),   // Face

  WALK_SPEED: 2.2,
  RUN_ACCEL: 0.4,
  FRICTION: 0.85,
  JUMP_POWER: -6.2,
  FLY_SPEED: 3.8,
  SUPER_FLY_SPEED: 6.5,                  // Supersonic flight across the infinite city!
  MAX_FALL_SPEED: 7.0,

  // Superpower Parameters
  LASER_WIDTH: 3,
  LASER_HEAT: 100,
  SMASH_RADIUS: 28,
  SMASH_FORCE: 9.0,
  SINGULARITY_RADIUS: 34,
  SINGULARITY_PULL: 5.0,
  FREEZE_RADIUS: 26,
};
