const root = document.documentElement;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const TAU = Math.PI * 2;

// Shared state: the real pointer, and the cursor drone that the background swarm avoids.
const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const flight = { x: pointer.x, y: pointer.y, heading: 42, active: false };
const themeListeners = [];
const motionListeners = [];
let motionOn = root.dataset.motion !== 'off'; // set in <head> from the OS preference or the saved toggle
let palette = readPalette();

function readPalette() {
  const styles = getComputedStyle(root);
  const read = (name) => styles.getPropertyValue(name).trim();
  return { accent: read('--crimson-rgb'), ink: read('--ink-rgb') };
}

const rgba = (rgb, alpha) => `rgba(${rgb}, ${alpha})`;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const pad = (value, length) => String(Math.round(value)).padStart(length, '0');

function store(key, value) {
  try { localStorage.setItem(key, value); } catch (error) { /* storage unavailable */ }
}

/* ---------- Navigation ---------- */
const menuToggle = document.getElementById('menuToggle');
const siteNav = document.getElementById('siteNav');
const navIndicator = document.getElementById('navIndicator');
const navLinks = [...siteNav.querySelectorAll('a')];

menuToggle?.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

function moveNavIndicator() {
  const active = navLinks.find((link) => link.classList.contains('is-active'));
  navIndicator.style.opacity = active ? '1' : '0';
  if (!active) return;
  navIndicator.style.width = `${active.offsetWidth}px`;
  navIndicator.style.transform = `translateX(${active.offsetLeft}px)`;
}

const scrollSpy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
    moveNavIndicator();
  });
}, { rootMargin: '-45% 0px -50% 0px' });

document.querySelectorAll('main section[id]').forEach((section) => scrollSpy.observe(section));

/* ---------- Reveal + decoding eyebrows ---------- */
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/<>#';
let revealsStarted = false;

function scramble(element) {
  const text = element.textContent;
  const start = performance.now();
  const frame = (now) => {
    const progress = Math.min((now - start) / 650, 1);
    const settled = Math.floor(progress * text.length);
    element.textContent = [...text]
      .map((char, index) => (index < settled || char === ' ' ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
      .join('');
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function startReveals() {
  if (revealsStarted) return;
  revealsStarted = true;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      if (motionOn) entry.target.querySelectorAll('.eyebrow').forEach(scramble);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' }); // a margin, not a ratio threshold, so very tall blocks still reveal on phones

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Pre-flight intro ---------- */
const preflight = document.getElementById('preflight');

function finishPreflight() {
  if (!root.classList.contains('preflight-on')) return;
  root.classList.remove('preflight-on');
  try { sessionStorage.setItem('preflight-done', '1'); } catch (error) { /* storage unavailable */ }
  startReveals();
}

if (root.classList.contains('preflight-on')) {
  // Reveal the hero while the overlay lifts away, and clean up once it is gone.
  preflight.addEventListener('animationstart', (event) => {
    if (event.target === preflight) startReveals();
  });
  preflight.addEventListener('animationend', (event) => {
    if (event.target === preflight) finishPreflight();
  });
  preflight.addEventListener('click', finishPreflight);
  window.addEventListener('keydown', finishPreflight, { once: true });
} else {
  startReveals();
}

/* ---------- Scroll progress, altimeter, and hero telemetry ---------- */
const progressBar = document.getElementById('progressBar');
const altMarker = document.getElementById('altMarker');
const altValue = document.getElementById('altValue');
const hudAlt = document.getElementById('hudAlt');
const hudHeading = document.getElementById('hudHeading');
const hudClock = document.getElementById('hudClock');
let scrollQueued = false;

function updateProgress() {
  scrollQueued = false;
  const max = root.scrollHeight - window.innerHeight;
  const progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  const altitude = pad((1 - progress) * 400, 3);
  progressBar.style.width = `${progress * 100}%`;
  altMarker.style.top = `${progress * 100}%`;
  altValue.textContent = altitude;
  hudAlt.textContent = `${altitude} FT`;
}

window.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(updateProgress);
}, { passive: true });
updateProgress();

const clockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function updateTelemetry() {
  const heading = Math.round(((flight.heading % 360) + 360) % 360) % 360;
  hudClock.textContent = clockFormat.format(new Date());
  hudHeading.textContent = `${pad(heading, 3)}°`;
}
updateTelemetry();
setInterval(updateTelemetry, 250);

/* ---------- Theme & motion toggles ---------- */
const themeToggle = document.getElementById('themeToggle');
const motionToggle = document.getElementById('motionToggle');

function applyTheme(theme, persist) {
  root.dataset.theme = theme;
  if (persist) store('portfolio-theme', theme);
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  themeToggle?.setAttribute('aria-label', label);
  themeToggle?.setAttribute('title', label);
  palette = readPalette();
  themeListeners.forEach((listener) => listener());
}

function applyMotion(on, persist) {
  motionOn = on;
  root.dataset.motion = on ? 'on' : 'off';
  if (persist) store('portfolio-motion', root.dataset.motion);
  motionToggle?.setAttribute('aria-pressed', String(on));
  motionToggle?.setAttribute('title', on ? 'Pause animations' : 'Play animations');
  motionListeners.forEach((listener) => listener());
}

applyTheme(root.dataset.theme || 'light', false);
applyMotion(motionOn, false);
themeToggle?.addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
motionToggle?.addEventListener('click', () => applyMotion(!motionOn, true));

/* ---------- Teaching dossier tabs ---------- */
const tabs = [...document.querySelectorAll('.dossier-tab')];
const tabIndicator = document.querySelector('.tab-indicator');

function selectTab(tab, focus = false) {
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tab.focus();
  tabIndicator.style.width = `${tab.offsetWidth}px`;
  tabIndicator.style.transform = `translateX(${tab.offsetLeft}px)`;
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    selectTab(tabs[(moves[event.key] + tabs.length) % tabs.length], true);
  });
});

if (tabs.length) selectTab(tabs[0]);

function relayout() {
  moveNavIndicator();
  const activeTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
  if (activeTab) selectTab(activeTab);
}
window.addEventListener('resize', relayout);
document.fonts?.ready.then(relayout);

/* ---------- Teaching video chapters ---------- */
const teachingVideo = document.getElementById('teachingVideo');
const chapterButtons = [...document.querySelectorAll('.tv-chapters button')];

function markChapter() {
  const time = teachingVideo.currentTime;
  const current = chapterButtons.filter((button) => Number(button.dataset.time) <= time + 0.5).pop();
  chapterButtons.forEach((button) => {
    button.classList.toggle('is-current', button === current);
    if (button === current) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}

if (teachingVideo) {
  chapterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      teachingVideo.currentTime = Number(button.dataset.time);
      teachingVideo.play().catch(() => { /* playback needs a user gesture in some browsers */ });
      markChapter();
    });
  });
  teachingVideo.addEventListener('timeupdate', markChapter);
  teachingVideo.addEventListener('play', () => teachingVideo.closest('.teaching-video').classList.add('is-playing'));
  teachingVideo.addEventListener('pause', () => teachingVideo.closest('.teaching-video').classList.remove('is-playing'));
  markChapter();
}

/* ---------- Card tilt + magnetic buttons ---------- */
if (finePointer) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (!motionOn) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
      card.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  });

  document.querySelectorAll('[data-magnetic]').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      if (!motionOn) return;
      const rect = element.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      element.style.transform = `translate(${dx * 0.22}px, ${dy * 0.3}px)`;
    });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });
}

/* ---------- Drone cursor ---------- */
function initDroneCursor() {
  const layer = document.getElementById('cursorLayer');
  const drone = document.getElementById('cursorDrone');
  const reticle = document.getElementById('cursorReticle');
  const readout = document.getElementById('cursorReadout');
  const lock = document.getElementById('cursorLock');
  const lockLabel = document.getElementById('cursorLockLabel');
  const trailCanvas = document.getElementById('cursorTrail');
  const trail = trailCanvas.getContext('2d');
  const blades = [...drone.querySelectorAll('.cd-blade')];
  const TARGETS = 'a, button, .topic-card, .evidence-card, .orbit-item';
  const OFFSET = 24; // the drone hovers just below-right of the hotspot, like an arrow cursor's body
  const drift = { vx: 0, vy: 0, roll: 0, spin: 0, frame: 0, target: null, path: [], trailCleared: true };
  const box = { x: 0, y: 0, w: 0, h: 0 };

  root.classList.add('drone-cursor');

  function sizeTrail() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    trailCanvas.width = Math.round(window.innerWidth * ratio);
    trailCanvas.height = Math.round(window.innerHeight * ratio);
    trail.setTransform(ratio, 0, 0, ratio, 0, 0);
    drift.trailCleared = true;
  }

  function labelFor(element) {
    const text = element.dataset.cursor
      || element.getAttribute('aria-label')
      || element.querySelector('h3, h4')?.textContent
      || element.textContent;
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > 28 ? `${clean.slice(0, 27)}…` : clean;
  }

  function setTarget(element) {
    if (element === drift.target) return;
    if (element && !drift.target) Object.assign(box, { x: pointer.x, y: pointer.y, w: 0, h: 0 });
    drift.target = element;
    layer.classList.toggle('is-locked', Boolean(element));
    if (element) lockLabel.textContent = `TGT ▸ ${labelFor(element)}`;
  }

  function updateLock() {
    let goal = { x: pointer.x, y: pointer.y, w: 0, h: 0 };
    if (drift.target) {
      const rect = drift.target.getBoundingClientRect();
      if (rect.width) goal = { x: rect.left - 6, y: rect.top - 6, w: rect.width + 12, h: rect.height + 12 };
      else setTarget(null);
    }
    const ease = motionOn ? 0.28 : 1;
    box.x += (goal.x - box.x) * ease;
    box.y += (goal.y - box.y) * ease;
    box.w += (goal.w - box.w) * ease;
    box.h += (goal.h - box.h) * ease;
    lock.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
    lock.style.width = `${box.w}px`;
    lock.style.height = `${box.h}px`;
    lock.classList.toggle('label-below', box.y < 34);
  }

  function drawTrail(speed) {
    if (drift.frame % 2 === 0) {
      if (speed > 0.6) drift.path.push({ x: flight.x, y: flight.y });
      else drift.path.shift();
      if (drift.path.length > 24) drift.path.shift();
    }
    if (!drift.path.length && drift.trailCleared) return;
    trail.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drift.trailCleared = !drift.path.length;
    drift.path.forEach((point, index) => {
      const life = index / drift.path.length;
      trail.fillStyle = rgba(palette.accent, life * 0.45);
      trail.beginPath();
      trail.arc(point.x, point.y, 1 + life * 1.6, 0, TAU);
      trail.fill();
    });
  }

  function tick() {
    drift.frame += 1;

    if (motionOn) {
      // Spring toward the pointer, then bank and pitch into the direction of travel.
      drift.vx = (drift.vx + (pointer.x + OFFSET - flight.x) * 0.07) * 0.8;
      drift.vy = (drift.vy + (pointer.y + OFFSET - flight.y) * 0.07) * 0.8;
      flight.x += drift.vx;
      flight.y += drift.vy;
    } else {
      // Reduced motion: track the pointer directly, with no inertia, tilt, trail, or spinning rotors.
      drift.vx = 0;
      drift.vy = 0;
      flight.x = pointer.x + OFFSET;
      flight.y = pointer.y + OFFSET;
    }
    const speed = Math.hypot(drift.vx, drift.vy);
    if (speed > 0.9) {
      const desired = (Math.atan2(drift.vy, drift.vx) * 180) / Math.PI + 90;
      const turn = ((((desired - flight.heading) % 360) + 540) % 360) - 180;
      flight.heading += turn * 0.12;
      drift.roll += (clamp(turn * 0.4, -24, 24) - drift.roll) * 0.15;
    } else {
      drift.roll *= motionOn ? 0.9 : 0;
    }
    const pitch = Math.min(speed * 1.8, 32);
    if (motionOn) drift.spin = (drift.spin + 22 + speed * 4) % 360;

    drone.style.transform = `translate3d(${flight.x}px, ${flight.y}px, 0) rotate(${flight.heading}deg) perspective(260px) rotateX(${pitch}deg) rotateY(${drift.roll}deg)`;
    blades.forEach((blade, index) => blade.setAttribute('transform', `rotate(${index % 2 ? -drift.spin : drift.spin})`));
    reticle.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    readout.style.transform = `translate3d(${pointer.x + 16}px, ${pointer.y - 24}px, 0)`;
    if (drift.frame % 4 === 0) readout.textContent = `X${pad(pointer.x, 4)} Y${pad(pointer.y, 4)}`;

    updateLock();
    drawTrail(speed);
    requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (!flight.active) {
      flight.active = true;
      layer.classList.add('is-visible');
    }
  }, { passive: true });

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'mouse') setTarget(event.target.closest(TARGETS));
  });

  document.addEventListener('mouseout', (event) => {
    if (event.relatedTarget) return;
    flight.active = false;
    layer.classList.remove('is-visible');
    setTarget(null);
  });

  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || !motionOn) return;
    const ring = document.createElement('span');
    ring.className = 'cursor-ping';
    ring.style.left = `${event.clientX}px`;
    ring.style.top = `${event.clientY}px`;
    ring.addEventListener('animationend', () => ring.remove());
    layer.append(ring);
    drift.vy -= 7; // a little hop on click
  });

  sizeTrail();
  window.addEventListener('resize', sizeTrail);
  requestAnimationFrame(tick);
}

if (finePointer) initDroneCursor();

/* ---------- Background: map grid, terrain contours, radar, and a UAV swarm ---------- */
function initSwarm() {
  const canvas = document.getElementById('uavBackground');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  const GRID = 56;
  const PARALLAX = 0.12;
  const ROTORS = [[-8, -8], [8, -8], [8, 8], [-8, 8]];
  let width = 0;
  let height = 0;
  let span = 0;
  let frame = 0;
  let clock = 0;
  let running = false;
  let radar = { x: 0, y: 0, r: 0 };
  let terrain = [];
  let drones = [];

  const random = (min, max) => min + Math.random() * (max - min);
  const waypoint = () => ({ x: random(width * 0.06, width * 0.94), y: random(height * 0.1, height * 0.92) });

  function makeDrone(index) {
    return {
      id: pad(index + 1, 2),
      x: random(0, width),
      y: random(0, height),
      vx: 0,
      vy: 0,
      heading: random(0, TAU),
      spin: random(0, TAU),
      cruise: random(0.35, 0.7),
      blip: 0,
      trail: [],
      target: waypoint(),
    };
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const compact = width < 700;
    radar = { x: width * (compact ? 0.8 : 0.86), y: height * 0.8, r: Math.min(width, height) * (compact ? 0.42 : 0.36) };

    // Terrain features are spread over the whole (parallax-scaled) page so contours scroll past like a map.
    // Positions are stored as fractions so mobile toolbar resizes don't reshuffle the map.
    span = height + (root.scrollHeight - height) * PARALLAX;
    if (!terrain.length) {
      const count = Math.max(3, Math.ceil(span / 520));
      terrain = Array.from({ length: count }, (_, index) => ({
        fx: index % 2 ? random(0.8, 0.96) : random(0.03, 0.18),
        fy: (index + 0.5) / count,
        size: random(26, 38),
        seed: random(0, 10),
      }));
    }

    const fleet = compact ? 5 : 9;
    if (drones.length !== fleet) drones = Array.from({ length: fleet }, (_, index) => makeDrone(index));
  }

  function update(time) {
    frame += 1;
    const sweep = (time * 0.0006) % TAU;

    drones.forEach((drone) => {
      const dx = drone.target.x - drone.x;
      const dy = drone.target.y - drone.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < 26) drone.target = waypoint();

      // Steer toward the waypoint at cruise speed, keep separation, and scatter away from the cursor drone.
      let ax = ((dx / distance) * drone.cruise - drone.vx) * 0.03;
      let ay = ((dy / distance) * drone.cruise - drone.vy) * 0.03;
      drones.forEach((other) => {
        const ox = drone.x - other.x;
        const oy = drone.y - other.y;
        const gap = Math.hypot(ox, oy);
        if (other !== drone && gap > 0 && gap < 70) {
          ax += (ox / gap) * 0.02;
          ay += (oy / gap) * 0.02;
        }
      });
      if (flight.active) {
        const cx = drone.x - flight.x;
        const cy = drone.y - flight.y;
        const gap = Math.hypot(cx, cy);
        if (gap > 0 && gap < 170) {
          const push = (1 - gap / 170) * 0.35;
          ax += (cx / gap) * push;
          ay += (cy / gap) * push;
        }
      }

      drone.vx += ax;
      drone.vy += ay;
      const speed = Math.hypot(drone.vx, drone.vy);
      if (speed > 2.6) {
        drone.vx *= 2.6 / speed;
        drone.vy *= 2.6 / speed;
      }
      drone.x += drone.vx;
      drone.y += drone.vy;

      if (speed > 0.05) {
        const turn = Math.atan2(drone.vy, drone.vx) - drone.heading;
        drone.heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * 0.08;
      }
      drone.spin += 0.6 + speed * 0.2;

      // Light up when the radar sweep passes over.
      drone.blip *= 0.975;
      const rx = drone.x - radar.x;
      const ry = drone.y - radar.y;
      if (Math.hypot(rx, ry) < radar.r) {
        const behind = (((sweep - Math.atan2(ry, rx)) % TAU) + TAU) % TAU;
        if (behind < 0.08) drone.blip = 1;
      }

      if (frame % 4 === 0) {
        drone.trail.push({ x: drone.x, y: drone.y });
        if (drone.trail.length > 30) drone.trail.shift();
      }
    });
  }

  function drawGrid(offset) {
    const { accent, ink } = palette;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0.5; x < width; x += GRID) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0.5 - (offset % GRID); y < height; y += GRID) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.strokeStyle = rgba(ink, 0.045);
    ctx.stroke();

    ctx.beginPath();
    const major = GRID * 4;
    for (let x = GRID * 2 + 0.5; x < width; x += major) {
      for (let y = 0.5 - (offset % major) + GRID * 2 - major; y < height + major; y += major) {
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
      }
    }
    ctx.strokeStyle = rgba(accent, 0.22);
    ctx.stroke();
  }

  function drawTerrain(offset, time) {
    ctx.strokeStyle = rgba(palette.accent, 0.075);
    terrain.forEach((feature) => {
      const cx = feature.fx * width;
      const cy = feature.fy * span - offset;
      if (cy < -300 || cy > height + 300) return;
      for (let ring = 1; ring <= 6; ring += 1) {
        ctx.beginPath();
        for (let step = 0; step <= 48; step += 1) {
          const angle = (step / 48) * TAU;
          const wobble = 1
            + 0.14 * Math.sin(3 * angle + feature.seed + ring * 0.3)
            + 0.08 * Math.sin(5 * angle - feature.seed + time * 0.00012 * ring);
          const r = feature.size * ring * wobble;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r * 0.8;
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    });
  }

  function drawRadar(time) {
    const { accent } = palette;
    const sweep = (time * 0.0006) % TAU;
    ctx.save();
    ctx.translate(radar.x, radar.y);
    ctx.strokeStyle = rgba(accent, 0.1);
    for (let ring = 1; ring <= 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, (radar.r * ring) / 3, 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-radar.r, 0);
    ctx.lineTo(radar.r, 0);
    ctx.moveTo(0, -radar.r);
    ctx.lineTo(0, radar.r);
    ctx.stroke();
    for (let slice = 0; slice < 20; slice += 1) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radar.r, sweep - (slice + 1) * 0.04, sweep - slice * 0.04);
      ctx.closePath();
      ctx.fillStyle = rgba(accent, 0.07 * (1 - slice / 20));
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweep) * radar.r, Math.sin(sweep) * radar.r);
    ctx.strokeStyle = rgba(accent, 0.28);
    ctx.stroke();
    ctx.restore();
  }

  function drawDrone(drone) {
    const { accent } = palette;
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(drone.heading + Math.PI / 2);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba(accent, 0.5);
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(8, 8);
    ctx.moveTo(8, -8);
    ctx.lineTo(-8, 8);
    ctx.stroke();
    ctx.lineWidth = 1;
    ROTORS.forEach(([rx, ry], index) => {
      const spin = index % 2 ? -drone.spin : drone.spin;
      ctx.strokeStyle = rgba(accent, 0.28);
      ctx.beginPath();
      ctx.arc(rx, ry, 5.5, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = rgba(accent, 0.6);
      ctx.beginPath();
      ctx.moveTo(rx - Math.cos(spin) * 4.5, ry - Math.sin(spin) * 4.5);
      ctx.lineTo(rx + Math.cos(spin) * 4.5, ry + Math.sin(spin) * 4.5);
      ctx.stroke();
    });
    ctx.fillStyle = rgba(accent, 0.75);
    ctx.fillRect(-3, -4, 6, 8);
    ctx.restore();
  }

  function render(time) {
    const { accent } = palette;
    const offset = window.scrollY * PARALLAX;
    ctx.clearRect(0, 0, width, height);
    drawGrid(offset);
    drawTerrain(offset, time);
    drawRadar(time);

    // Mesh links between nearby drones.
    ctx.lineWidth = 1;
    for (let i = 0; i < drones.length; i += 1) {
      for (let j = i + 1; j < drones.length; j += 1) {
        const gap = Math.hypot(drones[i].x - drones[j].x, drones[i].y - drones[j].y);
        if (gap < 220) {
          ctx.strokeStyle = rgba(accent, (1 - gap / 220) * 0.12);
          ctx.beginPath();
          ctx.moveTo(drones[i].x, drones[i].y);
          ctx.lineTo(drones[j].x, drones[j].y);
          ctx.stroke();
        }
      }
    }

    // Planned route to each waypoint, then the flown trail.
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = rgba(accent, 0.1);
    drones.forEach((drone) => {
      ctx.beginPath();
      ctx.moveTo(drone.x, drone.y);
      ctx.lineTo(drone.target.x, drone.target.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    drones.forEach((drone) => {
      ctx.save();
      ctx.translate(drone.target.x, drone.target.y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = rgba(accent, 0.3);
      ctx.strokeRect(-3.5, -3.5, 7, 7);
      ctx.restore();
      drone.trail.forEach((point, index) => {
        ctx.fillStyle = rgba(accent, (index / drone.trail.length) * 0.3);
        ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
      });
    });

    ctx.font = '600 9px "JetBrains Mono", ui-monospace, monospace';
    drones.forEach((drone) => {
      drawDrone(drone);
      if (drone.blip > 0.02) {
        ctx.beginPath();
        ctx.arc(drone.x, drone.y, 14 + (1 - drone.blip) * 16, 0, TAU);
        ctx.strokeStyle = rgba(accent, drone.blip * 0.5);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(accent, 0.36 + drone.blip * 0.4);
      ctx.fillText(`UAV-${drone.id}`, drone.x + 15, drone.y - 12);
    });
  }

  function loop(time) {
    if (!motionOn) {
      running = false;
      render(clock);
      return;
    }
    clock = time;
    update(time);
    render(time);
    requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    if (!motionOn) render(clock);
  });
  // With motion off the map is drawn once, as a still frame, and redrawn only when the theme changes.
  themeListeners.push(() => { if (!motionOn) render(clock); });
  motionListeners.push(() => { if (motionOn) start(); });
  if (motionOn) start();
  else render(clock);
}

initSwarm();
