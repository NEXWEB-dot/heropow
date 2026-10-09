/* ==========================================================================
   HERO POWDER — MAIN GAME LOOP & INPUT CONTROLLER
   Infinite Metropolis Streaming, Daytime Sky, Superhero Physics & UI Sync
   ========================================================================== */

(function () {
  // --- DOM Elements ---
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const fpsDisplay = document.getElementById('fps-display');
  const particleCountDisplay = document.getElementById('particle-count');
  const distDisplay = document.getElementById('dist-display');
  const scoreDisplay = document.getElementById('score-display');
  const killDisplay = document.getElementById('kill-display');
  const heroStateDisplay = document.getElementById('hero-state');

  const btnPause = document.getElementById('btn-pause');
  const btnStep = document.getElementById('btn-step');
  const btnClear = document.getElementById('btn-clear');
  const btnResetHero = document.getElementById('btn-reset-hero');

  const modePowersBtn = document.getElementById('mode-powers');
  const modeElementsBtn = document.getElementById('mode-elements');
  const powersBar = document.getElementById('powers-bar');
  const elementsBar = document.getElementById('elements-bar');

  // --- World & Engine Instances ---
  const world = new WorldManager(canvas, ctx);
  const hero = new Superhero(180, 50, world);
  const powers = new SuperpowerSystem(world, hero);
  const monsterMgr = new MonsterManager(world);

  // --- Game State ---
  let isPaused = false;
  let stepOneFrame = false;
  let activeMode = 'powers'; // 'powers' or 'elements'
  let activeElement = ELEMENTS.SAND;
  let brushSize = CONFIG.BRUSH_SIZE;

  // Mouse State (Screen & World coordinates)
  let isMouseDownLeft = false;
  let isMouseDownRight = false;
  let mouseScreenX = 0;
  let mouseScreenY = 0;

  // Performance metrics
  let lastTime = performance.now();
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  let currentFps = 60;

  // ==========================================================================
  // COORDINATE MAPPING & MOUSE EVENTS
  // ==========================================================================
  function updateMouseCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouseScreenX = Math.max(0, Math.min(canvas.width - 1, Math.floor((e.clientX - rect.left) * scaleX)));
    mouseScreenY = Math.max(0, Math.min(canvas.height - 1, Math.floor((e.clientY - rect.top) * scaleY)));
  }

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    updateMouseCoordinates(e);

    if (e.button === 0) isMouseDownLeft = true;
    if (e.button === 2) isMouseDownRight = true;

    handleMouseActions();
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) isMouseDownLeft = false;
    if (e.button === 2) isMouseDownRight = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    updateMouseCoordinates(e);
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Disable context menu for right-click tools
  });

  // Apply continuous mouse actions during game loop
  function handleMouseActions() {
    const mouseWorldX = mouseScreenX + world.cameraX;
    const mouseWorldY = mouseScreenY;

    if (isMouseDownLeft) {
      if (activeMode === 'powers') {
        powers.trigger(mouseWorldX, mouseWorldY);
        // Superpowers also damage monsters in their area!
        const powerRadius = {
          laser: 6, smash: HERO_CONFIG.SMASH_RADIUS,
          disintegrate: HERO_CONFIG.SINGULARITY_RADIUS,
          freeze: HERO_CONFIG.FREEZE_RADIUS, stomp: 12,
        };
        const powerDmg = {
          laser: 12, smash: 80, disintegrate: 50, freeze: 25, stomp: 100,
        };
        const rad = powerRadius[powers.activePower] || 10;
        const dmg = powerDmg[powers.activePower] || 20;
        monsterMgr.damageInRadius(mouseWorldX, mouseWorldY, rad, dmg);
      } else {
        const { gx, gy, inBounds } = world.worldToGrid(mouseWorldX, mouseWorldY);
        if (inBounds) {
          world.grid.drawCircle(gx, gy, brushSize, activeElement);
        }
      }
    }

    if (isMouseDownRight) {
      const { gx, gy, inBounds } = world.worldToGrid(mouseWorldX, mouseWorldY);
      if (inBounds) {
        world.grid.drawCircle(gx, gy, brushSize * 1.5, ELEMENTS.AIR);
      }
    }
  }

  // ==========================================================================
  // KEYBOARD CONTROLLER (With Supersonic Shift Flight)
  // ==========================================================================
  window.addEventListener('keydown', (e) => {
    // Movement
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') hero.keys.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') hero.keys.right = true;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') hero.keys.up = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') hero.keys.down = true;
    if (e.code === 'Space') {
      hero.keys.jump = true;
      e.preventDefault();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      hero.keys.boost = true;
    }

    // Toggle Flight Mode
    if (e.code === 'KeyF') {
      hero.isFlying = !hero.isFlying;
      hero.vy = 0;
    }

    // Respawn Hero at current view center
    if (e.code === 'KeyR') {
      hero.respawn(world.cameraX + 180, 50);
    }

    // Pause Toggle (P)
    if (e.code === 'KeyP') {
      isPaused = !isPaused;
      btnPause.textContent = isPaused ? '▶️' : '⏸️';
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') hero.keys.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') hero.keys.right = false;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') hero.keys.up = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') hero.keys.down = false;
    if (e.code === 'Space') hero.keys.jump = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') hero.keys.boost = false;
  });

  // ==========================================================================
  // UI & BUTTON BINDINGS
  // ==========================================================================
  // Mode Selector (Powers vs Element Brush)
  modePowersBtn.addEventListener('click', () => {
    activeMode = 'powers';
    modePowersBtn.classList.add('active');
    modeElementsBtn.classList.remove('active');
    powersBar.classList.remove('hidden');
    elementsBar.classList.add('hidden');
  });

  modeElementsBtn.addEventListener('click', () => {
    activeMode = 'elements';
    modeElementsBtn.classList.add('active');
    modePowersBtn.classList.remove('active');
    elementsBar.classList.remove('hidden');
    powersBar.classList.add('hidden');
  });

  // Superpower Buttons
  document.querySelectorAll('.btn-power').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-power').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      powers.setPower(btn.dataset.power);
    });
  });

  // Element Palette Buttons
  document.querySelectorAll('.btn-elem').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-elem').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const elemName = btn.dataset.elem;
      activeElement = ELEMENTS[elemName] !== undefined ? ELEMENTS[elemName] : ELEMENTS.AIR;
    });
  });

  // Brush Size Buttons
  document.querySelectorAll('.btn-size').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-size').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      brushSize = parseInt(btn.dataset.size, 10);
    });
  });

  // Top Action Buttons
  btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? '▶️' : '⏸️';
  });

  btnStep.addEventListener('click', () => {
    stepOneFrame = true;
  });

  btnClear.addEventListener('click', () => {
    world.grid.clearAll();
  });

  btnResetHero.addEventListener('click', () => {
    hero.respawn(world.cameraX + 180, 50);
  });

  // Monster Spawn Buttons
  document.getElementById('spawn-stomper').addEventListener('click', () => monsterMgr.spawn('STOMPER', hero));
  document.getElementById('spawn-brute').addEventListener('click', () => monsterMgr.spawn('BRUTE', hero));
  document.getElementById('spawn-flyer').addEventListener('click', () => monsterMgr.spawn('FLYER', hero));
  document.getElementById('spawn-kaiju').addEventListener('click', () => monsterMgr.spawn('KAIJU', hero));
  document.getElementById('spawn-wave').addEventListener('click', () => monsterMgr.spawnWave(hero));

  // ==========================================================================
  // MAIN GAME LOOP (requestAnimationFrame)
  // ==========================================================================
  function gameLoop(now) {
    // 1. Calculate FPS & UI Telemetry
    frameCount++;
    if (now - lastFpsUpdate >= 500) {
      currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
      fpsDisplay.textContent = currentFps;
      frameCount = 0;
      lastFpsUpdate = now;

      // Update particle count, distance traveled, monster score & hero state
      particleCountDisplay.textContent = world.grid.particleCount.toLocaleString();

      const distMeters = Math.max(0, Math.round(hero.worldX / 10));
      distDisplay.textContent = distMeters >= 1000 ? (distMeters / 1000).toFixed(1) + ' km' : distMeters + ' m';

      scoreDisplay.textContent = monsterMgr.score.toLocaleString();
      killDisplay.textContent = monsterMgr.killCount;

      heroStateDisplay.textContent = hero.isSupersonic
        ? 'SUPERSONIC'
        : hero.isFlying
        ? 'FLYING'
        : hero.isGrounded
        ? 'GROUNDED'
        : 'AIRBORNE';
    }

    // 2. Continuous mouse tool handling (Laser / Brush)
    handleMouseActions();

    // 3. Physics Simulation Update
    if (!isPaused || stepOneFrame) {
      world.physics.update();
      stepOneFrame = false;
    }

    // 4. Update Superhero Physics & Cape in World Space
    hero.update();

    // 5. Update Camera (Smoothly tracks Superhero across the Infinite Metropolis)
    world.updateCamera(hero.worldX, hero.worldY);

    // 6. Render Daytime Metropolis Sky & Active Granular Particles
    world.renderViewport();

    // 7. Render Superhero Avatar & Cape with camera offset
    hero.render(ctx, world.cameraX);

    // 8. Update & Render Monsters/Kaijus (AI, physics, fire breath)
    monsterMgr.update(hero, powers.effects);
    monsterMgr.render(ctx, world.cameraX);

    // 9. Render Superpower FX, Sparks & Shockwaves with camera offset
    powers.updateAndRenderFX(ctx, world.cameraX);

    // Request next frame
    requestAnimationFrame(gameLoop);
  }

  // --- Start the Infinite Metropolis ---
  requestAnimationFrame(gameLoop);
})();
