import * as THREE from 'three';

export function createMasonryTexture(baseRgb, mortarRgb, repeatX = 4, repeatY = 4) {
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
      const jitter = Math.floor((Math.sin(r * 19 + c * 37) * 0.5 + 0.5) * 22) - 11;
      const cr = Math.min(255, Math.max(0, baseRgb[0] + jitter));
      const cg = Math.min(255, Math.max(0, baseRgb[1] + jitter));
      const cb = Math.min(255, Math.max(0, baseRgb[2] + jitter));
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillRect(c * cw + shift + 2.5, r * rh + 2.5, cw - 5, rh - 5);

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
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(Math.abs(x) * 512, Math.abs(y) * 512, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

export function createWoodGrainTexture(baseRgb, repeatX = 2, repeatY = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = `rgb(${baseRgb[0]},${baseRgb[1]},${baseRgb[2]})`;
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 3) {
    const wave = Math.sin(y * 0.045) * 14 + Math.cos(y * 0.13) * 6;
    ctx.strokeStyle = y % 6 === 0 ? 'rgba(20,10,5,0.16)' : 'rgba(255,220,180,0.05)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + wave, 340, y - wave, 512, y);
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
      const isAlt = ((x / tile) + (y / tile)) % 2 === 0;
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
    ctx.fillStyle = (y / 32) % 2 === 0 ? '#e9e1d6' : '#cfc5b7';
    ctx.fillRect(cx0, y, 156, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  return tex;
}

export function createScenicPersonStainedGlass(variant = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const Wc = canvas.width;
  const Hc = canvas.height;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, Hc * 0.62);
  if (variant % 3 === 0) {
    skyGrad.addColorStop(0, '#1e3a8a');
    skyGrad.addColorStop(0.55, '#38bdf8');
    skyGrad.addColorStop(1, '#fde68a');
  } else if (variant % 3 === 1) {
    skyGrad.addColorStop(0, '#1d4ed8');
    skyGrad.addColorStop(0.5, '#60a5fa');
    skyGrad.addColorStop(1, '#fed7aa');
  } else {
    skyGrad.addColorStop(0, '#312e81');
    skyGrad.addColorStop(0.5, '#818cf8');
    skyGrad.addColorStop(1, '#fecdd3');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, Wc, Hc);

  const sunX = variant % 2 === 0 ? Wc * 0.72 : Wc * 0.28;
  const sunY = Hc * 0.24;
  ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 38, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.moveTo(0, Hc * 0.45);
  ctx.lineTo(Wc * 0.28, Hc * 0.34);
  ctx.lineTo(Wc * 0.62, Hc * 0.43);
  ctx.lineTo(Wc, Hc * 0.35);
  ctx.lineTo(Wc, Hc * 0.65);
  ctx.lineTo(0, Hc * 0.65);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#047857';
  ctx.beginPath();
  ctx.moveTo(0, Hc * 0.56);
  ctx.quadraticCurveTo(Wc * 0.35, Hc * 0.48, Wc * 0.65, Hc * 0.55);
  ctx.quadraticCurveTo(Wc * 0.85, Hc * 0.59, Wc, Hc * 0.53);
  ctx.lineTo(Wc, Hc);
  ctx.lineTo(0, Hc);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, Hc * 0.62, Wc, Hc * 0.38);

  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(Wc * 0.34, Hc);
  ctx.lineTo(Wc * 0.66, Hc);
  ctx.lineTo(Wc * 0.54, Hc * 0.62);
  ctx.lineTo(Wc * 0.46, Hc * 0.62);
  ctx.closePath();
  ctx.fill();

  const px = Wc * 0.48;
  const py = Hc * 0.68;

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(px, py - 165, 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = variant % 2 === 0 ? '#b91c1c' : '#1d4ed8';
  ctx.beginPath();
  ctx.moveTo(px - 42, py + 75);
  ctx.lineTo(px - 26, py - 115);
  ctx.lineTo(px + 26, py - 115);
  ctx.lineTo(px + 46, py + 75);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = variant % 2 === 0 ? '#f59e0b' : '#10b981';
  ctx.beginPath();
  ctx.moveTo(px - 34, py - 115);
  ctx.quadraticCurveTo(px, py - 70, px + 34, py - 115);
  ctx.lineTo(px + 24, py - 125);
  ctx.lineTo(px - 24, py - 125);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(px, py - 152, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(px, py - 156, 21, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();

  const px2 = variant % 2 === 0 ? Wc * 0.72 : Wc * 0.24;
  const py2 = Hc * 0.73;
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.moveTo(px2 - 22, py2 + 45);
  ctx.lineTo(px2 - 14, py2 - 65);
  ctx.lineTo(px2 + 14, py2 - 65);
  ctx.lineTo(px2 + 24, py2 + 45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(px2, py2 - 86, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(25, 20, 18, 0.52)';
  ctx.lineWidth = 1.6;
  [64, 128, 192, 256, 320].forEach((vx) => {
    ctx.beginPath();
    ctx.moveTo(vx, 0);
    ctx.lineTo(vx, Hc);
    ctx.stroke();
  });

  for (let hy = 64; hy < Hc; hy += 64) {
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, hy);
    for (let x = 0; x <= Wc; x += 48) {
      ctx.lineTo(x, hy + Math.sin((x + variant * 37) * 0.05) * 10);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCathedralMaterials() {
  const wallStoneTex = createMasonryTexture([108, 92, 78], [56, 47, 40], 5, 3);
  const darkStoneTex = createMasonryTexture([74, 63, 54], [40, 34, 29], 3, 4);
  const woodTex = createWoodGrainTexture([96, 56, 30], 2, 2);
  const darkWoodTex = createWoodGrainTexture([62, 36, 20], 2, 2);
  const floorTex = createMarbleFloorTexture();
  const scenicTextures = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => createScenicPersonStainedGlass(i));

  return {
    darkStoneTex,
    floorTex,
    scenicTextures,
    wallMat: new THREE.MeshStandardMaterial({ map: wallStoneTex, roughness: 0.84, metalness: 0.05 }),
    archStoneMat: new THREE.MeshStandardMaterial({ map: darkStoneTex, roughness: 0.8, metalness: 0.06 }),
    woodMat: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.58, metalness: 0.08 }),
    darkWoodMat: new THREE.MeshStandardMaterial({ map: darkWoodTex, roughness: 0.54, metalness: 0.1 }),
    goldMat: new THREE.MeshStandardMaterial({ color: 0xdcb13c, metalness: 0.72, roughness: 0.25 }),
  };
}