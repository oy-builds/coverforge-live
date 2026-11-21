// CoverForge — a multi-panel GTA-style cover art maker.
//
// The poster is a five-panel collage (one tall hero panel plus four smaller
// ones). Every panel holds either an original illustrated scene preset,
// painted procedurally on canvas, or the visitor's own photo, which is read
// locally and never leaves the machine. Panels can be zoomed and shifted,
// the cover text is editable, three style presets re-grade the whole poster,
// and the result exports as a full-size PNG at 1080x1080, 1080x1350 or
// 1920x1080. Vanilla JS, no assets, no network.

// ---------------------------------------------------------------------------
// Small deterministic helpers (seeded, so renders are reproducible).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }

function vGrad(ctx, box, stops) {
  const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

function fillBox(ctx, box, paint) {
  ctx.fillStyle = paint;
  ctx.fillRect(box.x, box.y, box.w, box.h);
}

// A palm silhouette: curved trunk with a crown of drooping fronds.
function drawPalm(ctx, x, baseY, height, lean, color) {
  const topX = x + lean * height;
  const topY = baseY - height;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, height * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * height * 0.3, baseY - height * 0.6, topX, topY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, height * 0.028);
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = height * (0.34 + (i % 3) * 0.05);
    const endX = topX + Math.cos(ang) * len * (i < 3 ? -1 : 1) * (i === 3 ? 0.2 : 1);
    const endY = topY + Math.sin(ang) * len * 0.55 + len * 0.16;
    const midX = topX + (endX - topX) * 0.5;
    const midY = topY - len * 0.18;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Scene presets. Each painter receives an inflated box (the panel rect grown
// on every side) so zooming and shifting never expose an unpainted edge.

function paintNeonBeach(ctx, box, rng) {
  fillBox(ctx, box, vGrad(ctx, box, [[0, '#2b1055'], [0.42, '#b83280'], [0.62, '#ff7847'], [0.64, '#ffd194'], [1, '#1b1035']]));
  const horizon = box.y + box.h * 0.64;
  const sunX = box.x + box.w * 0.60;
  const sunY = horizon - box.h * 0.02;
  const sunR = box.w * 0.17;
  ctx.save();
  ctx.beginPath(); ctx.rect(box.x, box.y, box.w, horizon - box.y); ctx.clip();
  const sunGrad = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
  sunGrad.addColorStop(0, '#fff3b0'); sunGrad.addColorStop(0.7, '#ffb340'); sunGrad.addColorStop(1, '#ff2e88');
  ctx.fillStyle = sunGrad;
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(43,16,85,0.55)';
  for (let i = 0; i < 5; i++) {
    const y = sunY + sunR * (0.08 + i * 0.17);
    ctx.fillRect(sunX - sunR, y, sunR * 2, sunR * (0.045 + i * 0.012));
  }
  ctx.restore();
  // Sea: sun reflection column with broken shimmer strokes.
  ctx.strokeStyle = 'rgba(255,179,64,0.75)';
  for (let i = 0; i < 42; i++) {
    const t = rng();
    const y = horizon + t * box.h * 0.34;
    const spread = sunR * (0.25 + t * 1.15);
    const x = sunX + (rng() - 0.5) * 2 * spread;
    const len = 6 + rng() * spread * 0.5;
    ctx.lineWidth = 1 + t * 2.4;
    ctx.globalAlpha = 0.25 + rng() * 0.55;
    ctx.beginPath(); ctx.moveTo(x - len / 2, y); ctx.lineTo(x + len / 2, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  drawPalm(ctx, box.x + box.w * 0.10, box.y + box.h * 1.0, box.h * 0.52, 0.24, '#0d0618');
  drawPalm(ctx, box.x + box.w * 0.97, box.y + box.h * 1.02, box.h * 0.40, -0.3, '#0d0618');
}

function paintBoulevard(ctx, box, rng) {
  fillBox(ctx, box, vGrad(ctx, box, [[0, '#1d2b64'], [0.5, '#7e3a8c'], [0.68, '#f7797d'], [0.7, '#2a1e3f'], [1, '#120e24']]));
  const horizon = box.y + box.h * 0.68;
  ctx.fillStyle = '#ffd194';
  ctx.beginPath(); ctx.arc(box.x + box.w * 0.5, horizon - box.h * 0.015, box.w * 0.05, 0, Math.PI * 2); ctx.fill();
  // Road trapezoid rushing at the viewer.
  const vx = box.x + box.w * 0.5;
  ctx.fillStyle = '#17122b';
  ctx.beginPath();
  ctx.moveTo(vx - box.w * 0.03, horizon);
  ctx.lineTo(vx + box.w * 0.03, horizon);
  ctx.lineTo(box.x + box.w * 1.05, box.y + box.h);
  ctx.lineTo(box.x - box.w * 0.05, box.y + box.h);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,148,0.9)';
  ctx.lineWidth = Math.max(1.5, box.w * 0.006);
  ctx.setLineDash([box.h * 0.05, box.h * 0.045]);
  ctx.beginPath(); ctx.moveTo(vx, horizon); ctx.lineTo(vx, box.y + box.h); ctx.stroke();
  ctx.setLineDash([]);
  // Palm rows + neon signs shrinking toward the vanishing point.
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      const px = vx + side * box.w * lerp(0.055, 0.52, Math.pow(t, 1.4));
      const py = lerp(horizon, box.y + box.h * 1.0, Math.pow(t, 1.6));
      drawPalm(ctx, px, py, box.h * lerp(0.10, 0.46, t), side * -0.18, '#0a0616');
    }
    ctx.save();
    ctx.shadowBlur = 18;
    for (let i = 0; i < 3; i++) {
      const t = 0.25 + i * 0.3;
      const sx = vx + side * box.w * lerp(0.10, 0.62, t);
      const sy = lerp(horizon, box.y + box.h * 0.35, t);
      const sw = box.w * 0.028, sh = box.h * lerp(0.05, 0.16, t);
      ctx.shadowColor = i % 2 ? '#22d3ee' : '#ff2e88';
      ctx.fillStyle = i % 2 ? 'rgba(34,211,238,0.85)' : 'rgba(255,46,136,0.85)';
      ctx.fillRect(sx - sw / 2, sy - sh, sw, sh);
    }
    ctx.restore();
  }
  void rng;
}

function paintSwamp(ctx, box, rng) {
  fillBox(ctx, box, vGrad(ctx, box, [[0, '#0f3d3e'], [0.45, '#3f7d5d'], [0.58, '#a7c957'], [0.6, '#17301f'], [1, '#08170f']]));
  const waterY = box.y + box.h * 0.60;
  // Cypress silhouettes with canopy blobs and hanging moss.
  for (let i = 0; i < 6; i++) {
    const tx = box.x + box.w * (0.06 + i * 0.17) + (rng() - 0.5) * box.w * 0.05;
    const th = box.h * (0.34 + rng() * 0.16);
    ctx.fillStyle = '#0a2013';
    ctx.fillRect(tx - box.w * 0.008, waterY - th, box.w * 0.016, th);
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.ellipse(tx + (rng() - 0.5) * box.w * 0.09, waterY - th - rng() * box.h * 0.03,
        box.w * (0.045 + rng() * 0.03), box.h * (0.03 + rng() * 0.02), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(10,32,19,0.8)';
    ctx.lineWidth = 1.4;
    for (let j = 0; j < 3; j++) {
      const mx = tx + (rng() - 0.5) * box.w * 0.08;
      ctx.beginPath(); ctx.moveTo(mx, waterY - th); ctx.lineTo(mx + (rng() - 0.5) * 4, waterY - th + box.h * (0.08 + rng() * 0.07)); ctx.stroke();
    }
  }
  // Ripples.
  ctx.strokeStyle = 'rgba(167,201,87,0.5)';
  for (let i = 0; i < 26; i++) {
    const y = waterY + rng() * box.h * 0.36;
    const x = box.x + rng() * box.w;
    ctx.lineWidth = 1 + rng() * 1.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + rng() * 30, y); ctx.stroke();
  }
  // Airboat silhouette, centre stage.
  const cx = box.x + box.w * 0.5, by = box.y + box.h * 0.82, bw = box.w * 0.34, bh = box.h * 0.055;
  ctx.fillStyle = '#06130b';
  ctx.beginPath();
  ctx.moveTo(cx - bw / 2, by); ctx.lineTo(cx + bw / 2, by); ctx.lineTo(cx + bw * 0.36, by + bh); ctx.lineTo(cx - bw * 0.36, by + bh);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - bw * 0.05, by - bh * 1.5, bw * 0.1, bh * 1.5);
  ctx.beginPath(); ctx.arc(cx, by - bh * 2.1, bh * 1.05, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(167,201,87,0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, by - bh * 2.1, bh * 1.3, 0, Math.PI * 2); ctx.stroke();
}

function paintDowntown(ctx, box, rng) {
  fillBox(ctx, box, vGrad(ctx, box, [[0, '#050914'], [0.55, '#0d1b3e'], [0.78, '#27407c'], [0.8, '#0a0f22'], [1, '#05070f']]));
  ctx.fillStyle = '#e8ecf7';
  ctx.beginPath(); ctx.arc(box.x + box.w * 0.8, box.y + box.h * 0.13, box.w * 0.028, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(232,236,247,0.25)';
  ctx.beginPath(); ctx.arc(box.x + box.w * 0.8, box.y + box.h * 0.13, box.w * 0.055, 0, Math.PI * 2); ctx.fill();
  const ground = box.y + box.h * 0.8;
  // Two skyline rows; back row taller and bluer, front row near-black.
  const rows = [
    { base: ground, minH: 0.34, maxH: 0.62, color: '#101c3d', winA: 0.5 },
    { base: ground + box.h * 0.02, minH: 0.2, maxH: 0.44, color: '#05070f', winA: 0.85 },
  ];
  for (const row of rows) {
    let x = box.x - box.w * 0.02;
    while (x < box.x + box.w * 1.02) {
      const bw = box.w * (0.07 + rng() * 0.09);
      const bh = box.h * (row.minH + rng() * (row.maxH - row.minH));
      ctx.fillStyle = row.color;
      ctx.fillRect(x, row.base - bh, bw, bh);
      const cols = Math.max(2, Math.floor(bw / (box.w * 0.018)));
      const rowsN = Math.max(3, Math.floor(bh / (box.h * 0.045)));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rowsN; r++) {
          if (rng() > row.winA) continue;
          ctx.fillStyle = rng() > 0.3 ? 'rgba(255,217,122,0.95)' : 'rgba(155,231,255,0.95)';
          ctx.fillRect(x + (c + 0.5) * (bw / cols) - box.w * 0.004, row.base - bh + (r + 0.5) * (bh / rowsN) - box.h * 0.006, box.w * 0.008, box.h * 0.012);
        }
      }
      x += bw + box.w * 0.012;
    }
  }
  // Neon signs on the street band, reflected below.
  ctx.save();
  ctx.shadowBlur = 16;
  for (let i = 0; i < 4; i++) {
    const sx = box.x + box.w * (0.12 + i * 0.24);
    const color = i % 2 ? '#22d3ee' : '#ff2e88';
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(sx, ground - box.h * 0.16, box.w * 0.016, box.h * 0.16);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(sx, ground + box.h * 0.015, box.w * 0.016, box.h * 0.09);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function paintMarina(ctx, box, rng) {
  fillBox(ctx, box, vGrad(ctx, box, [[0, '#355c7d'], [0.4, '#c06c84'], [0.58, '#f8b195'], [0.6, '#6c5b7b'], [1, '#1d1a33']]));
  const waterY = box.y + box.h * 0.60;
  ctx.fillStyle = '#fff1d6';
  ctx.beginPath(); ctx.arc(box.x + box.w * 0.34, waterY - box.h * 0.01, box.w * 0.045, 0, Math.PI * 2); ctx.fill();
  // Water sparkle.
  ctx.strokeStyle = 'rgba(248,177,149,0.8)';
  for (let i = 0; i < 30; i++) {
    const y = waterY + rng() * box.h * 0.36;
    const x = box.x + box.w * 0.34 + (rng() - 0.5) * box.w * (0.2 + (y - waterY) / box.h);
    ctx.lineWidth = 1 + rng() * 1.6;
    ctx.globalAlpha = 0.3 + rng() * 0.5;
    ctx.beginPath(); ctx.moveTo(x - 6 - rng() * 10, y); ctx.lineTo(x + 6 + rng() * 10, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Sailboats: mast, two sails, hull.
  for (let i = 0; i < 4; i++) {
    const bx = box.x + box.w * (0.14 + i * 0.22) + (rng() - 0.5) * box.w * 0.06;
    const by = waterY + box.h * (0.05 + rng() * 0.2);
    const s = box.h * (0.16 + rng() * 0.1);
    ctx.strokeStyle = '#141126';
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - s); ctx.stroke();
    ctx.fillStyle = 'rgba(244,241,234,0.92)';
    ctx.beginPath();
    ctx.moveTo(bx, by - s); ctx.lineTo(bx, by - s * 0.08); ctx.lineTo(bx + s * 0.42, by - s * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(248,177,149,0.9)';
    ctx.beginPath();
    ctx.moveTo(bx, by - s * 0.94); ctx.lineTo(bx, by - s * 0.08); ctx.lineTo(bx - s * 0.3, by - s * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#141126';
    ctx.beginPath();
    ctx.moveTo(bx - s * 0.3, by); ctx.lineTo(bx + s * 0.34, by); ctx.lineTo(bx + s * 0.2, by + s * 0.09); ctx.lineTo(bx - s * 0.16, by + s * 0.09);
    ctx.closePath(); ctx.fill();
  }
  // Dock band across the bottom.
  ctx.fillStyle = '#0d0a1c';
  ctx.fillRect(box.x, box.y + box.h * 0.93, box.w, box.h * 0.07);
}

export const SCENES = [
  { id: 'neon-beach', name: 'Neon Beach Sunset', paint: paintNeonBeach },
  { id: 'palm-boulevard', name: 'Palm Boulevard', paint: paintBoulevard },
  { id: 'swamp-airboat', name: 'Swamp Airboat', paint: paintSwamp },
  { id: 'downtown-night', name: 'Downtown Night', paint: paintDowntown },
  { id: 'marina-dawn', name: 'Marina Dawn', paint: paintMarina },
];

// ---------------------------------------------------------------------------
// Style presets: panel borders, title treatment and the colour grade laid
// over the finished collage.

export const STYLES = {
  neon: {
    name: 'Neon Vice',
    border: '#0b0614',
    frame: '#ff2e88',
    titleFill: '#ffffff',
    titleStroke: '#12041f',
    tagBand: '#ff2e88',
    tagText: '#ffffff',
    badgeFill: '#12041f',
    badgeText: '#ffb340',
    badgeRing: '#ff2e88',
    grade: [[0, 'rgba(24,0,48,0.30)'], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(255,46,136,0.20)']],
  },
  sunset: {
    name: 'Sunset Coast',
    border: '#1c0f08',
    frame: '#ffb340',
    titleFill: '#fff7e6',
    titleStroke: '#33150a',
    tagBand: '#ffb340',
    tagText: '#33150a',
    badgeFill: '#33150a',
    badgeText: '#ffd194',
    badgeRing: '#ffb340',
    grade: [[0, 'rgba(255,120,60,0.10)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(255,90,40,0.26)']],
  },
  midnight: {
    name: 'Midnight',
    border: '#02040a',
    frame: '#22d3ee',
    titleFill: '#eaf6ff',
    titleStroke: '#02101f',
    tagBand: '#22d3ee',
    tagText: '#02101f',
    badgeFill: '#02101f',
    badgeText: '#9be7ff',
    badgeRing: '#22d3ee',
    grade: [[0, 'rgba(2,10,40,0.42)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(10,40,120,0.30)']],
  },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// The five-panel grid, as fractions of the poster. Panel 0 is the hero.
export function panelLayout(w, h) {
  const R = (x, y, pw, ph) => ({ x: x * w, y: y * h, w: pw * w, h: ph * h });
  if (w > h) {
    return [
      R(0, 0, 0.40, 1),
      R(0.40, 0, 0.30, 0.5),
      R(0.70, 0, 0.30, 0.5),
      R(0.40, 0.5, 0.30, 0.5),
      R(0.70, 0.5, 0.30, 0.5),
    ];
  }
  return [
    R(0, 0, 0.52, 1),
    R(0.52, 0, 0.48, 0.38),
    R(0.52, 0.38, 0.48, 0.30),
    R(0.52, 0.68, 0.24, 0.32),
    R(0.76, 0.68, 0.24, 0.32),
  ];
}

export function splitTitleLines(title) {
  const words = String(title).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['UNTITLED'];
  const lines = [];
  for (let i = 0; i < words.length; i += 2) lines.push(words.slice(i, i + 2).join(' '));
  return lines;
}

export function createDefaultState() {
  return {
    size: '1080x1350',
    style: 'neon',
    title: 'GRAND THEFT AUTO VI',
    tagline: 'WELCOME BACK TO LEONIDA',
    badge: true,
    selected: 0,
    panels: SCENES.map((scene, i) => ({
      scene: scene.id,
      photo: null,
      usePhoto: false,
      zoom: 1,
      x: 0,
      y: 0,
      serial: i,
    })),
  };
}

// ---------------------------------------------------------------------------
// Rendering. renderPoster draws the whole cover; the editor preview passes
// showSelection so the active panel is outlined, exports do not.

function inflatedBox(rect) {
  const grow = Math.max(rect.w, rect.h) * 0.85;
  return { x: rect.x - grow, y: rect.y - grow, w: rect.w + grow * 2, h: rect.h + grow * 2 };
}

function drawPhotoCover(ctx, img, box) {
  const scale = Math.max(box.w / img.width, box.h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
}

function drawPanel(ctx, panel, rect, style) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.translate(cx + (panel.x / 100) * rect.w * 0.5, cy + (panel.y / 100) * rect.h * 0.5);
  ctx.scale(panel.zoom, panel.zoom);
  ctx.translate(-cx, -cy);
  const box = inflatedBox(rect);
  if (panel.usePhoto && panel.photo) {
    drawPhotoCover(ctx, panel.photo, box);
  } else {
    const scene = SCENES.find((s) => s.id === panel.scene) ?? SCENES[0];
    scene.paint(ctx, box, mulberry32(0x9e3779b9 ^ (panel.serial * 7919 + 17)));
  }
  ctx.restore();
  const borderW = Math.max(3, rect.w * 0.012);
  ctx.strokeStyle = style.border;
  ctx.lineWidth = borderW;
  ctx.strokeRect(rect.x + borderW / 2, rect.y + borderW / 2, rect.w - borderW, rect.h - borderW);
}

function drawGrade(ctx, w, h, style) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of style.grade) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = style.frame;
  ctx.lineWidth = Math.max(4, w * 0.008);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

const TITLE_FONT = '"Arial Narrow", "Franklin Gothic Medium", Impact, sans-serif';

function drawTitleBlock(ctx, w, h, state, style) {
  const lines = splitTitleLines(state.title.toUpperCase());
  const pad = w * 0.045;
  let fontSize = h * 0.098;
  ctx.textBaseline = 'alphabetic';
  const fit = () => {
    ctx.font = `900 ${fontSize}px ${TITLE_FONT}`;
    return Math.max(...lines.map((line) => ctx.measureText(line).width));
  };
  while (fit() > w * 0.9 && fontSize > 10) fontSize *= 0.94;
  const lineHeight = fontSize * 0.94;
  const blockH = lineHeight * lines.length;
  const baseY = h - pad * 0.8;
  // Soft shadow plate so the lettering reads over any panel.
  const plateGrad = ctx.createLinearGradient(0, baseY - blockH - fontSize * 1.15, 0, h);
  plateGrad.addColorStop(0, 'rgba(0,0,0,0)');
  plateGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = plateGrad;
  ctx.fillRect(0, baseY - blockH - fontSize * 1.15, w, h);
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    const y = baseY - (lines.length - 1 - i) * lineHeight;
    ctx.font = `900 ${fontSize}px ${TITLE_FONT}`;
    ctx.lineWidth = fontSize * 0.16;
    ctx.strokeStyle = style.titleStroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(line, pad, y);
    ctx.fillStyle = style.titleFill;
    ctx.fillText(line, pad, y);
  });
  // Tagline band above the title.
  const tag = String(state.tagline).trim().toUpperCase();
  if (tag) {
    const tagSize = fontSize * 0.30;
    ctx.font = `700 ${tagSize}px ${TITLE_FONT}`;
    const tw = ctx.measureText(tag).width;
    const bandY = baseY - blockH - tagSize * 1.7;
    ctx.fillStyle = style.tagBand;
    ctx.fillRect(pad, bandY, tw + tagSize * 1.1, tagSize * 1.5);
    ctx.fillStyle = style.tagText;
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, pad + tagSize * 0.55, bandY + tagSize * 0.78);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawBadge(ctx, w, h, style) {
  const r = Math.min(w, h) * 0.088;
  const cx = w - r - w * 0.035;
  const cy = r + h * 0.03;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = r * 0.35;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = style.badgeFill; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = r * 0.09;
  ctx.strokeStyle = style.badgeRing;
  ctx.stroke();
  ctx.fillStyle = style.badgeText;
  ctx.font = `900 ${r * 1.05}px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VI', cx, cy + r * 0.05);
  ctx.restore();
}

export function renderPoster(ctx, w, h, state, opts = {}) {
  const style = STYLES[state.style] ?? STYLES.neon;
  const rects = panelLayout(w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => drawPanel(ctx, state.panels[i], rect, style));
  drawGrade(ctx, w, h, style);
  drawTitleBlock(ctx, w, h, state, style);
  if (state.badge) drawBadge(ctx, w, h, style);
  if (opts.showSelection) {
    const rect = rects[state.selected];
    ctx.save();
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.setLineDash([18, 12]);
    ctx.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Editor wiring. Guarded so the module can also be imported by smoke tests
// under Node, where there is no document.

if (typeof document !== 'undefined') {
  const state = createDefaultState();
  const canvas = document.getElementById('poster');
  const ctx = canvas.getContext('2d');
  const els = {
    title: document.getElementById('titleInput'),
    tagline: document.getElementById('taglineInput'),
    badge: document.getElementById('badgeToggle'),
    scene: document.getElementById('sceneSelect'),
    strip: document.getElementById('panelStrip'),
    zoom: document.getElementById('zoomRange'),
    x: document.getElementById('xRange'),
    y: document.getElementById('yRange'),
    zoomVal: document.getElementById('zoomVal'),
    xVal: document.getElementById('xVal'),
    yVal: document.getElementById('yVal'),
    file: document.getElementById('photoFile'),
  };

  for (const scene of SCENES) {
    const opt = document.createElement('option');
    opt.value = scene.id;
    opt.textContent = `Scene — ${scene.name}`;
    els.scene.appendChild(opt);
  }
  const photoOpt = document.createElement('option');
  photoOpt.value = '__photo';
  photoOpt.textContent = 'My photo (upload below)';
  els.scene.appendChild(photoOpt);

  const stripButtons = state.panels.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-thumb';
    b.textContent = i === 0 ? 'Hero' : `P${i + 1}`;
    b.addEventListener('click', () => selectPanel(i));
    els.strip.appendChild(b);
    return b;
  });

  function currentSize() { return SIZES[state.size]; }

  function render() {
    const [w, h] = currentSize();
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    renderPoster(ctx, w, h, state, { showSelection: true });
  }

  function syncPanelControls() {
    const panel = state.panels[state.selected];
    els.scene.value = panel.usePhoto ? '__photo' : panel.scene;
    els.zoom.value = String(panel.zoom);
    els.x.value = String(panel.x);
    els.y.value = String(panel.y);
    els.zoomVal.textContent = `${panel.zoom.toFixed(2)}×`;
    els.xVal.textContent = String(panel.x);
    els.yVal.textContent = String(panel.y);
    stripButtons.forEach((b, i) => b.classList.toggle('is-active', i === state.selected));
  }

  function selectPanel(i) {
    state.selected = i;
    syncPanelControls();
    render();
  }

  document.querySelectorAll('input[name="size"]').forEach((radio) => {
    radio.addEventListener('change', () => { state.size = radio.value; render(); });
  });
  document.querySelectorAll('.style-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.style = btn.dataset.style;
      document.querySelectorAll('.style-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      render();
    });
  });
  els.title.addEventListener('input', () => { state.title = els.title.value; render(); });
  els.tagline.addEventListener('input', () => { state.tagline = els.tagline.value; render(); });
  els.badge.addEventListener('change', () => { state.badge = els.badge.checked; render(); });

  els.scene.addEventListener('change', () => {
    const panel = state.panels[state.selected];
    if (els.scene.value === '__photo') {
      if (panel.photo) { panel.usePhoto = true; render(); }
      else els.file.click();
    } else {
      panel.scene = els.scene.value;
      panel.usePhoto = false;
      render();
    }
  });
  document.getElementById('uploadBtn').addEventListener('click', () => els.file.click());
  els.file.addEventListener('change', () => {
    const file = els.file.files && els.file.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const panel = state.panels[state.selected];
      panel.photo = img;
      panel.usePhoto = true;
      syncPanelControls();
      render();
    };
    img.src = url;
    els.file.value = '';
  });
  document.getElementById('fillAllBtn').addEventListener('click', () => {
    const src = state.panels[state.selected];
    if (!src.photo) { els.file.click(); return; }
    for (const panel of state.panels) { panel.photo = src.photo; panel.usePhoto = true; }
    syncPanelControls();
    render();
  });

  const bindSlider = (el, key, fmt) => {
    el.addEventListener('input', () => {
      const panel = state.panels[state.selected];
      panel[key] = Number(el.value);
      fmt(panel[key]);
      render();
    });
  };
  bindSlider(els.zoom, 'zoom', (v) => { els.zoomVal.textContent = `${v.toFixed(2)}×`; });
  bindSlider(els.x, 'x', (v) => { els.xVal.textContent = String(v); });
  bindSlider(els.y, 'y', (v) => { els.yVal.textContent = String(v); });

  document.getElementById('resetPanelBtn').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.zoom = 1; panel.x = 0; panel.y = 0;
    syncPanelControls();
    render();
  });

  // Clicking a panel selects it; dragging on it pans its artwork, which is
  // quicker than the sliders for rough framing (the sliders then fine-tune).
  let drag = null;
  const canvasPoint = (ev) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - box.left) * (canvas.width / box.width),
      y: (ev.clientY - box.top) * (canvas.height / box.height),
    };
  };
  canvas.addEventListener('pointerdown', (ev) => {
    const p = canvasPoint(ev);
    const rects = panelLayout(canvas.width, canvas.height);
    const hit = rects.findIndex((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
    if (hit < 0) return;
    selectPanel(hit);
    const panel = state.panels[hit];
    drag = { rect: rects[hit], startX: p.x, startY: p.y, x: panel.x, y: panel.y };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = canvasPoint(ev);
    const panel = state.panels[state.selected];
    const clamp = (v) => Math.max(-100, Math.min(100, Math.round(v)));
    panel.x = clamp(drag.x + ((p.x - drag.startX) / drag.rect.w) * 200);
    panel.y = clamp(drag.y + ((p.y - drag.startY) / drag.rect.h) * 200);
    syncPanelControls();
    render();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  document.getElementById('exportBtn').addEventListener('click', () => {
    const [w, h] = currentSize();
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    renderPoster(off.getContext('2d'), w, h, state, { showSelection: false });
    off.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `coverforge-${state.size}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  });

  syncPanelControls();
  render();
}
