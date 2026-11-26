import * as THREE from 'three';

// ============================================================
// Cute Cathedral Avatar System
// Three.js r160
// createAvatar('boy') / createAvatar('girl')
// Front direction: +Z
// ============================================================

const TAU = Math.PI * 2;
const EGG_RX = 0.33;
const EGG_RY = 0.39;
const EGG_RZ = 0.35;
const HIP = 0.43;

// ------------------------------------------------------------
// Egg-shaped head geometry
// ------------------------------------------------------------

function getEggPoint(theta, phi, scale = 1) {
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const xTaper = cosPhi < 0 ? 1 + cosPhi * 0.22 : 1 + cosPhi * 0.04;
  const zTaper = cosPhi < 0 ? 1 + cosPhi * 0.12 : 1;

  return new THREE.Vector3(
    EGG_RX * xTaper * sinPhi * Math.sin(theta) * scale,
    EGG_RY * cosPhi * scale,
    EGG_RZ * zTaper * sinPhi * Math.cos(theta) * scale
  );
}

function createEggPatchGeometry(
  thetaCenter,
  thetaSpan,
  phiStart,
  phiLength,
  scale = 1,
  thetaSegs = 36,
  phiSegs = 26
) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let iy = 0; iy <= phiSegs; iy++) {
    const v = iy / phiSegs;
    const phi = phiStart + v * phiLength;

    for (let ix = 0; ix <= thetaSegs; ix++) {
      const u = ix / thetaSegs;
      const theta = thetaCenter - thetaSpan / 2 + u * thetaSpan;
      const p = getEggPoint(theta, phi, scale);

      positions.push(p.x, p.y, p.z);
      uvs.push(u, 1 - v);
    }
  }

  const stride = thetaSegs + 1;

  for (let iy = 0; iy < phiSegs; iy++) {
    for (let ix = 0; ix < thetaSegs; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;

      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

// ------------------------------------------------------------
// Canvas textures
// ------------------------------------------------------------

function makeCanvasTexture(draw, size = 512, repeat = [1, 1]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;

  const ctx = canvas.getContext('2d');
  draw(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;

  return tex;
}

function addNoise(ctx, size, amount = 0.025, seed = 23) {
  let n = seed;

  const rand = () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };

  const img = ctx.getImageData(0, 0, size, size);

  for (let i = 0; i < img.data.length; i += 4) {
    const v = (rand() - 0.5) * amount * 255;

    img.data[i] = Math.max(0, Math.min(255, img.data[i] + v));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + v));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + v));
  }

  ctx.putImageData(img, 0, 0);
}

function createSkinTexture() {
  return makeCanvasTexture((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);

    g.addColorStop(0, '#ffe5ce');
    g.addColorStop(0.42, '#ffd8bd');
    g.addColorStop(0.76, '#ffc6a8');
    g.addColorStop(1, '#f5b18e');

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    // Cheek blush
    for (const x of [s * 0.22, s * 0.78]) {
      const blush = ctx.createRadialGradient(
        x, s * 0.57, 2,
        x, s * 0.57, s * 0.18
      );

      blush.addColorStop(0, 'rgba(245,116,105,.25)');
      blush.addColorStop(1, 'rgba(245,116,105,0)');

      ctx.fillStyle = blush;
      ctx.fillRect(0, 0, s, s);
    }

    // Soft face highlight
    const glow = ctx.createRadialGradient(
      s * 0.48, s * 0.24, 2,
      s * 0.48, s * 0.24, s * 0.4
    );

    glow.addColorStop(0, 'rgba(255,255,255,.2)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, s, s);

    addNoise(ctx, s, 0.012, 7);
  }, 512);
}

function createFabricTexture(base, detail = '#ffffff', kind = 'plain') {
  return makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);

    if (kind === 'check') {
      const cell = s / 8;

      ctx.fillStyle = 'rgba(37,76,36,.28)';
      for (let i = 0; i < 8; i += 2) {
        ctx.fillRect(i * cell, 0, cell, s);
      }

      ctx.fillStyle = 'rgba(196,42,39,.30)';
      for (let i = 1; i < 8; i += 3) {
        ctx.fillRect(0, i * cell, s, cell * 0.38);
      }

      ctx.fillStyle = 'rgba(245,215,90,.42)';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(i * cell + cell * 0.46, 0, cell * 0.08, s);
      }

      ctx.fillStyle = 'rgba(255,255,255,.17)';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(0, i * cell + cell * 0.65, s, cell * 0.06);
      }
    } else if (kind === 'knit') {
      ctx.strokeStyle = 'rgba(255,255,255,.15)';
      ctx.lineWidth = 3;

      for (let x = 0; x < s; x += 9) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(80,40,30,.07)';

      for (let y = 0; y < s; y += 7) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }
    } else if (kind === 'lace') {
      ctx.strokeStyle = detail;
      ctx.lineWidth = 3;

      for (let x = 8; x < s; x += 24) {
        for (let y = 8; y < s; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, TAU);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x + 12, y + 12, 7, 0, TAU);
          ctx.stroke();
        }
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.13)';
      ctx.lineWidth = 2;

      for (let y = 0; y < s; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(60,30,20,.05)';

      for (let x = 0; x < s; x += 11) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }
    }

    addNoise(ctx, s, 0.018, 29);
  }, 512, kind === 'check' ? [2, 2] : [1, 1]);
}

function createHairTexture(base, highlight) {
  return makeCanvasTexture((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);

    g.addColorStop(0, highlight);
    g.addColorStop(0.28, base);
    g.addColorStop(0.65, base);
    g.addColorStop(1, '#2c2019');

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    for (let i = 0; i < 110; i++) {
      const x = (i * 37) % s;
      const y = (i * 83) % s;

      ctx.strokeStyle = i % 3
        ? 'rgba(255,205,130,.07)'
        : 'rgba(25,12,8,.10)';

      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 18, y + 15, x + 36, y + 50);
      ctx.stroke();
    }

    addNoise(ctx, s, 0.015, 41);
  }, 512);
}

// ------------------------------------------------------------
// Materials and mesh helpers
// ------------------------------------------------------------

function standardMat(color, roughness = 0.65, metalness = 0, map = null) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    map
  });
}

function basicMat(color) {
  return new THREE.MeshBasicMaterial({ color });
}

function addMesh(group, geometry, material, position, scale = null) {
  const mesh = new THREE.Mesh(geometry, material);

  if (position) mesh.position.copy(position);
  if (scale) mesh.scale.copy(scale);

  group.add(mesh);
  return mesh;
}

function sphere(group, material, position, scale, segments = 24) {
  return addMesh(
    group,
    new THREE.SphereGeometry(1, segments, Math.max(12, segments - 4)),
    material,
    position,
    scale
  );
}

function roundedBox(group, material, position, scale) {
  return addMesh(
    group,
    new THREE.BoxGeometry(scale.x, scale.y, scale.z),
    material,
    position,
    new THREE.Vector3(1, 1, 1)
  );
}

function addSmile(head, material, y, width = 0.05) {
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.052, width, 10, 24, Math.PI),
    material
  );

  smile.position.set(0, y, 0.345);
  smile.rotation.x = Math.PI;
  head.add(smile);

  sphere(head, material,
    new THREE.Vector3(-0.045, y + 0.001, 0.345),
    new THREE.Vector3(0.009, 0.009, 0.008), 8
  );

  sphere(head, material,
    new THREE.Vector3(0.045, y + 0.001, 0.345),
    new THREE.Vector3(0.009, 0.009, 0.008), 8
  );
}

// ------------------------------------------------------------
// Face
// ------------------------------------------------------------

function buildFace(head, skinMaterial, variant, eyes, eyeShines) {
  const face = new THREE.Mesh(
    createEggPatchGeometry(0, TAU, 0, Math.PI, 1, 48, 36),
    skinMaterial
  );

  head.add(face);

  const eyeWhite = standardMat(0xfffdf6, 0.32);
  const irisMat = standardMat(variant === 'girl' ? 0x76512e : 0x60452b, 0.3);
  const pupilMat = basicMat(0x241b14);
  const browMat = standardMat(variant === 'girl' ? 0x8a5a32 : 0x67402a, 0.75);
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xf58e8d,
    transparent: true,
    opacity: 0.23
  });
  const noseMat = standardMat(0xf69b79, 0.4);
  const smileMat = standardMat(0x65372d, 0.65);

  [-1, 1].forEach((side) => {
    const theta = side * 0.36;
    const eyeP = getEggPoint(theta, Math.PI * 0.535, 1.014);

    const eyeWhiteMesh = sphere(
      head,
      eyeWhite,
      eyeP,
      new THREE.Vector3(0.057, 0.078, 0.024),
      24
    );

    eyeWhiteMesh.lookAt(0, eyeP.y, 0.4);

    const irisP = eyeP.clone().add(new THREE.Vector3(side * 0.002, -0.004, 0.019));

    sphere(head, irisMat, irisP,
      new THREE.Vector3(0.036, 0.049, 0.017), 22
    );

    sphere(head, pupilMat,
      irisP.clone().add(new THREE.Vector3(0, -0.003, 0.013)),
      new THREE.Vector3(0.021, 0.031, 0.012), 18
    );

    const big = sphere(head, basicMat(0xffffff),
      irisP.clone().add(new THREE.Vector3(-0.011, 0.018, 0.024)),
      new THREE.Vector3(0.013, 0.015, 0.008), 12
    );

    const small = sphere(head, basicMat(0xffffff),
      irisP.clone().add(new THREE.Vector3(0.012, -0.014, 0.023)),
      new THREE.Vector3(0.006, 0.007, 0.005), 10
    );

    eyes.push(eyeWhiteMesh);
    eyeShines.push(big, small);

    const browP = getEggPoint(theta, Math.PI * 0.455, 1.01);
    const brow = sphere(head, browMat, browP,
      new THREE.Vector3(0.058, 0.012, 0.014), 16
    );

    brow.rotation.z = side * -0.06;

    const cheekP = getEggPoint(side * 0.68, Math.PI * 0.605, 1.012);
    sphere(head, blushMat, cheekP,
      new THREE.Vector3(0.072, 0.034, 0.009), 20
    );
  });

  const noseP = getEggPoint(0, Math.PI * 0.575, 1.026);

  sphere(head, noseMat, noseP,
    new THREE.Vector3(0.032, 0.021, 0.019), 20
  );

  addSmile(head, smileMat, -0.145, 0.0095);
}

// ------------------------------------------------------------
// Boy avatar
// ------------------------------------------------------------

function createBoy(head, upper, avatar, materials, pivots) {
  const { skin, hair, cream, check, pants, blue, white, backpack } = materials;

  // Hair cap
  const boyCap = new THREE.Mesh(
    createEggPatchGeometry(0, TAU, 0, Math.PI * 0.39, 1.035, 44, 20),
    hair
  );

  head.add(boyCap);

  const boyBackHair = new THREE.Mesh(
    createEggPatchGeometry(Math.PI, Math.PI * 1.35, Math.PI * 0.17, Math.PI * 0.55, 1.04, 34, 18),
    hair
  );

  head.add(boyBackHair);

  // Side hair
  [-1, 1].forEach(side => {
    sphere(head, hair,
      new THREE.Vector3(side * 0.245, -0.085, -0.02),
      new THREE.Vector3(0.09, 0.16, 0.105), 22
    );
  });

  // Split fringe locks
  [-0.82, -0.52, -0.23, 0.08, 0.38, 0.68].forEach((x, i) => {
    const p = getEggPoint(x, Math.PI * 0.365, 1.045);

    const lock = sphere(head, hair, p,
      new THREE.Vector3(0.073, 0.095, 0.058), 20
    );

    lock.rotation.z = -x * 0.16;
    lock.position.y -= (i % 2) * 0.012;
  });

  // Shirt body
  const body = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.16, 0.22, 6, 16),
    cream
  );

  torso.scale.set(1.18, 1.08, 0.88);
  torso.position.set(0, 0.62, 0);
  body.add(torso);

  sphere(body, cream,
    new THREE.Vector3(0, 0.755, 0),
    new THREE.Vector3(0.19, 0.105, 0.13), 20
  );

  sphere(body, skin,
    new THREE.Vector3(0, 0.84, 0.01),
    new THREE.Vector3(0.07, 0.07, 0.07), 16
  );

  // Collar
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.014, 8, 24),
    white
  );

  collar.position.set(0, 0.825, 0.018);
  collar.rotation.x = Math.PI / 2;
  body.add(collar);

  // Chest pocket
  const pocket = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.075, 0.012),
    cream
  );

  pocket.position.set(-0.095, 0.625, 0.115);
  body.add(pocket);

  const pocketTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.071, 0.008, 0.014),
    white
  );

  pocketTop.position.set(-0.095, 0.666, 0.12);
  body.add(pocketTop);

  const seamMat = standardMat(0xd8cbb2, 0.8);
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.002, 0.062, 0.004),
    seamMat
  );

  seam.position.set(-0.095, 0.625, 0.124);
  body.add(seam);

  body.position.y = -HIP;
  upper.add(body);

  // Tied plaid shirt
  const tied = new THREE.Group();
  const tailGeo = new THREE.BoxGeometry(0.24, 0.13, 0.045);

  const leftTail = new THREE.Mesh(tailGeo, check);
  leftTail.position.set(-0.09, 0.19, 0.012);
  leftTail.rotation.z = 0.12;

  const rightTail = new THREE.Mesh(tailGeo, check);
  rightTail.position.set(0.09, 0.19, 0.012);
  rightTail.rotation.z = -0.12;

  tied.add(leftTail, rightTail);

  sphere(tied, check,
    new THREE.Vector3(0, 0.255, 0.04),
    new THREE.Vector3(0.075, 0.055, 0.045), 16
  );

  const knotLoop1 = sphere(tied, check,
    new THREE.Vector3(-0.07, 0.255, 0.045),
    new THREE.Vector3(0.055, 0.032, 0.035), 14
  );

  knotLoop1.rotation.z = 0.3;

  const knotLoop2 = sphere(tied, check,
    new THREE.Vector3(0.07, 0.255, 0.045),
    new THREE.Vector3(0.055, 0.032, 0.035), 14
  );

  knotLoop2.rotation.z = -0.3;

  tied.position.set(0, -0.08, 0.02);
  upper.add(tied);

  // Backpack
  const pack = new THREE.Group();

  const packMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.26, 0.09),
    backpack
  );

  packMain.position.set(0, 0.58, -0.15);
  pack.add(packMain);

  const flap = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.08, 0.098),
    backpack
  );

  flap.position.set(0, 0.73, -0.145);
  pack.add(flap);

  const packPocket = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.09, 0.015),
    blue
  );

  packPocket.position.set(0, 0.54, -0.095);
  pack.add(packPocket);

  sphere(pack, standardMat(0x263c5a, 0.45, 0.2),
    new THREE.Vector3(0, 0.67, -0.095),
    new THREE.Vector3(0.018, 0.018, 0.01), 12
  );

  avatar.add(pack);

  // Shoulder straps
  [-1, 1].forEach(side => {
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.018, 8, 24, Math.PI * 0.82),
      backpack
    );

    strap.position.set(side * 0.13, 0.73 - HIP, 0.015);
    strap.rotation.z = side * -0.18;
    strap.rotation.x = Math.PI / 2;
    upper.add(strap);
  });

  // Arms
  [pivots.leftArmPivot, pivots.rightArmPivot].forEach((pivot, i) => {
    const side = i === 0 ? -1 : 1;

    const sleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.058, 0.095, 4, 12),
      cream
    );

    sleeve.position.set(side * 0.015, -0.095, 0);
    sleeve.rotation.z = side * -0.13;
    pivot.add(sleeve);

    sphere(pivot, skin,
      new THREE.Vector3(side * 0.035, -0.255, 0.012),
      new THREE.Vector3(0.067, 0.068, 0.064), 18
    );
  });

  // Legs + rolled trousers + slip-ons
  [pivots.leftLegPivot, pivots.rightLegPivot].forEach((pivot, i) => {
    const side = i === 0 ? -1 : 1;

    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.064, 0.21, 5, 14),
      pants
    );

    leg.position.set(0, -0.145, 0);
    pivot.add(leg);

    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.066, 0.067, 0.045, 18),
      standardMat(0x744d43, 0.75)
    );

    cuff.position.set(0, -0.29, 0);
    pivot.add(cuff);

    const shoe = new THREE.Group();

    sphere(shoe, blue,
      new THREE.Vector3(0, -0.355, 0.045),
      new THREE.Vector3(0.075, 0.047, 0.12), 18
    );

    sphere(shoe, white,
      new THREE.Vector3(0, -0.382, 0.06),
      new THREE.Vector3(0.077, 0.018, 0.125), 18
    );

    sphere(shoe, standardMat(0x2b65ba, 0.5),
      new THREE.Vector3(0, -0.35, 0.105),
      new THREE.Vector3(0.053, 0.022, 0.045), 16
    );

    shoe.position.x = side * 0.005;
    pivot.add(shoe);
  });
}

// ------------------------------------------------------------
// Girl avatar
// ------------------------------------------------------------

function createGirl(head, upper, avatar, materials, pivots) {
  const {
    skin, hair, cream, cardigan, skirt, lace,
    red, flowerRed, flowerYellow, white
  } = materials;

  // Dress
  const dress = new THREE.Group();

  const bodice = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.145, 0.16, 6, 16),
    cream
  );

  bodice.scale.set(1.15, 1.12, 0.9);
  bodice.position.set(0, 0.62, 0);
  dress.add(bodice);

  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.20, 0.012),
    cream
  );

  apron.position.set(0, 0.51, 0.112);
  dress.add(apron);

  const apronPocket = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.07, 0.015),
    standardMat(0xfff0d5, 0.82)
  );

  apronPocket.position.set(0, 0.52, 0.124);
  dress.add(apronPocket);

  // Flared skirt
  const skirtMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.29, 0.27, 28, 1, false),
    skirt
  );

  skirtMesh.position.set(0, 0.30, 0);
  dress.add(skirtMesh);

  const hem = new THREE.Mesh(
    new THREE.TorusGeometry(0.275, 0.018, 8, 32),
    red
  );

  hem.position.set(0, 0.165, 0);
  hem.rotation.x = Math.PI / 2;
  dress.add(hem);

  const frill = new THREE.Mesh(
    new THREE.TorusGeometry(0.285, 0.022, 8, 32),
    cream
  );

  frill.position.set(0, 0.15, 0);
  frill.rotation.x = Math.PI / 2;
  dress.add(frill);

  // Apron scallops
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;

    sphere(dress, cream,
      new THREE.Vector3(0.098 * Math.sin(a), 0.405, 0.12 + 0.012 * Math.cos(a)),
      new THREE.Vector3(0.012, 0.012, 0.009), 10
    );
  }

  sphere(dress, skin,
    new THREE.Vector3(0, 0.84, 0.01),
    new THREE.Vector3(0.066, 0.065, 0.06), 16
  );

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.083, 0.013, 8, 24),
    cream
  );

  collar.position.set(0, 0.824, 0.018);
  collar.rotation.x = Math.PI / 2;
  dress.add(collar);

  dress.position.y = -HIP;
  upper.add(dress);

  // Bolero
  const bolero = new THREE.Group();

  const jacketBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.15, 0.12, 5, 14),
    cardigan
  );

  jacketBody.scale.set(1.16, 0.95, 0.92);
  jacketBody.position.set(0, 0.68, 0.005);
  bolero.add(jacketBody);

  const trimMat = standardMat(0xffc0a4, 0.58);

  const trimL = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.16, 0.015),
    trimMat
  );

  trimL.position.set(-0.082, 0.61, 0.112);
  bolero.add(trimL);

  const trimR = trimL.clone();
  trimR.position.x = 0.082;
  bolero.add(trimR);

  // Ribbon
  const bow = new THREE.Group();

  sphere(bow, red,
    new THREE.Vector3(-0.028, 0.585, 0.132),
    new THREE.Vector3(0.03, 0.02, 0.012), 12
  ).rotation.z = 0.3;

  sphere(bow, red,
    new THREE.Vector3(0.028, 0.585, 0.132),
    new THREE.Vector3(0.03, 0.02, 0.012), 12
  ).rotation.z = -0.3;

  sphere(bow, red,
    new THREE.Vector3(0, 0.585, 0.137),
    new THREE.Vector3(0.012, 0.014, 0.012), 12
  );

  bolero.add(bow);
  bolero.position.y = -HIP;
  upper.add(bolero);

  // Puff sleeves + arms
  [pivots.leftArmPivot, pivots.rightArmPivot].forEach((pivot, i) => {
    const side = i === 0 ? -1 : 1;

    sphere(pivot, cardigan,
      new THREE.Vector3(side * 0.01, -0.085, 0),
      new THREE.Vector3(0.078, 0.09, 0.07), 18
    );

    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.052, 0.045, 16),
      cream
    );

    cuff.position.set(side * 0.015, -0.16, 0.005);
    pivot.add(cuff);

    sphere(pivot, skin,
      new THREE.Vector3(side * 0.035, -0.255, 0.01),
      new THREE.Vector3(0.066, 0.068, 0.064), 18
    );
  });

  // Hair cap and back hair
  const cap = new THREE.Mesh(
    createEggPatchGeometry(0, TAU, 0, Math.PI * 0.42, 1.035, 42, 20),
    hair
  );

  head.add(cap);

  const back = new THREE.Mesh(
    createEggPatchGeometry(Math.PI, Math.PI * 1.4, Math.PI * 0.18, Math.PI * 0.55, 1.04, 36, 20),
    hair
  );

  head.add(back);

  // Bob hair
  [-1, 1].forEach(side => {
    const lock = sphere(head, hair,
      new THREE.Vector3(side * 0.235, -0.105, -0.025),
      new THREE.Vector3(0.105, 0.19, 0.12), 24
    );

    lock.rotation.z = side * -0.12;

    const frontSide = sphere(head, hair,
      new THREE.Vector3(side * 0.245, 0.025, 0.13),
      new THREE.Vector3(0.07, 0.12, 0.075), 20
    );

    frontSide.rotation.z = side * 0.18;
  });

  // Straight fringe
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.065;

    const fringe = sphere(head, hair,
      new THREE.Vector3(x, 0.205 - Math.abs(i - 3) * 0.006, 0.245),
      new THREE.Vector3(0.057, 0.083, 0.055), 18
    );

    fringe.rotation.z = -x * 0.55;
  }

  // Flower crown leaves
  const leafMat = standardMat(0x4f9a4d, 0.7);

  for (let i = 0; i < 9; i++) {
    const theta = -1.05 + i * 0.2625;
    const p = getEggPoint(theta, 0.34, 1.09);

    const leaf = sphere(head, leafMat, p,
      new THREE.Vector3(0.034, 0.025, 0.018), 12
    );

    leaf.rotation.z = theta * 0.3;
  }

  // Flowers
  for (let i = 0; i < 5; i++) {
    const theta = -1.0 + i * 0.5;
    const p = getEggPoint(theta, 0.28, 1.095);
    const petals = i % 2 ? flowerYellow : flowerRed;

    for (let k = 0; k < 5; k++) {
      const a = k / 5 * TAU;

      sphere(head, petals,
        p.clone().add(new THREE.Vector3(
          Math.cos(a) * 0.018,
          Math.sin(a) * 0.018,
          0.008
        )),
        new THREE.Vector3(0.014, 0.014, 0.012), 10
      );
    }

    sphere(head, standardMat(0xffd86c, 0.55),
      p.clone().add(new THREE.Vector3(0, 0, 0.018)),
      new THREE.Vector3(0.009, 0.009, 0.008), 10
    );
  }

  // Legs, socks and Mary Jane shoes
  [pivots.leftLegPivot, pivots.rightLegPivot].forEach((pivot, i) => {
    const side = i === 0 ? -1 : 1;

    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.052, 0.19, 5, 14),
      standardMat(0xf0c29c, 0.65)
    );

    leg.position.set(0, -0.14, 0);
    pivot.add(leg);

    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.061, 0.09, 18),
      lace
    );

    sock.position.set(0, -0.255, 0.005);
    pivot.add(sock);

    const sockTop = new THREE.Mesh(
      new THREE.TorusGeometry(0.058, 0.008, 8, 20),
      white
    );

    sockTop.position.set(0, -0.215, 0.005);
    pivot.add(sockTop);

    const shoe = new THREE.Group();

    sphere(shoe, red,
      new THREE.Vector3(0, -0.355, 0.04),
      new THREE.Vector3(0.072, 0.045, 0.105), 18
    );

    sphere(shoe, standardMat(0x6f302d, 0.7),
      new THREE.Vector3(0, -0.382, 0.05),
      new THREE.Vector3(0.075, 0.014, 0.112), 16
    );

    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.012, 0.014),
      red
    );

    strap.position.set(0, -0.338, 0.045);
    shoe.add(strap);

    sphere(shoe, standardMat(0xffd7a0, 0.45, 0.3),
      new THREE.Vector3(0, -0.337, 0.053),
      new THREE.Vector3(0.012, 0.009, 0.009), 10
    );

    shoe.position.x = side * 0.004;
    pivot.add(shoe);
  });
}

// ------------------------------------------------------------
// Main avatar creation
// ------------------------------------------------------------

export function createAvatar(variant = 'boy') {
  variant = variant === 'girl' ? 'girl' : 'boy';

  const avatar = new THREE.Group();
  avatar.name = `Avatar_${variant}`;

  const upper = new THREE.Group();
  upper.position.set(0, HIP, 0);
  avatar.add(upper);

  const eyes = [];
  const eyeShines = [];

  // Skin
  const skinTexture = createSkinTexture();

  const skin = new THREE.MeshStandardMaterial({
    map: skinTexture,
    color: 0xffffff,
    roughness: 0.66
  });

  // Hair
  const hairTexture = createHairTexture(
    variant === 'girl' ? '#9b6538' : '#70432b',
    variant === 'girl' ? '#d9a25c' : '#b36b3e'
  );

  const hair = new THREE.MeshStandardMaterial({
    map: hairTexture,
    color: 0xffffff,
    roughness: 0.7
  });

  // Shirt / dress
  const creamTexture = createFabricTexture(
    variant === 'girl' ? '#fff0d9' : '#f7f0d9',
    '#ffffff',
    'plain'
  );

  const cream = new THREE.MeshStandardMaterial({
    map: creamTexture,
    color: 0xffffff,
    roughness: 0.82
  });

  // Plaid
  const checkTexture = createFabricTexture('#5b783b', '#f1d65c', 'check');

  const check = new THREE.MeshStandardMaterial({
    map: checkTexture,
    color: 0xffffff,
    roughness: 0.85
  });

  // Pants
  const pantsTexture = createFabricTexture(
    variant === 'girl' ? '#9b5548' : '#7b4b42',
    '#fff',
    'plain'
  );

  const pants = standardMat(
    variant === 'girl' ? 0x9b5548 : 0x7b4b42,
    0.8,
    0,
    pantsTexture
  );

  // Shoes
  const blue = standardMat(
    0x2670d2,
    0.48,
    0.04,
    createFabricTexture('#2873d2', '#fff', 'plain')
  );

  const dark = standardMat(0x38251c, 0.75);
  const white = standardMat(0xfff8e9, 0.45);

  // Backpack
  const backpack = standardMat(
    0x2867b5,
    0.6,
    0.04,
    createFabricTexture('#2867b5', '#fff', 'knit')
  );

  // Girl outfit
  const cardigan = standardMat(
    0xc94a42,
    0.78,
    0,
    createFabricTexture('#c94a42', '#fff', 'knit')
  );

  const skirt = standardMat(
    0x9b6840,
    0.82,
    0,
    createFabricTexture('#9b6840', '#fff', 'plain')
  );

  const lace = standardMat(
    0xfff3df,
    0.7,
    0,
    createFabricTexture('#fff3df', '#ffffff', 'lace')
  );

  const red = standardMat(0xb83b3b, 0.55, 0.03);
  const green = standardMat(0x4f9a4d, 0.72);
  const flowerRed = standardMat(0xe64c55, 0.55);
  const flowerYellow = standardMat(0xffd35c, 0.5);

  const materials = {
    skin, hair, cream, check, pants, blue, dark, white,
    backpack, cardigan, skirt, lace, red, green,
    flowerRed, flowerYellow
  };

  // Head
  const headGroup = new THREE.Group();

  buildFace(headGroup, skin, variant, eyes, eyeShines);

  headGroup.position.set(0, 1.17 - HIP, 0.01);
  upper.add(headGroup);

  // Original animation pivot locations retained
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.22, 0.74 - HIP, 0);
  upper.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.22, 0.74 - HIP, 0);
  upper.add(rightArmPivot);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.095, 0.41, 0);
  avatar.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.095, 0.41, 0);
  avatar.add(rightLegPivot);

  const pivots = {
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot
  };

  // Variant
  if (variant === 'girl') {
    createGirl(headGroup, upper, avatar, materials, pivots);
  } else {
    createBoy(headGroup, upper, avatar, materials, pivots);
  }

  return {
    group: avatar,
    parts: {
      upper,
      headGroup,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      eyes,
      eyeShines
    },
    materials: {
      scarf: cream,
      skin,
      hair,
      cream,
      check,
      pants,
      blue,
      cardigan,
      skirt,
      lace,
      red,
      backpack
    }
  };
}
