import * as THREE from 'three';
import { createCathedralMaterials } from './textures.js';

export const CATHEDRAL_BOUNDS = {
  width: 28,
  height: 28,
  naveLength: 56,
  apseCenterZ: -24,
  minX: -28 / 2 + 2.5,
  maxX: 28 / 2 - 2.5,
  minZ: -24 - 4.0,
  maxZ: -24 + 56 - 3.0,
};

function createArchedStainedGlassMesh(width, totalHeight, texture) {
  const archRadius = width / 2;
  const rectHeight = totalHeight - archRadius;

  const shape = new THREE.Shape();

  shape.moveTo(-archRadius, -totalHeight / 2);
  shape.lineTo(archRadius, -totalHeight / 2);
  shape.lineTo(
    archRadius,
    -totalHeight / 2 + rectHeight
  );

  shape.absarc(
    0,
    -totalHeight / 2 + rectHeight,
    archRadius,
    0,
    Math.PI,
    false
  );

  shape.lineTo(-archRadius, -totalHeight / 2);

  // 아치 곡면 세분화
  const geo = new THREE.ShapeGeometry(shape, 64);

  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;

  // UV 매핑
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);

    const u = THREE.MathUtils.clamp(
      (vx + archRadius) / width,
      0,
      1
    );

    const v = THREE.MathUtils.clamp(
      (vy + totalHeight / 2) / totalHeight,
      0,
      1
    );

    uvs.setXY(i, u, v);
  }

  uvs.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: false,
    toneMapped: false
  });

  return new THREE.Mesh(geo, mat);
}

function createPointedArchPoints(spanHalf, springY, peakY, steps = 20) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sideSign = t < 0.5 ? -1 : 1;
    const u = t < 0.5 ? t * 2 : (1 - t) * 2;
    const x = sideSign * spanHalf * Math.pow(1 - u, 1.15);
    const y = springY + (peakY - springY) * Math.pow(Math.sin(u * Math.PI * 0.5), 0.78);
    pts.push(new THREE.Vector3(x, y, 0));
  }
  return pts;
}

export function createCathedral() {
  const group = new THREE.Group();
  const flames = [];
  const seatSpots = [];
  const colliders = [];

  const { darkStoneTex, floorTex, scenicTextures, wallMat, archStoneMat, woodMat, darkWoodMat, goldMat } =
    createCathedralMaterials();

  const W = CATHEDRAL_BOUNDS.width;
  const H = CATHEDRAL_BOUNDS.height;
  const naveLength = CATHEDRAL_BOUNDS.naveLength;
  const apseRadius = W / 2;
  const apseCenterZ = CATHEDRAL_BOUNDS.apseCenterZ;

  // 바닥
  const floorRect = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.8, naveLength),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 })
  );
  floorRect.position.set(0, -0.4, apseCenterZ + naveLength / 2);
  group.add(floorRect);

  const apseFloorShape = new THREE.Shape();
  apseFloorShape.absarc(0, 0, apseRadius, Math.PI, Math.PI * 2, false);
  const apseFloorGeo = new THREE.ExtrudeGeometry(apseFloorShape, {
    depth: 0.8,
    bevelEnabled: false,
    curveSegments: 36,
  });
  apseFloorGeo.rotateX(Math.PI / 2);
  const apseFloor = new THREE.Mesh(
    apseFloorGeo,
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 })
  );
  apseFloor.position.set(0, 0.4, apseCenterZ);
  group.add(apseFloor);

  // 외벽
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.0, H, naveLength), wallMat);
  leftWall.position.set(-W / 2 - 0.5, H / 2, apseCenterZ + naveLength / 2);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1.0, H, naveLength), wallMat);
  rightWall.position.set(W / 2 + 0.5, H / 2, apseCenterZ + naveLength / 2);
  group.add(rightWall);

  const apseSegs = 32;
  const outerApseR = apseRadius + 0.45;
  for (let s = 0; s < apseSegs; s++) {
    const a1 = Math.PI + (s / apseSegs) * Math.PI;
    const a2 = Math.PI + ((s + 1) / apseSegs) * Math.PI;
    const x1 = Math.cos(a1) * outerApseR;
    const z1 = apseCenterZ + Math.sin(a1) * outerApseR;
    const x2 = Math.cos(a2) * outerApseR;
    const z2 = apseCenterZ + Math.sin(a2) * outerApseR;

    const segLen = Math.hypot(x2 - x1, z2 - z1) + 0.22;
    const segWall = new THREE.Mesh(new THREE.BoxGeometry(segLen, H, 0.9), wallMat);
    segWall.position.set((x1 + x2) / 2, H / 2, (z1 + z2) / 2);
    segWall.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    group.add(segWall);
  }

  // 제단 뒤 반원 스테인드글라스
  const apseWindowAngles = [
    Math.PI * 1.18,
    Math.PI * 1.34,
    Math.PI * 1.50,
    Math.PI * 1.66,
    Math.PI * 1.82,
  ];

  apseWindowAngles.forEach((ang, idx) => {
    const innerR = apseRadius - 0.35;
    const wx = Math.cos(ang) * innerR;
    const wz = apseCenterZ + Math.sin(ang) * innerR;

    const winGroup = new THREE.Group();
    const winW = 3.2;
    const winH = 15.8;

    const backFrame = createArchedStainedGlassMesh(winW + 0.45, winH + 0.45, darkStoneTex);
    backFrame.position.z = -0.06;
    winGroup.add(backFrame);

    const glassMesh = createArchedStainedGlassMesh(winW, winH, scenicTextures[idx % scenicTextures.length]);
    glassMesh.position.z = 0.04;
    winGroup.add(glassMesh);

    const archRadius = winW / 2;
    const rectH = winH - archRadius;
    const topArchRim = new THREE.Mesh(new THREE.TorusGeometry(archRadius, 0.08, 8, 24, Math.PI), goldMat);
    topArchRim.position.set(0, -winH / 2 + rectH, 0.08);
    winGroup.add(topArchRim);

    winGroup.position.set(wx, 11.8, wz);
    winGroup.lookAt(0, 11.8, apseCenterZ);
    group.add(winGroup);
  });

  // 아치 천장 & 기둥 & 측면 스테인드글라스
  const archPeakY = H + 7.5;
  const archSpringY = 16.2;
  const archCurve = new THREE.CatmullRomCurve3(
    createPointedArchPoints(W / 2, archSpringY, archPeakY, 24)
  );
  const vaultGeo = new THREE.TubeGeometry(archCurve, 32, 0.52, 10, false);

  const baySpan = 8.0;
  const bayTotal = 7;

  for (let b = 0; b < bayTotal; b++) {
    const zBay = apseCenterZ + 2 + b * baySpan;

    const rib = new THREE.Mesh(vaultGeo, archStoneMat);
    rib.position.set(0, 0, zBay);
    group.add(rib);

    const ribGold = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 28, 0.08, 8, false), goldMat);
    ribGold.position.set(0, -0.32, zBay);
    group.add(ribGold);

    const curvePts = archCurve.getPoints(16);
    for (let k = 0; k < curvePts.length - 1; k++) {
      const pA = curvePts[k];
      const pB = curvePts[k + 1];
      const dx = pB.x - pA.x;
      const dy = pB.y - pA.y;
      const segW = Math.hypot(dx, dy) + 0.15;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(segW, 0.35, baySpan + 0.1), archStoneMat);
      panel.position.set((pA.x + pB.x) / 2, (pA.y + pB.y) / 2 + 0.45, zBay + baySpan / 2);
      panel.rotation.z = Math.atan2(dy, dx);
      group.add(panel);
    }

    [-W / 2 + 0.5, W / 2 - 0.5].forEach((xCol, sideIdx) => {
      const dir = sideIdx === 0 ? 1 : -1;
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.1, archSpringY + 1, 1.1), archStoneMat);
      col.position.set(xCol, (archSpringY + 1) / 2, zBay);
      group.add(col);

      colliders.push({
        type: 'aabb',
        minX: xCol - 0.65,
        maxX: xCol + 0.65,
        minZ: zBay - 0.65,
        maxZ: zBay + 0.65,
        topY: 99,
      });

      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.5), goldMat);
      cap.position.set(xCol, archSpringY - 0.2, zBay);
      group.add(cap);

      const sconceArm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.14), goldMat);
      sconceArm.position.set(xCol + dir * 0.68, 11.2, zBay);
      group.add(sconceArm);

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xfff3c4 })
      );
      globe.position.set(xCol + dir * 1.1, 11.45, zBay);
      group.add(globe);
    });

    if (b < bayTotal - 1) {
      const zBayCenter = zBay + baySpan / 2;
      const clearSpanW = baySpan - 1.25;
      const archRadius = clearSpanW / 2;
      const archSpringWallY = 12.6;
      const windowBottomY = 3.2;
      const totalWinH = archSpringWallY + archRadius - windowBottomY;
      const windowCenterY = windowBottomY + totalWinH / 2;

      [-W / 2 + 0.06, W / 2 - 0.06].forEach((xWall, sideIdx) => {
        const dir = sideIdx === 0 ? 1 : -1;
        const texIdx = (b * 2 + sideIdx) % scenicTextures.length;

        const bayWinGroup = new THREE.Group();

        const frameMesh = createArchedStainedGlassMesh(clearSpanW + 0.18, totalWinH + 0.18, darkStoneTex);
        frameMesh.position.z = 0.0;
        bayWinGroup.add(frameMesh);

        const glassMesh = createArchedStainedGlassMesh(clearSpanW - 0.12, totalWinH - 0.12, scenicTextures[texIdx]);
        glassMesh.position.z = 0.03;
        bayWinGroup.add(glassMesh);

        const archRim = new THREE.Mesh(new THREE.TorusGeometry(archRadius - 0.06, 0.07, 8, 24, Math.PI), goldMat);
        archRim.position.set(0, -totalWinH / 2 + (totalWinH - archRadius), 0.05);
        bayWinGroup.add(archRim);

        bayWinGroup.position.set(xWall + dir * 0.04, windowCenterY, zBayCenter);
        bayWinGroup.rotation.y = sideIdx === 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(bayWinGroup);
      });
    }
  }

  for (let r = 0; r < 5; r++) {
    const angle = Math.PI + ((r + 1) / 6) * Math.PI;
    const xStart = Math.cos(angle) * (apseRadius - 0.3);
    const zStart = apseCenterZ + Math.sin(angle) * (apseRadius - 0.3);
    const domeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, archPeakY, apseCenterZ + 2),
      new THREE.Vector3(
        xStart * 0.55,
        (archPeakY + 20.6) * 0.52,
        apseCenterZ + Math.sin(angle) * (apseRadius - 0.3) * 0.55
      ),
      new THREE.Vector3(xStart, 20.6, zStart),
    ]);
    const domeRib = new THREE.Mesh(new THREE.TubeGeometry(domeCurve, 16, 0.25, 8, false), archStoneMat);
    group.add(domeRib);
  }

  // 단상(1~2단, 걸어 올라갈 수 있는 높이) & 제단(높아서 진입 불가)
  const altarZ = apseCenterZ - 3.5;

  const step1 = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.35, 7.5), archStoneMat);
  step1.position.set(0, 0.175, altarZ + 0.4);
  group.add(step1);
  colliders.push({
    type: 'aabb',
    minX: -12.5 / 2,
    maxX: 12.5 / 2,
    minZ: altarZ + 0.4 - 7.5 / 2,
    maxZ: altarZ + 0.4 + 7.5 / 2,
    topY: 0.35,
  });

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.35, 5.6), wallMat);
  step2.position.set(0, 0.525, altarZ);
  group.add(step2);
  colliders.push({
    type: 'aabb',
    minX: -10.0 / 2,
    maxX: 10.0 / 2,
    minZ: altarZ - 5.6 / 2,
    maxZ: altarZ + 5.6 / 2,
    topY: 0.70,
  });

  const step3 = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.35, 4.0), archStoneMat);
  step3.position.set(0, 0.875, altarZ - 0.3);
  group.add(step3);
  colliders.push({
    type: 'aabb',
    minX: -7.8 / 2,
    maxX: 7.8 / 2,
    minZ: altarZ - 0.3 - 4.0 / 2,
    maxZ: altarZ - 0.3 + 4.0 / 2,
    topY: 1.05,
  });

  const altarBaseY = 1.05;

  const altarBody = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.3, 1.9), woodMat);
  altarBody.position.set(0, altarBaseY + 0.65, altarZ + 0.5);
  group.add(altarBody);
  colliders.push({
    type: 'aabb',
    minX: -4.8 / 2 - 0.15,
    maxX: 4.8 / 2 + 0.15,
    minZ: altarZ + 0.5 - 1.9 / 2 - 0.15,
    maxZ: altarZ + 0.5 + 1.9 / 2 + 0.15,
    topY: altarBaseY + 1.43,
  });

  const altarTopSlab = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.18, 2.15), darkWoodMat);
  altarTopSlab.position.set(0, altarBaseY + 1.35, altarZ + 0.5);
  group.add(altarTopSlab);

  const altarCloth = new THREE.Mesh(
    new THREE.BoxGeometry(4.92, 0.38, 2.02),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.72 })
  );
  altarCloth.position.set(0, altarBaseY + 1.24, altarZ + 0.5);
  group.add(altarCloth);

  const bibleCover = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.44), darkWoodMat);
  bibleCover.position.set(-0.9, altarBaseY + 1.48, altarZ + 0.65);
  bibleCover.rotation.y = 0.25;
  group.add(bibleCover);

  const biblePages = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.06, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.8 })
  );
  biblePages.position.set(-0.9, altarBaseY + 1.52, altarZ + 0.65);
  biblePages.rotation.y = 0.25;
  group.add(biblePages);

  const chaliceCup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.22, 16), goldMat);
  chaliceCup.position.set(0.85, altarBaseY + 1.66, altarZ + 0.55);
  group.add(chaliceCup);

  const chaliceStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.14, 0.24, 14), goldMat);
  chaliceStem.position.set(0.85, altarBaseY + 1.52, altarZ + 0.55);
  group.add(chaliceStem);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.34, 7.6, 0.34), goldMat);
  crossV.position.set(0, altarBaseY + 4.4, altarZ - 1.2);
  group.add(crossV);

  const crossH = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.34, 0.34), goldMat);
  crossH.position.set(0, altarBaseY + 5.9, altarZ - 1.2);
  group.add(crossH);

  const crossHalo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 10, 24), goldMat);
  crossHalo.position.set(0, altarBaseY + 5.9, altarZ - 1.35);
  group.add(crossHalo);

  function addDetailCandle(x, z, scale = 1) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 0.18 * scale, 14), goldMat);
    base.position.set(x, altarBaseY + 0.09 * scale, z);
    group.add(base);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.14 * scale, 1.35 * scale, 14), goldMat);
    shaft.position.set(x, altarBaseY + 0.82 * scale, z);
    group.add(shaft);

    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.85 * scale, 14),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.45 })
    );
    wax.position.set(x, altarBaseY + 1.9 * scale, z);
    group.add(wax);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 * scale, 0.3 * scale, 12),
      new THREE.MeshBasicMaterial({ color: 0xffb703 })
    );
    flame.position.set(x, altarBaseY + 2.5 * scale, z);
    group.add(flame);
    flames.push(flame);
  }

  addDetailCandle(-2.8, altarZ + 0.2, 1.15);
  addDetailCandle(2.8, altarZ + 0.2, 1.15);
  addDetailCandle(-1.75, altarZ + 0.85, 0.85);
  addDetailCandle(1.75, altarZ + 0.85, 0.85);

  // 의자: 중앙 칸막이로 둘로 나뉘고, 한쪽당 2명씩 총 4명 착석 가능
  for (let row = 0; row < 10; row++) {
    const zRow = 24 - row * 4.4;
    [-7.4, 7.4].forEach((xRow) => {
      const pew = new THREE.Group();

      const seatY = 0.56;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.12, 0.72), woodMat);
      seat.position.set(0, seatY, 0);
      seat.userData = { type: 'pewSeat', xRow, zRow, seatY };
      pew.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.72, 0.11), darkWoodMat);
      back.position.set(0, 0.92, 0.3);
      back.rotation.x = -0.1;
      back.userData = { type: 'pewSeat', xRow, zRow, seatY };
      pew.add(back);

      const backRail = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.08, 0.16), woodMat);
      backRail.position.set(0, 1.29, 0.26);
      pew.add(backRail);

      const dividerPost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.74), darkWoodMat);
      dividerPost.position.set(0, seatY + 0.22, 0.02);
      pew.add(dividerPost);

      const dividerTop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.78), goldMat);
      dividerTop.position.set(0, seatY + 0.44, 0.02);
      pew.add(dividerTop);

      const slotOffsetsX = [-3.0, -1.05, 1.05, 3.0];
      slotOffsetsX.forEach((sx, sIdx) => {
        const cushion = new THREE.Mesh(
          new THREE.BoxGeometry(1.55, 0.04, 0.58),
          new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.78 })
        );
        cushion.position.set(sx, seatY + 0.08, -0.02);
        cushion.userData = {
          type: 'seatSpot',
          spotId: `${row}_${xRow}_${sIdx}`,
          seatWorldPos: new THREE.Vector3(xRow + sx, seatY + 0.09, zRow - 0.02),
          approachPos: new THREE.Vector3(xRow + sx, 0, zRow - 1.15),
          faceYaw: Math.PI,
        };
        pew.add(cushion);
        seatSpots.push(cushion);
      });

      const kneeler = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.09, 0.26), woodMat);
      kneeler.position.set(0, 0.19, 0.5);
      pew.add(kneeler);

      [-3.8, -1.9, 1.9, 3.8].forEach((legX) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.12, 0.74), darkWoodMat);
        leg.position.set(legX, 0.56, 0.05);
        pew.add(leg);
      });

      pew.position.set(xRow, 0, zRow);
      group.add(pew);

      colliders.push({
        type: 'aabb',
        minX: xRow - 4.2,
        maxX: xRow + 4.2,
        minZ: zRow - 0.48,
        maxZ: zRow + 0.68,
        topY: 1.32,
      });
    });
  }

  return { group, flames, seatSpots, colliders };
}
```[cite: 25, 26]