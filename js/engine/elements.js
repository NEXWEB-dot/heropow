/* ==========================================================================
   HERO POWDER — ELEMENT DEFINITIONS & PHYSICS PROPERTIES
   Density, fluid dispersion, flammability, and reaction flags
   ========================================================================== */

const ELEMENT_DEFS = {
  [ELEMENTS.AIR]: {
    name: 'Air',
    category: CATEGORIES.EMPTY,
    density: 0,
    dispersion: 0,
    flammable: false,
    corrodible: false,
  },

  [ELEMENTS.SAND]: {
    name: 'Sand',
    category: CATEGORIES.POWDER,
    density: 12,
    dispersion: 1,
    flammable: false,
    corrodible: true,
  },

  [ELEMENTS.WATER]: {
    name: 'Water',
    category: CATEGORIES.LIQUID,
    density: 6,
    dispersion: 4,
    flammable: false,
    corrodible: false,
  },

  [ELEMENTS.FIRE]: {
    name: 'Fire',
    category: CATEGORIES.ENERGY,
    density: -1,
    dispersion: 2,
    flammable: false,
    corrodible: false,
    baseLife: 22,
    lifeVariance: 12,
  },

  [ELEMENTS.WOOD]: {
    name: 'Wood',
    category: CATEGORIES.SOLID,
    density: 999,
    dispersion: 0,
    flammable: true,
    corrodible: true,
    burnRate: 0.12,
  },

  [ELEMENTS.STONE]: {
    name: 'Stone',
    category: CATEGORIES.SOLID,
    density: 9999,
    dispersion: 0,
    flammable: false,
    corrodible: false, // Stone resists acid
  },

  [ELEMENTS.GUNPOWDER]: {
    name: 'Gunpowder',
    category: CATEGORIES.POWDER,
    density: 10,
    dispersion: 1,
    flammable: true,
    corrodible: true,
    explosive: true,
    blastRadius: 20,
  },

  [ELEMENTS.ACID]: {
    name: 'Acid',
    category: CATEGORIES.LIQUID,
    density: 7,
    dispersion: 3,
    flammable: false,
    corrodible: false,
    corrosiveness: 0.8,
  },

  [ELEMENTS.LAVA]: {
    name: 'Lava',
    category: CATEGORIES.LIQUID,
    density: 15,
    dispersion: 1, // Viscous
    flammable: false,
    corrodible: false,
    heat: 100,
  },

  [ELEMENTS.ICE]: {
    name: 'Ice',
    category: CATEGORIES.SOLID,
    density: 999,
    dispersion: 0,
    flammable: false,
    corrodible: true,
    meltTemp: 1,
  },

  [ELEMENTS.C4]: {
    name: 'C4 Nitro',
    category: CATEGORIES.SOLID,
    density: 999,
    dispersion: 0,
    flammable: true,
    corrodible: true,
    explosive: true,
    blastRadius: 40,
  },

  [ELEMENTS.GLASS]: {
    name: 'Glass',
    category: CATEGORIES.SOLID,
    density: 9999,
    dispersion: 0,
    flammable: false,
    corrodible: false,
  },

  [ELEMENTS.OIL]: {
    name: 'Oil',
    category: CATEGORIES.LIQUID,
    density: 4, // Floats on water (water density is 6)
    dispersion: 3,
    flammable: true,
    corrodible: true,
  },

  [ELEMENTS.PLANT]: {
    name: 'Plant',
    category: CATEGORIES.SOLID,
    density: 999,
    dispersion: 0,
    flammable: true,
    corrodible: true,
    growthRate: 0.05,
  },

  [ELEMENTS.SMOKE]: {
    name: 'Smoke',
    category: CATEGORIES.GAS,
    density: -2,
    dispersion: 3,
    flammable: false,
    corrodible: false,
    baseLife: 60,
    lifeVariance: 30,
  },

  [ELEMENTS.STEAM]: {
    name: 'Steam',
    category: CATEGORIES.GAS,
    density: -3,
    dispersion: 3,
    flammable: false,
    corrodible: false,
    baseLife: 50,
    lifeVariance: 25,
  },

  [ELEMENTS.EMBER]: {
    name: 'Ember',
    category: CATEGORIES.ENERGY,
    density: -1,
    dispersion: 2,
    flammable: false,
    corrodible: false,
    baseLife: 15,
    lifeVariance: 8,
  },
};

// --- Helper: Pick a random shade for an element (Dust 2 pixel grain) ---
function getElementColor(type) {
  const palette = PALETTES[type];
  if (!palette || palette.length === 0) return 0;
  return palette[Math.floor(Math.random() * palette.length)];
}

// --- Helper: Generate initial lifespan for energy/gas particles ---
function getElementInitialLife(type) {
  const def = ELEMENT_DEFS[type];
  if (!def || !def.baseLife) return 0;
  return def.baseLife + Math.floor(Math.random() * (def.lifeVariance || 0));
}
