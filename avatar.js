import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Cute, softly shaded cathedral avatars. Compatible with Three.js r160.
// Public API: createAvatar(variant = 'boy')
// Pivot locations are intentionally kept compatible with the original app.js.
// ---------------------------------------------------------------------------

const EGG_RX = 0.33;
const EGG_RY = 0.39;
const EGG_RZ = 0.35;
const HIP = 0.43;
const TAU = Math.PI * 2;


function getEggPoint(theta, phi, scale = 1.0) {
  const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
  const xTaper = cosPhi < 0 ? 1.0 + cosPhi * 0.22 : 1.0 + cosPhi * 0.04;
  const zTaper = cosPhi < 0 ? 1.0 + cosPhi * 0.12 : 1.0;
  return new THREE.Vector3(
    EGG_RX * xTaper * sinPhi * Math.sin(theta) * scale,
    EGG_RY * cosPhi * scale,
    EGG_RZ * zTaper * sinPhi * Math.cos(theta) * scale
  );
}


function createEggPatchGeometry(thetaCenter, thetaSpan, phiStart, phiLength,
  scale = 1.0, thetaSegs = 24, phiSegs = 18) {
  const positions = [], uvs = [], indices = [];
  for (let iy = 0; iy <= phiSegs; iy++) {
    const v = iy / phiSegs, phi = phiStart + v * phiLength;
    for (let ix = 0; ix <= thetaSegs; ix++) {
      const u = ix / thetaSegs;
      const theta = thetaCenter - thetaSpan / 2 + u * thetaSpan;
      const pt = getEggPoint(theta, phi, scale);
      positions.push(pt.x, pt.y, pt.z);
      uvs.push(u, 1 - v);
    }
  }
  const stride = thetaSegs + 1;
  for (let iy = 0; iy < phiSegs; iy++) for (let ix = 0; ix < thetaSegs; ix++) {
    const a = iy * stride + ix, b = a + 1, c = a + stride, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mat = (color, roughness = 0.72, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const sphere = (r, w = 20, h = 16) => new THREE.SphereGeometry(r, w, h);

function addMesh(parent, geometry, material, position, scale, rotation) {
  const m = new THREE.Mesh(geometry, material);
  if (position) m.position.set(position[0], position[1], position[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  if (rotation) m.rotation.set(rotation[0], rotation[1], rotation[2]);
  parent.add(m);
  return m;
}

function capsuleBetween(a, b, radius, material, parent, segments = 12) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va), length = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.98, length, segments), material);
  mesh.position.copy(va.add(vb).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(mesh);
  return mesh;
}

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

function drawNoise(ctx, size, amount = 1200, alpha = 0.035) {
  for (let i = 0; i < amount; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    ctx.fillStyle = `rgba(65,45,32,${Math.random() * alpha})`;
    ctx.fillRect(x, y, Math.random() * 1.6 + 0.4, Math.random() * 1.6 + 0.4);
  }
}

function makeSkinTexture() {
  return makeCanvasTexture((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#ffe7c9');
    g.addColorStop(0.48, '#ffd8b4');
    g.addColorStop(1, '#f6bd91');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    for (const x of [0.17, 0.83]) {
      const blush = ctx.createRadialGradient(
        x * s, s * 0.62, s * 0.015,
        x * s, s * 0.62, s * 0.12
      );
      blush.addColorStop(0, 'rgba(239,123,118,.36)');
      blush.addColorStop(1, 'rgba(239,123,118,0)');
      ctx.fillStyle = blush;
      ctx.fillRect(0, 0, s, s);
    }
    drawNoise(ctx, s, 2200, 0.025);
  });
}

function makeClothTexture(base, type = 'plain') {
  return makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);

    if (type === 'check') {
      const cell = s / 12;
      for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = 'rgba(250,245,218,.32)';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }

      ctx.strokeStyle = 'rgba(45,80,35,.48)';
      ctx.lineWidth = 8;
      for (let i = 0; i <= s; i += s / 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, s);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(202,155,44,.55)';
      ctx.lineWidth = 3;
      for (let i = s / 12; i <= s; i += s / 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, s);
        ctx.stroke();
      }
    } else if (type === 'knit') {
      ctx.strokeStyle = 'rgba(255,255,255,.16)';
      ctx.lineWidth = 2;
      for (let i = 0; i < s; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, s);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(80,50,35,.06)';
      for (let i = 0; i < s; i += 6) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(s, i);
        ctx.stroke();
      }
    } else if (type === 'lace') {
      ctx.strokeStyle = 'rgba(255,255,255,.56)';
      ctx.lineWidth = 2;
      for (let y = 0; y < s; y += 24) for (let x = 0; x < s; x += 24) {
        ctx.beginPath();
        ctx.arc(x + 12, y + 12, 8, 0, TAU);
        ctx.stroke();
      }
    }

    drawNoise(ctx, s, 1500, 0.018);
  });
}

function makeHairTexture(base, highlight) {
  return makeCanvasTexture((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s * 0.2);
    g.addColorStop(0, highlight);
    g.addColorStop(0.28, base);
    g.addColorStop(0.72, base);
    g.addColorStop(1, highlight);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    for (let i = 0; i < 160; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      ctx.strokeStyle = i % 3
        ? 'rgba(255,230,160,.10)'
        : 'rgba(70,35,18,.08)';
      ctx.lineWidth = Math.random() * 2 + 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 12, y - 20, x - 8, y - 48, x + 4, y - 80);
      ctx.stroke();
    }
  });
}

function makeFlowerTexture() {
  return makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const colors = ['#e63c4f', '#f6c74b', '#f07d4f', '#e9a7b4'];

    for (let i = 0; i < 28; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 10 + Math.random() * 14;
      ctx.fillStyle = colors[i % colors.length];

      for (let p = 0; p < 5; p++) {
        const a = p * TAU / 5;
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(a) * r * 0.6,
          y + Math.sin(a) * r * 0.6,
          r * 0.55, r * 0.32, a, 0, TAU
        );
        ctx.fill();
      }

      ctx.fillStyle = '#6b482b';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.25, 0, TAU);
      ctx.fill();
    }
  });
}

function roundedBox(width, height, depth, radius, material) {
  // Rounded visual approximation with bevelled edges using a bevelled extruded shape.
  const shape = new THREE.Shape();
  const x = -width / 2, y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: radius * 0.45,
    bevelThickness: radius * 0.45,
    curveSegments: 5
  });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, material);
}


export function createAvatar(variant = 'boy') {
  const isGirl = variant === 'girl';
  const avatar = new THREE.Group();
  const upper = new THREE.Group();
  upper.position.set(0, HIP, 0);
  avatar.add(upper);

  const skinTexture = makeSkinTexture();
  const skinMat = new THREE.MeshStandardMaterial({
    map: skinTexture,
    color: 0xffffff,
    roughness: 0.72
  });
  const skinPlain = mat(isGirl ? 0xffd7b4 : 0xffd9b9, 0.68);
  const hairTexture = makeHairTexture(
    isGirl ? '#c9953d' : '#72503a',
    isGirl ? '#f4cf79' : '#b58a5c'
  );
  const hairMat = new THREE.MeshStandardMaterial({
    map: hairTexture,
    color: 0xffffff,
    roughness: 0.76
  });
  const clothTexture = makeClothTexture(
    isGirl ? '#f7ecd4' : '#f2e9d7',
    'knit'
  );
  const shirtMat = new THREE.MeshStandardMaterial({
    map: clothTexture,
    color: 0xffffff,
    roughness: 0.86
  });

  const darkMat = mat(isGirl ? 0xb6292e : 0x8a603f, 0.78);
  const redMat = mat(0xc92e35, 0.7);
  const whiteMat = mat(0xfff3df, 0.78);
  const trimMat = mat(0xf7d7a1, 0.66);
  const shoeMat = mat(isGirl ? 0xc52b34 : 0x4d7dbb, 0.58);
  const soleMat = mat(0xfff1da, 0.72);
  const eyeWhiteMat = mat(0xfffdf6, 0.4, {
    emissive: 0x191919,
    emissiveIntensity: 0.025
  });
  const irisMat = mat(0x3869b3, 0.42);
  const pupilMat = mat(0x1d2638, 0.35);
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const browMat = mat(isGirl ? 0x8b5b32 : 0x5a3926, 0.8);
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xf58b87,
    transparent: true,
    opacity: 0.34
  });
  const noseMat = mat(0xf28a6d, 0.58);
  const mouthMat = mat(0x5a2e25, 0.7);

  // Body/torso: preserve upper-body grouping and hip-relative placement.
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = -HIP;
  upper.add(bodyGroup);

  const torso = addMesh(
    bodyGroup,
    new THREE.CapsuleGeometry(0.16, 0.22, 5, 16),
    shirtMat,
    [0, 0.62, 0],
    [1.0, 1.0, 0.9]
  );
  torso.rotation.z = 0;

  addMesh(bodyGroup, sphere(0.12), skinPlain, [0, 0.78, 0]); // neck

  if (isGirl) {
    // Ivory pinafore with red piping and softly rounded hem.
    addMesh(
      bodyGroup,
      new THREE.CapsuleGeometry(0.18, 0.23, 4, 18),
      whiteMat,
      [0, 0.56, 0.012],
      [1.25, 1.0, 0.94]
    );

    const bib = roundedBox(0.22, 0.19, 0.025, 0.035, whiteMat);
    bib.position.set(0, 0.68, 0.15);
    bodyGroup.add(bib);

    const bibTrim = roundedBox(0.25, 0.22, 0.014, 0.035, redMat);
    bibTrim.position.set(0, 0.68, 0.166);
    bodyGroup.add(bibTrim);

    const bibFront = roundedBox(0.21, 0.18, 0.018, 0.028, whiteMat);
    bibFront.position.set(0, 0.68, 0.179);
    bodyGroup.add(bibFront);

    // Apron pockets and red edge accents.
    const pocket = roundedBox(0.095, 0.07, 0.015, 0.018, trimMat);
    pocket.position.set(0, 0.49, 0.15);
    bodyGroup.add(pocket);

    const hem = new THREE.Mesh(
      new THREE.TorusGeometry(0.185, 0.012, 8, 32),
      redMat
    );
    hem.rotation.x = Math.PI / 2;
    hem.position.set(0, 0.40, 0.012);
    bodyGroup.add(hem);

    // Small bow at the chest.
    const bowL = addMesh(
      bodyGroup,
      new THREE.SphereGeometry(0.055, 14, 10),
      redMat,
      [-0.045, 0.79, 0.17],
      [1.35, 0.72, 0.4]
    );
    const bowR = addMesh(
      bodyGroup,
      new THREE.SphereGeometry(0.055, 14, 10),
      redMat,
      [0.045, 0.79, 0.17],
      [1.35, 0.72, 0.4]
    );
    addMesh(bodyGroup, sphere(0.027), trimMat, [0, 0.79, 0.18]);

    // Rounded cardigan collar.
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.018, 8, 22),
      trimMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.82, 0.03);
    bodyGroup.add(collar);
  } else {
    // Boy: ivory short-sleeve tee, pocket and round neckline.
    addMesh(
      bodyGroup,
      new THREE.CylinderGeometry(0.145, 0.17, 0.34, 20, 1),
      shirtMat,
      [0, 0.59, 0],
      [1, 1, 0.9]
    );

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.018, 10, 24),
      trimMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.79, 0.015);
    bodyGroup.add(collar);

    const pocket = roundedBox(0.085, 0.09, 0.015, 0.018, whiteMat);
    pocket.position.set(0.07, 0.64, 0.14);
    bodyGroup.add(pocket);

    // Waist-tied checked shirt: two hanging tails and visible sleeve-like knot.
    const checkTex = makeClothTexture('#d4ad67', 'check');
    const checkMat = new THREE.MeshStandardMaterial({
      map: checkTex,
      roughness: 0.88
    });

    const leftTail = roundedBox(0.14, 0.20, 0.055, 0.035, checkMat);
    leftTail.position.set(-0.105, 0.33, 0.02);
    leftTail.rotation.z = 0.12;
    bodyGroup.add(leftTail);

    const rightTail = roundedBox(0.14, 0.19, 0.055, 0.035, checkMat);
    rightTail.position.set(0.105, 0.33, 0.02);
    rightTail.rotation.z = -0.1;
    bodyGroup.add(rightTail);

    const knot = addMesh(
      bodyGroup,
      sphere(0.07),
      checkMat,
      [0, 0.42, 0.09],
      [1.1, 0.72, 0.8]
    );

    // Backpack peeks behind torso, with shoulder straps added later.
    const backpackMat = mat(0x4f88c5, 0.82);
    const pack = roundedBox(0.25, 0.31, 0.14, 0.05, backpackMat);
    pack.position.set(0, 0.63, -0.14);
    bodyGroup.add(pack);

    const packPocket = roundedBox(0.16, 0.10, 0.035, 0.025, mat(0x6fa4d7));
    packPocket.position.set(0, 0.56, -0.22);
    bodyGroup.add(packPocket);
  }

  // Head: egg silhouette with textured surface and soft layered hair.
  const headGroup = new THREE.Group();
  const faceMat = new THREE.MeshStandardMaterial({
    map: skinTexture,
    color: 0xffffff,
    roughness: 0.78
  });

  const egg = new THREE.Mesh(
    createEggPatchGeometry(0, TAU, 0, Math.PI, 1, 48, 36),
    faceMat
  );
  headGroup.add(egg);

  const hairCap = new THREE.Mesh(
    createEggPatchGeometry(0, TAU, 0, Math.PI * 0.39, 1.035, 48, 18),
    hairMat
  );
  headGroup.add(hairCap);

  // Back hair and rounded side bob locks.
  const backHair = new THREE.Mesh(
    createEggPatchGeometry(Math.PI, TAU * 0.86, Math.PI * 0.16, Math.PI * 0.53, 1.045, 36, 20),
    hairMat
  );
  headGroup.add(backHair);

  for (const side of [-1, 1]) {
    const sideTheta = side * 0.98;
    const sidePatch = new THREE.Mesh(
      createEggPatchGeometry(sideTheta, 0.76, Math.PI * 0.27, Math.PI * 0.46, 1.055, 24, 16),
      hairMat
    );
    headGroup.add(sidePatch);

    const lock = addMesh(
      headGroup,
      new THREE.SphereGeometry(0.19, 24, 18),
      hairMat,
      [side * 0.245, -0.12, 0.035],
      [0.68, 1.22, 0.83]
    );
    lock.rotation.z = side * -0.12;
  }

  // Hair fringe: layered scallops for boy; straighter, broad bangs for girl.
  if (isGirl) {
    for (let i = 0; i < 7; i++) {
      const x = -0.24 + i * 0.08;
      const bang = addMesh(
        headGroup,
        new THREE.SphereGeometry(0.09, 18, 14),
        hairMat,
        [x, 0.225 - Math.abs(x) * 0.06, 0.225],
        [1.55, 0.65, 0.68]
      );
      bang.rotation.z = x * 0.22;
    }

    // Rounded bob silhouette below ear height.
    for (const side of [-1, 1]) {
      addMesh(
        headGroup,
        sphere(0.14),
        hairMat,
        [side * 0.26, -0.22, 0.025],
        [0.72, 1.0, 0.88]
      );
    }
  } else {
    const bangXs = [-0.23, -0.14, -0.04, 0.07, 0.17, 0.25];

    bangXs.forEach((x, i) => {
      const b = addMesh(
        headGroup,
        new THREE.SphereGeometry(0.095, 18, 14),
        hairMat,
        [x, 0.22 - (i % 2) * 0.035, 0.22],
        [1.45, 0.78, 0.66]
      );
      b.rotation.z = x * 0.35;
    });

    // A few pointed fringe tips, rounded to keep the toy-like style.
    for (const x of [-0.19, 0.02, 0.19]) {
      addMesh(
        headGroup,
        new THREE.ConeGeometry(0.055, 0.13, 12),
        hairMat,
        [x, 0.13, 0.22],
        [1, 1, 0.55],
        [0, 0, x * 0.5]
      );
    }
  }

  // Facial features: eye whites, blue iris, pupils, two catchlights, eyebrows and blush.
  for (const side of [-1, 1]) {
    const x = side * 0.115;

    const eyeBase = addMesh(
      headGroup,
      sphere(0.073),
      eyeWhiteMat,
      [x, 0.025, 0.285],
      [0.72, 1.28, 0.34]
    );

    const iris = addMesh(
      headGroup,
      sphere(0.047),
      irisMat,
      [x + side * 0.004, 0.015, 0.31],
      [0.72, 1.12, 0.4]
    );

    const pupil = addMesh(
      headGroup,
      sphere(0.027),
      pupilMat,
      [x + side * 0.002, 0.012, 0.324],
      [0.78, 1.15, 0.4]
    );

    addMesh(
      headGroup,
      sphere(0.018),
      shineMat,
      [x - 0.012, 0.037, 0.34],
      [1, 1, 0.5]
    );

    addMesh(
      headGroup,
      sphere(0.008),
      shineMat,
      [x + 0.015, -0.005, 0.34],
      [1, 1, 0.5]
    );

    // Soft eyebrow arcs made from curved tube geometry.
    const browCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x - 0.055, 0.105, 0.29),
      new THREE.Vector3(x, 0.132, 0.302),
      new THREE.Vector3(x + 0.055, 0.108, 0.29)
    );
    headGroup.add(new THREE.Mesh(new THREE.TubeGeometry(browCurve, 12, 0.009, 6, false), browMat));

    addMesh(
      headGroup,
      sphere(0.055),
      blushMat,
      [side * 0.21, -0.075, 0.235],
      [1.4, 0.62, 0.28]
    );
  }

  addMesh(
    headGroup,
    sphere(0.031),
    noseMat,
    [0, -0.045, 0.335],
    [1.22, 0.78, 0.7]
  );

  // Smile, slightly curved upward at both corners.
  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.055, -0.115, 0.31),
    new THREE.Vector3(0, -0.16, 0.325),
    new THREE.Vector3(0.055, -0.115, 0.31)
  );
  headGroup.add(new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 16, 0.009, 8, false), mouthMat));

  // Girl's crown flowers and leaves; boy gets a textured fringe with a small side swoop.
  if (isGirl) {
    const leafMat = mat(0x43824b, 0.72);
    const flowerRed = mat(0xe64a4e, 0.62);
    const flowerYellow = mat(0xf4c24d, 0.65);
    const flowerCore = mat(0x704a30, 0.7);

    for (let i = 0; i < 9; i++) {
      const x = -0.28 + i * 0.07;
      const leaf = addMesh(
        headGroup,
        new THREE.SphereGeometry(0.07, 14, 10),
        leafMat,
        [x, 0.36 + Math.sin(i * 0.7) * 0.025, -0.015],
        [0.72, 0.38, 0.3]
      );
      leaf.rotation.z = (i - 4) * 0.15;
    }

    function flower(x, y, color, scale = 1) {
      const group = new THREE.Group();
      group.position.set(x, y, 0.02);
      headGroup.add(group);

      for (let p = 0; p < 5; p++) {
        const a = p * TAU / 5;
        addMesh(
          group,
          sphere(0.047),
          color,
          [Math.cos(a) * 0.042, Math.sin(a) * 0.042, 0],
          [1.0, 0.75, 0.48]
        );
      }

      addMesh(group, sphere(0.024), flowerCore, [0, 0, 0.018]);
      group.scale.setScalar(scale);
    }

    flower(-0.17, 0.39, flowerRed, 1.1);
    flower(0.15, 0.38, flowerYellow, 1.05);
    flower(0.27, 0.32, flowerRed, 0.8);
  }

  headGroup.position.set(0, 1.17 - HIP, 0.01);
  upper.add(headGroup);

  // Arms: pivot locations and local downward direction intentionally unchanged.
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.22, 0.74 - HIP, 0);
    upper.add(pivot);

    const sleeveMat = isGirl ? redMat : shirtMat;

    addMesh(
      pivot,
      new THREE.CapsuleGeometry(0.065, 0.13, 4, 14),
      sleeveMat,
      [side * 0.015, -0.10, 0],
      [1, 0.9, 0.88],
      [0, 0, side * -0.14]
    );

    addMesh(
      pivot,
      new THREE.CapsuleGeometry(0.043, 0.19, 4, 12),
      skinPlain,
      [side * 0.035, -0.245, 0],
      [1, 1, 0.9]
    );

    addMesh(
      pivot,
      sphere(0.066),
      skinMat,
      [side * 0.045, -0.34, 0.005],
      [1.02, 0.92, 0.95]
    );

    return pivot;
  }

  const leftArmPivot = makeArm(-1);
  const rightArmPivot = makeArm(1);

  if (isGirl) {
    // Puff sleeve volume sits around the pivot top, leaving the forearm free.
    for (const side of [-1, 1]) {
      addMesh(
        upper,
        sphere(0.09),
        redMat,
        [side * 0.23, 0.74 - HIP, 0],
        [1.15, 0.92, 0.92]
      );

      addMesh(
        upper,
        sphere(0.064),
        trimMat,
        [side * 0.23, 0.65 - HIP, 0.012],
        [1.1, 0.32, 0.95]
      );
    }
  } else {
    // Backpack straps are positioned behind shoulder and wrap toward chest.
    const strapMat = mat(0x4479b4, 0.8);

    for (const side of [-1, 1]) {
      const strap = roundedBox(0.055, 0.30, 0.03, 0.018, strapMat);
      strap.position.set(side * 0.12, 0.68 - HIP, -0.03);
      strap.rotation.z = side * -0.13;
      upper.add(strap);
    }
  }

  // Legs: hip pivots remain at y=0.41, with feet below the pivot for walk/seat animation.
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.095, 0.41, 0);
    avatar.add(pivot);

    const pantsMat = isGirl ? whiteMat : mat(0x9b7651, 0.86);

    addMesh(
      pivot,
      new THREE.CapsuleGeometry(0.063, 0.22, 4, 14),
      pantsMat,
      [0, -0.145, 0],
      [1, 1, 0.9]
    );

    if (!isGirl) {
      const cuff = addMesh(
        pivot,
        new THREE.CylinderGeometry(0.065, 0.07, 0.045, 14),
        mat(0xb9956c),
        [0, -0.275, 0]
      );
      cuff.rotation.x = 0.03;
    } else {
      // Cream lace sock and red Mary Jane shoe.
      const sock = addMesh(
        pivot,
        new THREE.CylinderGeometry(0.052, 0.05, 0.105, 14),
        whiteMat,
        [0, -0.28, 0]
      );

      const laceTexture = makeClothTexture('#fff4df', 'lace');
      const laceMat = new THREE.MeshStandardMaterial({
        map: laceTexture,
        roughness: 0.9
      });
      sock.material = laceMat;
    }

    addMesh(
      pivot,
      sphere(0.078),
      shoeMat,
      [0, -0.365, 0.035],
      [1.08, 0.68, 1.42]
    );

    addMesh(
      pivot,
      sphere(0.076),
      soleMat,
      [0, -0.399, 0.038],
      [1.08, 0.24, 1.44]
    );

    if (isGirl) {
      const strap = roundedBox(0.11, 0.022, 0.018, 0.01, redMat);
      strap.position.set(0, -0.348, 0.08);
      pivot.add(strap);

      addMesh(
        pivot,
        sphere(0.012),
        trimMat,
        [0, -0.347, 0.092]
      );
    } else {
      // Blue slip-on top panel and tiny side accent.
      const toePanel = addMesh(
        pivot,
        sphere(0.048),
        mat(0x6e9ed0, 0.55),
        [0, -0.365, 0.09],
        [1.05, 0.55, 0.7]
      );

      addMesh(
        pivot,
        sphere(0.012),
        trimMat,
        [side * 0.05, -0.37, 0.04]
      );
    }

    return pivot;
  }

  const leftLegPivot = makeLeg(-1);
  const rightLegPivot = makeLeg(1);

  return {
    group: avatar,
    parts: {
      upper,
      headGroup,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot
    },
    materials: {
      skin: skinMat,
      hair: hairMat,
      cloth: shirtMat,
      outfit: redMat,
      texture: skinTexture
    }
  };
}
