import * as THREE from 'three';

// =============================================
// Cathedral texture helpers
// =============================================

export function createMasonryTexture(
  baseRgb,
  mortarRgb,
  repeatX = 4,
  repeatY = 4
) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = mortarRgb;
  ctx.fillRect(0, 0, 512, 512);

  const rows = 12;
  const cols = 6;
  const rh = 512 / rows;
  const cw = 512 / cols;

  for (let r = 0; r < rows; r++) {
    const shift = (r % 2) * (cw * 0.5);

    for (let c = -1; c <= cols; c++) {
      const jitter =
        Math.floor(
          (Math.sin(r * 19 + c * 37) * 0.5 + 0.5) * 22
        ) - 11;

      const cr = Math.min(255, Math.max(0, baseRgb[0] + jitter));
      const cg = Math.min(255, Math.max(0, baseRgb[1] + jitter));
      const cb = Math.min(255, Math.max(0, baseRgb[2] + jitter));

      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillRect(
        c * cw + shift + 2.5,
        r * rh + 2.5,
        cw - 5,
        rh - 5
      );

      ctx.strokeStyle = 'rgba(255,245,230,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c * cw + shift + 6, r * rh + rh * 0.4);
      ctx.lineTo(c * cw + shift + cw - 6, r * rh + rh * 0.55);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 4500; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 43758.5453) % 1;

    ctx.fillStyle =
      i % 2 === 0
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(0,0,0,0.05)';

    ctx.fillRect(
      Math.abs(x) * 512,
      Math.abs(y) * 512,
      2,
      2
    );
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);

  return tex;
}

export function createWoodGrainTexture(
  baseRgb,
  repeatX = 2,
  repeatY = 2
) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = `rgb(${baseRgb[0]},${baseRgb[1]},${baseRgb[2]})`;
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 3) {
    const wave =
      Math.sin(y * 0.045) * 14 +
      Math.cos(y * 0.13) * 6;

    ctx.strokeStyle =
      y % 6 === 0
        ? 'rgba(20,10,5,0.16)'
        : 'rgba(255,220,180,0.05)';

    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      170, y + wave,
      340, y - wave,
      512, y
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);

  return tex;
}

export function createMarbleFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#38302a';
  ctx.fillRect(0, 0, 512, 1024);

  const tile = 32;

  for (let y = 0; y < 1024; y += tile) {
    for (let x = 0; x < 512; x += tile) {
      const isAlt =
        ((x / tile) + (y / tile)) % 2 === 0;

      ctx.fillStyle = isAlt ? '#4e433a' : '#3f362e';
      ctx.fillRect(x, y, tile, tile);

      ctx.strokeStyle = 'rgba(15,12,10,0.4)';
      ctx.strokeRect(x, y, tile, tile);
    }
  }

  const cx0 = 256 - 78;

  ctx.fillStyle = '#dfd6ca';
  ctx.fillRect(cx0, 0, 156, 1024);

  for (let y = 0; y < 1024; y += 32) {
    ctx.fillStyle =
      (y / 32) % 2 === 0
        ? '#e9e1d6'
        : '#cfc5b7';

    ctx.fillRect(cx0, y, 156, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);

  return tex;
}

// =============================================
// Stained glass drawing utilities
// =============================================

function seeded(seed) {
  let s = (seed >>> 0) || 1;

  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function polygon(ctx, points, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }

  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawLeadPath(ctx, draw, width = 5) {
  ctx.save();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = 'rgba(28,24,35,0.96)';
  ctx.lineWidth = width + 2.5;
  ctx.beginPath();
  draw();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(202,190,166,0.72)';
  ctx.lineWidth = Math.max(1, width * 0.34);
  ctx.beginPath();
  draw();
  ctx.stroke();

  ctx.restore();
}

function drawGlassPiece(ctx, points, color, shade = 0) {
  ctx.save();

  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const grad = ctx.createLinearGradient(
    minX, minY, maxX, maxY
  );

  grad.addColorStop(
    0,
    shade >= 0
      ? 'rgba(255,255,255,0.34)'
      : 'rgba(0,0,0,0.16)'
  );

  grad.addColorStop(0.48, color);

  grad.addColorStop(
    1,
    shade >= 0
      ? 'rgba(0,0,0,0.17)'
      : 'rgba(255,255,255,0.18)'
  );

  polygon(
    ctx,
    points,
    grad,
    'rgba(30,25,36,0.92)',
    4
  );

  // Hand-blown glass streaks
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle =
    shade >= 0 ? '#fff4d6' : '#1b244b';

  ctx.lineWidth = 2;
  ctx.beginPath();

  ctx.moveTo(
    minX + (maxX - minX) * 0.22,
    minY + 4
  );

  ctx.quadraticCurveTo(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    maxX - 5,
    maxY - 4
  );

  ctx.stroke();
  ctx.restore();
}

// =============================================
// Gothic rose window
// =============================================

function drawRosette(ctx, cx, cy, radius, variant, rand) {
  const colors = [
    '#e9b84d',
    '#d74b39',
    '#2769b5',
    '#35a6a0',
    '#f4df9b',
    '#7a4e9b'
  ];

  ctx.save();
  ctx.translate(cx, cy);

  [radius, radius * 0.91, radius * 0.72, radius * 0.22]
    .forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);

      ctx.strokeStyle =
        i === 0 ? '#171923' : '#c5a66a';

      ctx.lineWidth = i === 0 ? 13 : 5;
      ctx.stroke();
    });

  const petals = 12;

  for (let i = 0; i < petals; i++) {
    const a =
      (i / petals) * Math.PI * 2 +
      variant * 0.07;

    ctx.save();
    ctx.rotate(a);

    const col = colors[(i + variant) % colors.length];

    drawGlassPiece(
      ctx,
      [
        [-radius * .17, -radius * .25],
        [-radius * .12, -radius * .69],
        [0, -radius * .82],
        [radius * .12, -radius * .69],
        [radius * .17, -radius * .25],
        [0, -radius * .13]
      ],
      col,
      rand() - .5
    );

    ctx.restore();
  }

  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI * 2 / 24;

    ctx.beginPath();

    ctx.moveTo(
      Math.cos(a) * radius * .2,
      Math.sin(a) * radius * .2
    );

    ctx.lineTo(
      Math.cos(a) * radius * .88,
      Math.sin(a) * radius * .88
    );

    ctx.strokeStyle = '#282431';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
      Math.cos(a) * radius * .79,
      Math.sin(a) * radius * .79,
      radius * .035,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = colors[(i + 2) % colors.length];
    ctx.fill();

    ctx.strokeStyle = '#211e2b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * .2, 0, Math.PI * 2);
  ctx.fillStyle = '#25223a';
  ctx.fill();

  ctx.strokeStyle = '#d7b86e';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();
}

// =============================================
// Landscape, sky and architecture
// =============================================

function drawArchitectureAndLandscape(ctx, W, H, variant, rand) {
  const skyColors = [
    '#174f91',
    '#267db0',
    '#5aa8c1',
    '#b9d6d2',
    '#f2c66c',
    '#e78b58'
  ];

  // Sky glass pieces
  for (let row = 0; row < 7; row++) {
    const y0 = 300 + row * 118;

    for (let col = 0; col < 5; col++) {
      const x0 = col * (W / 5);
      const x1 = (col + 1) * (W / 5);
      const drift = (rand() - .5) * 42;

      drawGlassPiece(
        ctx,
        [
          [x0, y0],
          [x1, y0 + drift],
          [x1, y0 + 118],
          [x0, y0 + 118 - drift]
        ],
        skyColors[(row + col + variant) % skyColors.length],
        rand() - .5
      );
    }
  }

  // Sacred sunlight
  const sx = variant % 2 ? W * .32 : W * .68;
  const sy = 560;

  const glow = ctx.createRadialGradient(
    sx, sy, 12,
    sx, sy, 250
  );

  glow.addColorStop(0, 'rgba(255,246,190,0.52)');
  glow.addColorStop(1, 'rgba(255,232,150,0)');

  ctx.fillStyle = glow;
  ctx.fillRect(sx - 250, sy - 250, 500, 500);

  for (let i = 0; i < 13; i++) {
    const a = i * Math.PI * 2 / 13;

    ctx.beginPath();

    ctx.moveTo(
      sx + Math.cos(a) * 35,
      sy + Math.sin(a) * 35
    );

    ctx.lineTo(
      sx + Math.cos(a) * 225,
      sy + Math.sin(a) * 225
    );

    ctx.strokeStyle = 'rgba(255,239,171,0.35)';
    ctx.lineWidth = 8;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(sx, sy, 48, 0, Math.PI * 2);
  ctx.fillStyle = '#f7d66f';
  ctx.fill();

  ctx.strokeStyle = '#8d5a35';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Mountains
  const mountainSets = [
    { y: 980, color: '#315b78' },
    { y: 1080, color: '#477b79' },
    { y: 1190, color: '#39704f' }
  ];

  mountainSets.forEach((m, idx) => {
    const pts = [
      [0, m.y + 110],
      [0, m.y + 30]
    ];

    for (let x = 0; x <= W; x += W / 6) {
      pts.push([
        x,
        m.y + (rand() - .5) * 115 + idx * 18
      ]);
    }

    pts.push([W, m.y + 140], [0, m.y + 140]);

    drawGlassPiece(ctx, pts, m.color, rand() - .5);
  });

  // Architectural stairs
  for (let i = 0; i < 8; i++) {
    const y = 1350 + i * 65;
    const inset = i * 24;

    drawGlassPiece(
      ctx,
      [
        [inset, y],
        [W - inset, y],
        [W - inset - 8, y + 62],
        [inset + 8, y + 62]
      ],
      i % 2 ? '#71918c' : '#9bb3a4',
      rand() - .5
    );

    drawLeadPath(ctx, () => {
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
    }, 4);
  }

  // Floral ornaments
  for (let side = 0; side < 2; side++) {
    const x = side ? W - 92 : 92;

    for (let j = 0; j < 5; j++) {
      const y = 450 + j * 220;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((side ? 1 : -1) * .24);

      for (let k = 0; k < 5; k++) {
        ctx.save();
        ctx.rotate(k * Math.PI * 2 / 5);

        ctx.beginPath();
        ctx.ellipse(0, -27, 13, 30, 0, 0, Math.PI * 2);

        ctx.fillStyle = [
          '#e7c45e',
          '#cf5b43',
          '#4b9aa3'
        ][k % 3];

        ctx.fill();

        ctx.strokeStyle = '#282431';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#f5e3a0';
      ctx.fill();

      ctx.strokeStyle = '#282431';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }
  }
}

// =============================================
// Human figures
// =============================================

function drawPerson(ctx, cx, baseY, scale, variant, secondary = false) {
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(scale, scale);

  const robe = secondary
    ? (variant % 2 ? '#1d6c83' : '#713b83')
    : (variant % 2 ? '#245b9b' : '#9e2936');

  const robeLight = secondary ? '#74b9b3' : '#e0a34c';

  // Halo
  const haloY = -520;

  const haloGlow = ctx.createRadialGradient(
    0, haloY, 20,
    0, haloY, 118
  );

  haloGlow.addColorStop(0, 'rgba(255,244,181,0.45)');
  haloGlow.addColorStop(1, 'rgba(255,220,120,0)');

  ctx.fillStyle = haloGlow;
  ctx.beginPath();
  ctx.arc(0, haloY, 118, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, haloY, 78, 0, Math.PI * 2);
  ctx.strokeStyle = '#e9bd58';
  ctx.lineWidth = 13;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, haloY, 91, 0, Math.PI * 2);
  ctx.strokeStyle = '#302536';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Neck
  ctx.fillStyle = '#e9b98e';
  ctx.fillRect(-24, -475, 48, 62);

  // Face
  const face = ctx.createRadialGradient(
    -20, -560, 8,
    0, -540, 78
  );

  face.addColorStop(0, '#ffe2b9');
  face.addColorStop(1, '#bd805d');

  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.ellipse(0, -535, 61, 78, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#392b31';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Hair
  ctx.fillStyle = secondary ? '#5b382b' : '#4a302a';

  ctx.beginPath();
  ctx.moveTo(-62, -557);
  ctx.quadraticCurveTo(-70, -635, 0, -625);
  ctx.quadraticCurveTo(70, -635, 63, -552);
  ctx.quadraticCurveTo(40, -585, 0, -580);
  ctx.quadraticCurveTo(-36, -580, -62, -557);
  ctx.fill();

  ctx.strokeStyle = '#2a222b';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Face details
  ctx.strokeStyle = '#583b36';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-25, -532);
  ctx.quadraticCurveTo(-15, -540, -7, -532);
  ctx.moveTo(8, -532);
  ctx.quadraticCurveTo(18, -540, 27, -532);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -520);
  ctx.lineTo(-5, -500);
  ctx.lineTo(5, -497);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-12, -478);
  ctx.quadraticCurveTo(0, -470, 13, -478);
  ctx.stroke();

  // Robe
  const robeGrad = ctx.createLinearGradient(
    -100, -450, 100, 0
  );

  robeGrad.addColorStop(0, robeLight);
  robeGrad.addColorStop(.34, robe);
  robeGrad.addColorStop(1, '#252d50');

  ctx.fillStyle = robeGrad;

  ctx.beginPath();
  ctx.moveTo(-35, -450);
  ctx.quadraticCurveTo(-120, -430, -126, -330);
  ctx.lineTo(-165, -15);
  ctx.quadraticCurveTo(0, 28, 165, -15);
  ctx.lineTo(126, -330);
  ctx.quadraticCurveTo(110, -430, 35, -450);
  ctx.closePath();

  ctx.fill();
  ctx.strokeStyle = '#292432';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Robe panels
  polygon(
    ctx,
    [
      [-36, -430],
      [-8, -408],
      [-35, -30],
      [-104, -18],
      [-72, -325]
    ],
    'rgba(255,222,154,0.22)',
    '#302638',
    4
  );

  polygon(
    ctx,
    [
      [35, -430],
      [8, -408],
      [42, -28],
      [108, -18],
      [72, -325]
    ],
    'rgba(8,20,48,0.28)',
    '#302638',
    4
  );

  // Fabric folds
  for (let i = 0; i < 9; i++) {
    const x = -92 + i * 23;

    ctx.beginPath();
    ctx.moveTo(x, -395 + Math.abs(i - 4) * 5);
    ctx.quadraticCurveTo(
      x - 18,
      -220,
      x + (i % 2 ? 12 : -8),
      -28
    );

    ctx.strokeStyle =
      i % 3 === 0
        ? 'rgba(255,230,166,0.66)'
        : 'rgba(22,24,49,0.45)';

    ctx.lineWidth = i % 3 === 0 ? 7 : 5;
    ctx.stroke();
  }

  // Embroidered hem
  ctx.strokeStyle = '#e9c66d';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-145, -42);
  ctx.quadraticCurveTo(0, -12, 145, -42);
  ctx.stroke();

  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(i * 23, -42, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f7df9b';
    ctx.fill();
  }

  // Arms
  ctx.strokeStyle = robe;
  ctx.lineWidth = 42;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-92, -370);
  ctx.quadraticCurveTo(-48, -280, 4, -270);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(92, -370);
  ctx.quadraticCurveTo(58, -290, 18, -270);
  ctx.stroke();

  // Hands
  ctx.fillStyle = '#e8b58c';
  ctx.beginPath();
  ctx.ellipse(0, -266, 26, 35, -.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#573d39';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Gold staff
  ctx.strokeStyle = '#d9b85f';
  ctx.lineWidth = 9;

  ctx.beginPath();
  ctx.moveTo(105, -300);
  ctx.lineTo(125, -20);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(105, -310, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#f1d47d';
  ctx.fill();

  ctx.strokeStyle = '#4b3740';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();
}

// =============================================
// Gothic window frame
// =============================================

function drawGothicFrame(ctx, W, H) {
  ctx.save();
  ctx.lineJoin = 'round';

  const archPath = (inset = 0) => {
    ctx.beginPath();
    ctx.moveTo(inset, H);
    ctx.lineTo(inset, 450);
    ctx.quadraticCurveTo(inset, 210, W / 2, 92 + inset);
    ctx.quadraticCurveTo(W - inset, 210, W - inset, 450);
    ctx.lineTo(W - inset, H);
  };

  archPath(22);
  ctx.strokeStyle = '#171923';
  ctx.lineWidth = 26;
  ctx.stroke();

  archPath(48);
  ctx.strokeStyle = '#c3a66b';
  ctx.lineWidth = 7;
  ctx.stroke();

  archPath(65);
  ctx.strokeStyle = '#292433';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Vertical divisions
  [W * .25, W * .5, W * .75].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, 390);
    ctx.lineTo(x, H - 20);

    ctx.strokeStyle = '#211f2b';
    ctx.lineWidth = 13;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(220,194,135,.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  // Horizontal divisions
  for (let y = 480; y < H; y += 170) {
    ctx.beginPath();
    ctx.moveTo(45, y);
    ctx.lineTo(W - 45, y);

    ctx.strokeStyle = '#201e2a';
    ctx.lineWidth = 9;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(230,205,147,.75)';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let x = 70; x < W - 50; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 9, y);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x - 9, y);
      ctx.closePath();

      ctx.fillStyle = '#d5b56b';
      ctx.fill();
    }
  }

  // Side tracery
  for (let side = 0; side < 2; side++) {
    const x = side ? W - 78 : 78;

    for (let y = 470; y < H - 80; y += 145) {
      ctx.beginPath();
      ctx.moveTo(x, y - 38);
      ctx.quadraticCurveTo(x + 36, y - 10, x, y + 38);
      ctx.quadraticCurveTo(x - 36, y - 10, x, y - 38);

      ctx.strokeStyle = '#282431';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#d8b65e';
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

// =============================================
// Lead network
// =============================================

function drawStainedGlassLeadNetwork(ctx, W, H, variant, rand) {
  ctx.save();
  ctx.lineCap = 'round';

  for (let y = 300; y < H - 40; y += 82) {
    ctx.beginPath();
    ctx.moveTo(48, y);

    for (let x = 48; x <= W - 48; x += 46) {
      ctx.lineTo(x, y + (rand() - .5) * 18);
    }

    ctx.strokeStyle = 'rgba(25,22,34,.88)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }

  for (let x = 55; x < W - 45; x += 58) {
    ctx.beginPath();
    ctx.moveTo(x, 320);

    for (let y = 360; y < H - 35; y += 65) {
      ctx.lineTo(x + (rand() - .5) * 18, y);
    }

    ctx.strokeStyle = 'rgba(25,22,34,.82)';
    ctx.lineWidth = 2.8;
    ctx.stroke();
  }

  // Jewel nodes
  for (let y = 390; y < H - 80; y += 164) {
    for (let x = 72; x < W - 60; x += 116) {
      ctx.beginPath();
      ctx.arc(x + (variant % 3) * 4, y, 5, 0, Math.PI * 2);

      ctx.fillStyle = '#e9c56e';
      ctx.fill();

      ctx.strokeStyle = '#282431';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.restore();
}

// =============================================
// Main stained glass texture
// =============================================

export function createScenicPersonStainedGlass(
  variant = 0,
  options = {}
) {
  const width = Math.max(512, options.width || 1024);
  const height = Math.max(1024, options.height || 2048);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  const W = width;
  const H = height;

  const rand = seeded(0x51A7 + variant * 7919);

  // Background
  ctx.fillStyle = '#171b2b';
  ctx.fillRect(0, 0, W, H);

  const bg = ctx.createLinearGradient(0, 0, W, H);

  const palettes = [
    ['#102e61', '#2c83a8', '#f3c76c'],
    ['#19265d', '#658bc4', '#f4d2a1'],
    ['#34285f', '#6d79ae', '#f3c2bd']
  ];

  const p = palettes[variant % palettes.length];

  bg.addColorStop(0, p[0]);
  bg.addColorStop(.56, p[1]);
  bg.addColorStop(1, p[2]);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Rose window
  drawRosette(ctx, W / 2, 245, 190, variant, rand);

  // Gothic canopy
  ctx.beginPath();
  ctx.moveTo(90, 430);
  ctx.quadraticCurveTo(W / 2, 260, W - 90, 430);
  ctx.lineTo(W - 135, 510);
  ctx.quadraticCurveTo(W / 2, 370, 135, 510);
  ctx.closePath();

  const canopy = ctx.createLinearGradient(0, 300, 0, 520);

  canopy.addColorStop(0, '#e9c56e');
  canopy.addColorStop(.5, '#3b6f9b');
  canopy.addColorStop(1, '#b9483e');

  ctx.fillStyle = canopy;
  ctx.fill();

  ctx.strokeStyle = '#211f2c';
  ctx.lineWidth = 9;
  ctx.stroke();

  // Upper jewel panes
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const x = 100 + col * (W - 200) / 8;
      const y = 400 + row * 38;
      const r = 16 + rand() * 5;

      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();

      const c = [
        '#e8bd56',
        '#b9443e',
        '#2c80ad',
        '#4c9d91'
      ][Math.floor(rand() * 4)];

      ctx.fillStyle = c;
      ctx.fill();

      ctx.strokeStyle = '#252231';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  // Landscape
  drawArchitectureAndLandscape(ctx, W, H, variant, rand);

  // Figures
  drawPerson(ctx, W * .36, H * .79, .88, variant, false);
  drawPerson(ctx, W * .69, H * .81, .62, variant, true);

  // Decorative borders
  const borderColors = [
    '#d9ad4f',
    '#b7473e',
    '#286fa5',
    '#41958d',
    '#e7dca8'
  ];

  for (let side = 0; side < 2; side++) {
    const x = side ? W - 34 : 34;

    for (let y = 430; y < H - 30; y += 48) {
      const c = borderColors[
        Math.floor(rand() * borderColors.length)
      ];

      drawGlassPiece(
        ctx,
        [
          [x - 16, y],
          [x + 16, y + 8],
          [x + 16, y + 43],
          [x - 16, y + 35]
        ],
        c,
        rand() - .5
      );
    }
  }

  // Lead lines and frame
  drawStainedGlassLeadNetwork(ctx, W, H, variant, rand);
  drawGothicFrame(ctx, W, H);

  // Glass glints
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < 170; i++) {
    const x = 55 + rand() * (W - 110);
    const y = 330 + rand() * (H - 370);

    ctx.fillStyle =
      `rgba(255,244,205,${0.08 + rand() * .18})`;

    ctx.beginPath();
    ctx.arc(x, y, 1 + rand() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Three.js texture
  const tex = new THREE.CanvasTexture(canvas);

  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  return tex;
}

// =============================================
// External PNG / WebP loader
// =============================================

export function loadStainedGlassTexture(url, options = {}) {
  const loader = options.loader || new THREE.TextureLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,

      texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        texture.anisotropy = options.anisotropy ?? 8;
        texture.generateMipmaps = true;

        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        resolve(texture);
      },

      undefined,

      error => reject(
        new Error(
          `Failed to load stained-glass texture "${url}": ${error?.message || error}`
        )
      )
    );
  });
}

// =============================================
// Cathedral materials
// =============================================

export function createCathedralMaterials() {
  const wallStoneTex = createMasonryTexture(
    [108, 92, 78],
    [56, 47, 40],
    5,
    3
  );

  const darkStoneTex = createMasonryTexture(
    [74, 63, 54],
    [40, 34, 29],
    3,
    4
  );

  const woodTex = createWoodGrainTexture(
    [96, 56, 30],
    2,
    2
  );

  const darkWoodTex = createWoodGrainTexture(
    [62, 36, 20],
    2,
    2
  );

  const floorTex = createMarbleFloorTexture();

  const scenicTextures = [0, 1, 2, 3, 4, 5, 6, 7].map(i =>
    createScenicPersonStainedGlass(
      i,
      {
        width: 1024,
        height: 2048
      }
    )
  );

  return {
    darkStoneTex,
    floorTex,
    scenicTextures,

    wallMat: new THREE.MeshStandardMaterial({
      map: wallStoneTex,
      roughness: 0.84,
      metalness: 0.05
    }),

    archStoneMat: new THREE.MeshStandardMaterial({
      map: darkStoneTex,
      roughness: 0.8,
      metalness: 0.06
    }),

    woodMat: new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.58,
      metalness: 0.08
    }),

    darkWoodMat: new THREE.MeshStandardMaterial({
      map: darkWoodTex,
      roughness: 0.54,
      metalness: 0.1
    }),

    goldMat: new THREE.MeshStandardMaterial({
      color: 0xdcb13c,
      metalness: 0.72,
      roughness: 0.25
    })
  };
}