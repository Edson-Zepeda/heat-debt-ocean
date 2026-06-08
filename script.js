(() => {
  const canvas = document.getElementById("worldCanvas");
  let ctx = canvas.getContext("2d", { alpha: false });
  const root = document.documentElement;
  const body = document.body;
  const chapterEls = Array.from(document.querySelectorAll(".chapter[data-chapter]"));
  const railItems = Array.from(document.querySelectorAll(".chapter-rail li"));
  const sources = document.getElementById("sources");
  const motionToggle = document.getElementById("motionToggle");
  const heatValue = document.getElementById("heatValue");
  const bufferValue = document.getElementById("bufferValue");
  const breathValue = document.getElementById("breathValue");
  const silenceValue = document.getElementById("silenceValue");
  const heatTrack = document.getElementById("heatTrack");
  const bufferTrack = document.getElementById("bufferTrack");
  const breathTrack = document.getElementById("breathTrack");
  const silenceTrack = document.getElementById("silenceTrack");
  const currentChapter = document.getElementById("currentChapter");
  const depthValue = document.getElementById("depthValue");
  const drop = document.getElementById("drop");
  const returnField = document.getElementById("returnField");
  const resultMessage = document.getElementById("resultMessage");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduceMotion = () => prefersReducedMotion.matches || body.classList.contains("motion-paused");

  const chapters = [
    {
      id: "prologue",
      label: "01 / inland heat",
      mode: "room",
      depth: 0,
      heat: 10,
      water: 86,
      buffer: 100,
      breath: 100,
      acid: 0,
      silence: 0,
      palette: ["#f5efd9", "#cfcbbd", "#0d3438", "#ec9f4c"]
    },
    {
      id: "unseen",
      label: "02 / unseen ocean",
      mode: "descent",
      depth: 18,
      heat: 18,
      water: 92,
      buffer: 96,
      breath: 96,
      acid: 4,
      silence: 3,
      palette: ["#d7eee7", "#4f979b", "#062a34", "#f0b75f"]
    },
    {
      id: "breath",
      label: "03 / breath layer",
      mode: "plankton",
      depth: 42,
      heat: 22,
      water: 94,
      buffer: 92,
      breath: 100,
      acid: 8,
      silence: 5,
      palette: ["#143d43", "#1c787e", "#c7fff2", "#f5f7e7"]
    },
    {
      id: "coral",
      label: "04 / coral city",
      mode: "coral",
      depth: 76,
      heat: 31,
      water: 90,
      buffer: 84,
      breath: 88,
      acid: 18,
      silence: 10,
      palette: ["#08333c", "#167075", "#ff9e69", "#f3dc73"]
    },
    {
      id: "shield",
      label: "05 / mangrove shield",
      mode: "mangrove",
      depth: 4,
      heat: 39,
      water: 82,
      buffer: 72,
      breath: 78,
      acid: 24,
      silence: 17,
      palette: ["#182d25", "#425b3c", "#8fb673", "#d4b15c"]
    },
    {
      id: "ledger",
      label: "06 / heat ledger",
      mode: "ledger",
      depth: 420,
      heat: 63,
      water: 70,
      buffer: 48,
      breath: 58,
      acid: 48,
      silence: 34,
      palette: ["#0b252d", "#324f58", "#d96032", "#f0b761"]
    },
    {
      id: "silence",
      label: "07 / bleaching",
      mode: "bleach",
      depth: 38,
      heat: 78,
      water: 54,
      buffer: 28,
      breath: 34,
      acid: 68,
      silence: 69,
      palette: ["#283238", "#d9d5c2", "#f4eee0", "#9b4b37"]
    },
    {
      id: "future",
      label: "08 / no-water future",
      mode: "future",
      depth: -1,
      heat: 96,
      water: 18,
      buffer: 8,
      breath: 18,
      acid: 84,
      silence: 92,
      palette: ["#210d0b", "#7e1f18", "#e46e31", "#f0d39a"]
    },
    {
      id: "reciprocity",
      label: "09 / reciprocity",
      mode: "return",
      depth: 3,
      heat: 84,
      water: 28,
      buffer: 18,
      breath: 26,
      acid: 72,
      silence: 78,
      palette: ["#09272d", "#155b62", "#8ee6d8", "#f4f0dc"]
    }
  ];

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    scroll: 0,
    active: 0,
    chapterProgress: 0,
    visual: { from: 0, to: 0, t: 0, raw: 0 },
    pointerX: 0.5,
    pointerY: 0.44,
    restore: 0,
    restoreTarget: 0,
    metrics: { heat: 10, water: 86, buffer: 100, breath: 100, acid: 0, silence: 0 },
    particles: [],
    fish: [],
    coral: [],
    roots: [],
    bubbles: [],
    raf: 0,
    lastTime: 0
  };

  const sceneBuffers = Array.from({ length: 2 }, () => {
    const bufferCanvas = document.createElement("canvas");
    return {
      canvas: bufferCanvas,
      ctx: bufferCanvas.getContext("2d", { alpha: false })
    };
  });

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smoothstep = (edge0, edge1, value) => {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function colorMix(a, b, t, alpha = 1) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return `rgba(${Math.round(mix(ca.r, cb.r, t))}, ${Math.round(mix(ca.g, cb.g, t))}, ${Math.round(mix(ca.b, cb.b, t))}, ${alpha})`;
  }

  function random(seed) {
    const x = Math.sin(seed * 999) * 10000;
    return x - Math.floor(x);
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    for (const buffer of sceneBuffers) {
      buffer.canvas.width = canvas.width;
      buffer.canvas.height = canvas.height;
      buffer.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }
    seedWorld();
    readScroll();
  }

  function seedWorld() {
    const w = state.width;
    const h = state.height;
    state.particles = Array.from({ length: 130 }, (_, i) => ({
      x: random(i + 1) * w,
      y: random(i + 20) * h,
      r: 0.8 + random(i + 40) * 2.8,
      s: 0.18 + random(i + 80) * 0.9,
      hue: random(i + 120)
    }));
    state.bubbles = Array.from({ length: 52 }, (_, i) => ({
      x: random(i + 210) * w,
      y: random(i + 260) * h,
      r: 2 + random(i + 310) * 8,
      s: 0.2 + random(i + 360) * 0.8
    }));
    state.fish = Array.from({ length: 34 }, (_, i) => ({
      x: random(i + 430) * w,
      y: h * (0.2 + random(i + 460) * 0.58),
      size: 0.55 + random(i + 490) * 1.5,
      speed: 0.25 + random(i + 520) * 0.7,
      dir: random(i + 550) > 0.5 ? 1 : -1,
      hue: random(i + 580)
    }));
    state.coral = Array.from({ length: 28 }, (_, i) => ({
      x: random(i + 610) * w,
      base: h * (0.72 + random(i + 640) * 0.23),
      height: h * (0.08 + random(i + 670) * 0.18),
      arms: 2 + Math.floor(random(i + 700) * 4),
      hue: random(i + 730)
    }));
    state.roots = Array.from({ length: 30 }, (_, i) => ({
      x: random(i + 800) * w,
      bend: -60 + random(i + 830) * 120,
      length: h * (0.35 + random(i + 860) * 0.35),
      width: 1.5 + random(i + 890) * 3.5
    }));
  }

  function readScroll() {
    const y = window.scrollY;
    const end = Math.max(1, sources.offsetTop - window.innerHeight);
    state.scroll = clamp(y / end, 0, 1);

    let active = 0;
    let bestVisibility = -1;
    for (let i = 0; i < chapterEls.length; i += 1) {
      const rect = chapterEls[i].getBoundingClientRect();
      const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      if (visible > bestVisibility) {
        bestVisibility = visible;
        active = i;
      }
    }

    const currentTop = chapterEls[active].offsetTop;
    const nextTop =
      active < chapterEls.length - 1 ? chapterEls[active + 1].offsetTop : sources.offsetTop;
    state.active = clamp(active, 0, chapters.length - 1);
    const progressProbe = y + window.innerHeight * 0.46;
    state.chapterProgress = clamp((progressProbe - currentTop) / Math.max(1, nextTop - currentTop), 0, 1);
    updateVisualBlend(progressProbe);
  }

  function updateVisualBlend(probeY) {
    let from = 0;
    for (let i = 0; i < chapterEls.length - 1; i += 1) {
      if (probeY >= chapterEls[i + 1].offsetTop) from = i + 1;
    }

    const to = Math.min(from + 1, chapterEls.length - 1);
    const fromTop = chapterEls[from].offsetTop;
    const toTop = to > from ? chapterEls[to].offsetTop : sources.offsetTop;
    const raw = to === from ? 0 : clamp((probeY - fromTop) / Math.max(1, toTop - fromTop), 0, 1);
    const t = to === from ? 0 : smoothstep(0.08, 0.92, raw);
    state.visual = { from, to, t, raw };
  }

  function scrollToHash(hash, smooth = false) {
    if (!hash || hash === "#") return;
    const target = document.querySelector(hash);
    if (!target) return;
    window.scrollTo({
      top: target.offsetTop,
      behavior: smooth && !reduceMotion() ? "smooth" : "auto"
    });
    window.setTimeout(readScroll, smooth ? 420 : 80);
  }

  function setPointer(event) {
    state.pointerX = clamp(event.clientX / window.innerWidth, 0, 1);
    state.pointerY = clamp(event.clientY / window.innerHeight, 0, 1);
  }

  function targetMetrics() {
    const current = chapters[state.visual.from] || chapters[state.active];
    const next = chapters[state.visual.to] || current;
    const t = state.visual.t;
    const restore = state.restore;
    return {
      heat: clamp(mix(current.heat, next.heat, t) - restore * 42, 4, 100),
      water: clamp(mix(current.water, next.water, t) + restore * 48, 8, 100),
      buffer: clamp(mix(current.buffer, next.buffer, t) + restore * 64, 4, 100),
      breath: clamp(mix(current.breath, next.breath, t) + restore * 58, 8, 100),
      acid: clamp(mix(current.acid, next.acid, t) - restore * 42, 0, 100),
      silence: clamp(mix(current.silence, next.silence, t) - restore * 54, 0, 100)
    };
  }

  function applyDomState() {
    const m = state.metrics;
    root.style.setProperty("--heat", m.heat.toFixed(2));
    root.style.setProperty("--water", m.water.toFixed(2));
    root.style.setProperty("--buffer", m.buffer.toFixed(2));
    root.style.setProperty("--breath", m.breath.toFixed(2));
    root.style.setProperty("--acid", m.acid.toFixed(2));
    root.style.setProperty("--silence", m.silence.toFixed(2));
    root.style.setProperty("--restore", state.restore.toFixed(2));
    root.style.setProperty("--scroll", state.scroll.toFixed(4));
    root.style.setProperty("--chapter-progress", state.chapterProgress.toFixed(4));
    root.style.setProperty("--transition-mix", state.visual.t.toFixed(4));

    heatValue.textContent = String(Math.round(m.heat));
    bufferValue.textContent = String(Math.round(m.buffer));
    breathValue.textContent = String(Math.round(m.breath));
    silenceValue.textContent = String(Math.round(m.silence));
    heatTrack.style.width = `${m.heat}%`;
    bufferTrack.style.width = `${m.buffer}%`;
    breathTrack.style.width = `${m.breath}%`;
    silenceTrack.style.width = `${m.silence}%`;
    currentChapter.textContent = chapters[state.active].label;
    const depthFrom = chapters[state.visual.from] || chapters[state.active];
    const depthTo = chapters[state.visual.to] || depthFrom;
    const mixedDepth = mix(depthFrom.depth, depthTo.depth, state.visual.t);
    depthValue.textContent = mixedDepth < 0 ? "dry" : `${Math.round(mixedDepth)} m`;

    railItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === state.active);
    });
  }

  function clearWithGradient(a, b, c, t = 0) {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, colorMix(a, b, t, 1));
    gradient.addColorStop(0.54, colorMix(b, c, t, 1));
    gradient.addColorStop(1, c);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawSun(x, y, radius, heatAlpha) {
    const g = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius * 1.45);
    g.addColorStop(0, "rgba(255, 248, 184, 0.96)");
    g.addColorStop(0.35, "rgba(242, 183, 94, 0.84)");
    g.addColorStop(0.72, `rgba(227, 109, 53, ${0.32 + heatAlpha * 0.34})`);
    g.addColorStop(1, "rgba(227, 109, 53, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 244, 190, 0.88)";
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRoom(time, intensity) {
    const w = state.width;
    const h = state.height;
    clearWithGradient("#f5efd9", "#cfcbbd", "#154049", intensity * 0.2);
    drawSun(w * 0.82, h * 0.18, Math.min(w, h) * 0.11, intensity);

    ctx.fillStyle = "rgba(245, 243, 232, 0.42)";
    ctx.fillRect(w * 0.06, h * 0.16, w * 0.42, h * 0.3);
    ctx.strokeStyle = "rgba(18, 24, 19, 0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(w * 0.13, h * 0.2, w * 0.34, h * 0.25);
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.2);
    ctx.lineTo(w * 0.3, h * 0.45);
    ctx.moveTo(w * 0.13, h * 0.325);
    ctx.lineTo(w * 0.47, h * 0.325);
    ctx.stroke();

    ctx.fillStyle = "rgba(23, 37, 34, 0.24)";
    for (let i = 0; i < 12; i += 1) {
      const bw = w * (0.018 + random(i + 13) * 0.025);
      const bh = h * (0.03 + random(i + 23) * 0.08);
      ctx.fillRect(w * (0.14 + i * 0.027), h * 0.45 - bh, bw, bh);
    }

    ctx.fillStyle = "rgba(207, 203, 189, 0.9)";
    ctx.fillRect(0, h * 0.49, w, h * 0.08);
    ctx.fillStyle = "rgba(12, 54, 58, 0.86)";
    ctx.fillRect(0, h * 0.56, w, h * 0.44);
    drawWaterSurface(h * 0.56, 0.18, time);
    drawGlass(w * 0.28, h * 0.51, h * 0.2, state.metrics.water / 100);

    ctx.globalAlpha = 0.18 + intensity * 0.24;
    ctx.strokeStyle = "#e36d35";
    ctx.lineWidth = 2;
    for (let x = -20; x < w + 80; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(time * 0.001 + x) * 6, 0);
      ctx.lineTo(x + 28 + Math.sin(time * 0.001 + x) * 8, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawDescent(time, intensity) {
    const w = state.width;
    const h = state.height;
    clearWithGradient("#d7eee7", "#4f979b", "#062a34", intensity * 0.3);
    drawLightShafts(time, 0.65);
    drawWaterSurface(h * (0.18 + intensity * 0.04), 0.38, time);
    drawBubbles(time, 0.8);
    drawRoomReflection(time, 1 - intensity);
    drawDepthLines(time, "#b8f4e8", 0.18);
  }

  function drawPlankton(time, intensity) {
    clearWithGradient("#143d43", "#1c787e", "#02161e", 0);
    drawLightShafts(time, 0.44);
    drawDepthLines(time, "#c7fff2", 0.18);
    for (const p of state.particles) {
      const x = (p.x + time * p.s * 0.025 + state.pointerX * 28) % state.width;
      const y = (p.y + Math.sin(time * 0.001 * p.s + p.x) * 18 + state.pointerY * 12) % state.height;
      const pulse = 0.4 + Math.sin(time * 0.003 + p.hue * 8) * 0.3;
      ctx.fillStyle = `rgba(199, 255, 242, ${0.2 + pulse * 0.44})`;
      ctx.beginPath();
      ctx.arc(x, y, p.r * (0.9 + pulse), 0, Math.PI * 2);
      ctx.fill();
    }
    drawBreathRings(time, intensity);
  }

  function drawCoral(time, intensity) {
    clearWithGradient("#08333c", "#167075", "#02161e", 0);
    drawLightShafts(time, 0.28);
    drawDepthLines(time, "#f5f7e7", 0.12);
    drawCoralField(time, false, intensity);
    drawFishSchool(time, 1 - state.metrics.silence / 120);
    drawBubbles(time, 0.35);
  }

  function drawMangrove(time, intensity) {
    clearWithGradient("#d8c894", "#425b3c", "#0d2824", intensity * 0.25);
    drawSun(state.width * 0.78, state.height * 0.16, Math.min(state.width, state.height) * 0.1, 0.25);
    drawStormBands(time, intensity);
    ctx.fillStyle = "rgba(8, 41, 36, 0.84)";
    ctx.fillRect(0, state.height * 0.58, state.width, state.height * 0.42);
    drawWaterSurface(state.height * 0.58, 0.42, time);
    drawMangroveRoots(time, intensity);
  }

  function drawLedger(time, intensity) {
    clearWithGradient("#0b252d", "#324f58", "#081218", intensity * 0.2);
    drawDepthLines(time, "#d96032", 0.24);
    drawCurrentBands(time, intensity);
    drawHeatCells(time, intensity);
    drawFishSchool(time, 0.45);
  }

  function drawBleach(time, intensity) {
    clearWithGradient("#283238", "#5c6868", "#d9d5c2", intensity * 0.5);
    drawLightShafts(time, 0.18);
    drawCoralField(time, true, intensity);
    drawFishSchool(time, 0.12);
    ctx.fillStyle = `rgba(244, 238, 224, ${0.12 + intensity * 0.2})`;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawFuture(time, intensity) {
    const w = state.width;
    const h = state.height;
    clearWithGradient("#210d0b", "#7e1f18", "#180807", intensity * 0.2);
    drawSun(w * 0.72, h * 0.2, Math.min(w, h) * 0.16, 1);
    ctx.fillStyle = "rgba(240, 211, 154, 0.26)";
    for (let i = 0; i < 16; i += 1) {
      const x = w * (i / 15);
      const y = h * (0.58 + random(i + 1000) * 0.12);
      ctx.fillRect(x - w * 0.02, y - h * 0.18 * random(i + 1100), w * 0.045, h);
    }
    ctx.strokeStyle = "rgba(255, 218, 166, 0.34)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i += 1) {
      const y = h * (0.68 + i * 0.035);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 46) {
        ctx.lineTo(x, y + Math.sin(x * 0.018 + i) * 10);
      }
      ctx.stroke();
    }
    drawGlass(w * 0.25, h * 0.58, h * 0.2, 0.05);
    ctx.globalAlpha = 0.35 + intensity * 0.25;
    drawHeatCells(time, intensity);
    ctx.globalAlpha = 1;
  }

  function drawReturn(time, intensity) {
    clearWithGradient("#09272d", "#155b62", "#031418", 0);
    drawLightShafts(time, 0.36 + state.restore * 0.3);
    drawWaterSurface(state.height * (0.48 - state.restore * 0.09), 0.54, time);
    drawCoralField(time, state.restore < 0.35, 0.4);
    drawBubbles(time, 0.35 + state.restore * 0.55);
    drawBreathRings(time, intensity);
  }

  function drawMode(mode, time, intensity) {
    if (mode === "room") drawRoom(time, intensity);
    if (mode === "descent") drawDescent(time, intensity);
    if (mode === "plankton") drawPlankton(time, intensity);
    if (mode === "coral") drawCoral(time, intensity);
    if (mode === "mangrove") drawMangrove(time, intensity);
    if (mode === "ledger") drawLedger(time, intensity);
    if (mode === "bleach") drawBleach(time, intensity);
    if (mode === "future") drawFuture(time, intensity);
    if (mode === "return") drawReturn(time, intensity);
  }

  function renderSceneToBuffer(buffer, chapter, time, intensity) {
    const mainCtx = ctx;
    ctx = buffer.ctx;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    drawMode(chapter.mode, time, intensity);
    ctx = mainCtx;
  }

  function drawTransitionVeil(time, from, to, t) {
    const pulse = Math.sin(t * Math.PI);
    if (pulse <= 0.001) return;

    const fromPalette = from.palette;
    const toPalette = to.palette;
    const wash = ctx.createLinearGradient(0, 0, state.width, state.height);
    wash.addColorStop(0, colorMix(fromPalette[0], toPalette[0], t, 0.12 * pulse));
    wash.addColorStop(0.46, colorMix(fromPalette[1], toPalette[1], t, 0.2 * pulse));
    wash.addColorStop(1, colorMix(fromPalette[3], toPalette[3], t, 0.16 * pulse));
    ctx.save();
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.globalAlpha = 0.12 * pulse;
    ctx.strokeStyle = colorMix(fromPalette[2], toPalette[2], t, 0.9);
    ctx.lineWidth = 1.25;
    for (let i = 0; i < 14; i += 1) {
      const y = state.height * (0.1 + i * 0.065);
      ctx.beginPath();
      for (let x = -80; x <= state.width + 80; x += 48) {
        const wave =
          Math.sin(x * 0.01 + time * 0.0009 + i * 0.6) * state.height * 0.018 +
          Math.sin(x * 0.025 - time * 0.0006) * state.height * 0.006;
        if (x === -80) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorld(time) {
    const from = chapters[state.visual.from] || chapters[state.active];
    const to = chapters[state.visual.to] || from;
    const t = clamp(state.visual.t, 0, 1);

    if (from === to || t < 0.01) {
      drawMode(from.mode, time, state.visual.raw);
    } else if (t > 0.99) {
      drawMode(to.mode, time, 0);
    } else {
      renderSceneToBuffer(sceneBuffers[0], from, time, state.visual.raw);
      renderSceneToBuffer(sceneBuffers[1], to, time + 180, t);
      ctx.globalAlpha = 1;
      ctx.drawImage(sceneBuffers[0].canvas, 0, 0, state.width, state.height);
      ctx.globalAlpha = t;
      ctx.drawImage(sceneBuffers[1].canvas, 0, 0, state.width, state.height);
      ctx.globalAlpha = 1;
      drawTransitionVeil(time, from, to, t);
    }

    drawGlobalAtmosphere(time);
  }

  function drawWaterSurface(y, alpha, time) {
    ctx.strokeStyle = `rgba(202, 255, 244, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= state.width; x += 28) {
      const wave = Math.sin(x * 0.018 + time * 0.0017) * 4 + Math.sin(x * 0.045 - time * 0.001) * 2;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  function drawGlass(x, y, height, fill) {
    const width = height * 0.36;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "rgba(229, 255, 249, 0.62)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-width * 0.48, -height);
    ctx.lineTo(width * 0.48, -height);
    ctx.lineTo(width * 0.34, 0);
    ctx.lineTo(-width * 0.34, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(142, 230, 216, 0.72)";
    ctx.fillRect(-width * 0.28, -height * fill, width * 0.56, height * fill);
    ctx.restore();
  }

  function drawRoomReflection(time, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity * 0.28;
    ctx.fillStyle = "#f5efd9";
    ctx.fillRect(state.width * 0.12, state.height * 0.08, state.width * 0.42, state.height * 0.24);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
    ctx.strokeRect(state.width * 0.12, state.height * 0.08, state.width * 0.42, state.height * 0.24);
    ctx.restore();
  }

  function drawLightShafts(time, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    for (let i = 0; i < 4; i += 1) {
      const x = state.width * (0.2 + i * 0.18) + Math.sin(time * 0.0005 + i) * 20;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + state.width * 0.12, state.height);
      ctx.lineTo(x - state.width * 0.04, state.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDepthLines(time, color, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i < 11; i += 1) {
      const y = state.height * (0.16 + i * 0.075);
      ctx.beginPath();
      for (let x = -40; x <= state.width + 40; x += 52) {
        const yy = y + Math.sin(x * 0.018 + time * 0.001 + i) * 4;
        if (x === -40) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBubbles(time, opacity) {
    ctx.save();
    ctx.strokeStyle = `rgba(220, 255, 248, ${0.28 * opacity})`;
    ctx.lineWidth = 1;
    for (const b of state.bubbles) {
      const y = (b.y - time * b.s * 0.035 + state.height * 2) % state.height;
      const x = b.x + Math.sin(time * 0.001 + b.y) * 16;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBreathRings(time, intensity) {
    ctx.save();
    const cx = state.width * (0.5 + (state.pointerX - 0.5) * 0.08);
    const cy = state.height * (0.54 + (state.pointerY - 0.5) * 0.06);
    for (let i = 0; i < 5; i += 1) {
      const r = (state.height * 0.12 + i * state.height * 0.085) * (1 + Math.sin(time * 0.0012 + i) * 0.04);
      ctx.strokeStyle = `rgba(220, 255, 248, ${0.16 - i * 0.02 + intensity * 0.03})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFishSchool(time, opacity) {
    ctx.save();
    ctx.globalAlpha = clamp(opacity, 0, 1);
    for (const fish of state.fish) {
      const drift = time * fish.speed * 0.035 * fish.dir;
      let x = (fish.x + drift + state.width * 2) % (state.width + 120) - 60;
      const y = fish.y + Math.sin(time * 0.002 + fish.x) * 18 + (state.pointerY - 0.5) * 20;
      const s = fish.size * Math.min(state.width, state.height) * 0.018;
      ctx.fillStyle = fish.hue > 0.6 ? "rgba(243, 220, 115, 0.8)" : "rgba(255, 158, 105, 0.78)";
      ctx.beginPath();
      ctx.moveTo(x + s * fish.dir, y);
      ctx.lineTo(x - s * fish.dir, y - s * 0.45);
      ctx.lineTo(x - s * fish.dir, y + s * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(x + s * 0.35 * fish.dir, y - s * 0.08, Math.max(1, s * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCoralField(time, bleached, intensity) {
    ctx.save();
    for (const c of state.coral) {
      const color = bleached
        ? `rgba(238, 232, 210, ${0.62 + intensity * 0.2})`
        : c.hue > 0.55
          ? "rgba(255, 158, 105, 0.78)"
          : "rgba(243, 220, 115, 0.72)";
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, state.width * 0.003);
      ctx.lineCap = "round";
      for (let arm = 0; arm < c.arms; arm += 1) {
        const spread = (arm / Math.max(1, c.arms - 1) - 0.5) * c.height * 0.85;
        ctx.beginPath();
        ctx.moveTo(c.x, c.base);
        ctx.quadraticCurveTo(
          c.x + spread * 0.35 + Math.sin(time * 0.001 + arm) * 5,
          c.base - c.height * 0.52,
          c.x + spread,
          c.base - c.height
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawMangroveRoots(time, intensity) {
    ctx.save();
    ctx.strokeStyle = "rgba(18, 38, 25, 0.9)";
    ctx.lineCap = "round";
    for (const root of state.roots) {
      ctx.lineWidth = root.width;
      ctx.beginPath();
      ctx.moveTo(root.x, state.height * 0.05);
      ctx.bezierCurveTo(
        root.x + root.bend * 0.25,
        state.height * 0.28,
        root.x + root.bend,
        state.height * 0.46,
        root.x + root.bend * 0.45,
        Math.min(state.height, root.length)
      );
      ctx.stroke();
    }
    ctx.restore();
    drawStormBands(time, intensity * 0.5);
  }

  function drawStormBands(time, intensity) {
    ctx.save();
    ctx.globalAlpha = 0.18 + intensity * 0.22;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.56)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i += 1) {
      const y = state.height * (0.22 + i * 0.055);
      ctx.beginPath();
      ctx.moveTo(-40, y);
      ctx.lineTo(state.width + 40, y + Math.sin(time * 0.001 + i) * 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCurrentBands(time, intensity) {
    ctx.save();
    ctx.lineWidth = 10;
    for (let i = 0; i < 7; i += 1) {
      const y = state.height * (0.18 + i * 0.11);
      const gradient = ctx.createLinearGradient(0, y, state.width, y);
      gradient.addColorStop(0, "rgba(217, 96, 50, 0)");
      gradient.addColorStop(0.5, `rgba(217, 96, 50, ${0.16 + intensity * 0.18})`);
      gradient.addColorStop(1, "rgba(217, 96, 50, 0)");
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      for (let x = -40; x <= state.width + 40; x += 48) {
        const yy = y + Math.sin(x * 0.012 + time * 0.001 + i) * 32;
        if (x === -40) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHeatCells(time, intensity) {
    ctx.save();
    for (let i = 0; i < 9; i += 1) {
      const x = state.width * random(i + 1200);
      const y = state.height * random(i + 1300);
      const r = state.width * (0.08 + random(i + 1400) * 0.18);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(227, 109, 53, ${0.22 + intensity * 0.28})`);
      g.addColorStop(1, "rgba(227, 109, 53, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  function drawGlobalAtmosphere(time) {
    const heat = state.metrics.heat / 100;
    const silence = state.metrics.silence / 100;
    ctx.save();
    ctx.globalAlpha = heat * 0.16;
    ctx.fillStyle = "#e36d35";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.globalAlpha = silence * 0.18;
    ctx.fillStyle = "#d9d5c2";
    ctx.fillRect(0, 0, state.width, state.height);
    if (heat > 0.72 && !reduceMotion()) {
      ctx.globalAlpha = (heat - 0.72) * 0.2;
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      for (let x = -20; x < state.width + 30; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x + Math.sin(time * 0.01 + x) * 2, 0);
        ctx.lineTo(x + 12, state.height);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function tick(time = 0) {
    if (!state.lastTime) state.lastTime = time;
    const delta = Math.min(60, time - state.lastTime);
    state.lastTime = time;
    const ease = 1 - Math.pow(0.001, delta / 520);
    state.restore = mix(state.restore, state.restoreTarget, ease);
    const targets = targetMetrics();
    for (const key of Object.keys(state.metrics)) {
      state.metrics[key] = mix(state.metrics[key], targets[key], ease);
    }
    applyDomState();
    drawWorld(reduceMotion() ? 0 : time);
    state.raf = window.requestAnimationFrame(tick);
  }

  function restoreOcean() {
    if (state.restoreTarget === 1) return;
    state.restoreTarget = 1;
    body.classList.add("restored");
    resultMessage.textContent =
      "Reciprocity means reducing the heat we create, protecting blue carbon ecosystems like mangroves, restoring reefs, and remembering that even inland choices reach the ocean.";
  }

  function resetDrop() {
    drop.style.setProperty("--drop-x", "0px");
    drop.style.setProperty("--drop-y", "0px");
  }

  function setupDropGesture() {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let moved = false;

    drop.addEventListener("pointerdown", (event) => {
      if (state.restoreTarget === 1) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      drop.setPointerCapture(event.pointerId);
    });

    drop.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      moved = moved || Math.abs(dx) + Math.abs(dy) > 8;
      drop.style.setProperty("--drop-x", `${dx}px`);
      drop.style.setProperty("--drop-y", `${dy}px`);
    });

    drop.addEventListener("pointerup", (event) => {
      if (!dragging) return;
      dragging = false;
      drop.releasePointerCapture(event.pointerId);
      const dropRect = drop.getBoundingClientRect();
      const fieldRect = returnField.getBoundingClientRect();
      const centerX = dropRect.left + dropRect.width / 2;
      const centerY = dropRect.top + dropRect.height / 2;
      const inside =
        centerX > fieldRect.left &&
        centerX < fieldRect.right &&
        centerY > fieldRect.top &&
        centerY < fieldRect.bottom;
      if (inside) restoreOcean();
      else resetDrop();
    });

    drop.addEventListener("click", () => {
      if (!moved && state.restoreTarget !== 1) restoreOcean();
    });

    drop.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        restoreOcean();
      }
    });
  }

  function setupMotionToggle() {
    if (prefersReducedMotion.matches) {
      body.classList.add("motion-paused");
      motionToggle.textContent = "resume motion";
      motionToggle.setAttribute("aria-pressed", "true");
    }

    motionToggle.addEventListener("click", () => {
      const paused = body.classList.toggle("motion-paused");
      motionToggle.textContent = paused ? "resume motion" : "pause motion";
      motionToggle.setAttribute("aria-pressed", String(paused));
    });
  }

  function setupInternalLinks() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const hash = link.getAttribute("href");
        if (!hash || !document.querySelector(hash)) return;
        event.preventDefault();
        history.pushState(null, "", hash);
        scrollToHash(hash, true);
      });
    });
  }

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("hashchange", () => scrollToHash(location.hash));
  window.addEventListener("load", () => window.setTimeout(() => scrollToHash(location.hash), 120));
  window.addEventListener("pointermove", setPointer, { passive: true });
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(state.raf));

  resize();
  setupMotionToggle();
  setupInternalLinks();
  setupDropGesture();
  if (location.hash) window.setTimeout(() => scrollToHash(location.hash), 120);
  state.raf = window.requestAnimationFrame(tick);
})();
