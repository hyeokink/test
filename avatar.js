import * as THREE from 'three';

const EGG_RX = 0.33;
const EGG_RY = 0.39;
const EGG_RZ = 0.35;

// theta: 0 = 정면(+Z), +PI/2 = 오른쪽(+X), -PI/2 = 왼쪽(-X), PI = 뒤(-Z)
// phi: 0 = 정수리(+Y), PI/2 = 눈/코 높이, PI = 턱 끝(-Y)
function getEggPoint(theta, phi, scale = 1.0) {
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const xTaper = cosPhi < 0 ? 1.0 + cosPhi * 0.22 : 1.0 + cosPhi * 0.04;
  const zTaper = cosPhi < 0 ? 1.0 + cosPhi * 0.12 : 1.0;

  return new THREE.Vector3(
    EGG_RX * xTaper * sinPhi * Math.sin(theta) * scale,
    EGG_RY * cosPhi * scale,
    EGG_RZ * zTaper * sinPhi * Math.cos(theta) * scale
  );
}

// getEggPoint와 동일한 좌표계(theta: 0=+Z, +PI/2=+X)로 계란형 표면 패치 생성
function createEggPatchGeometry(
  thetaCenter,
  thetaSpan,
  phiStart,
  phiLength,
  scale = 1.0,
  thetaSegs = 24,
  phiSegs = 18
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
      const pt = getEggPoint(theta, phi, scale);
      positions.push(pt.x, pt.y, pt.z);
      uvs.push(u, 1 - v);
    }
  }

  const rowStride = thetaSegs + 1;
  for (let iy = 0; iy < phiSegs; iy++) {
    for (let ix = 0; ix < thetaSegs; ix++) {
      const a = iy * rowStride + ix;
      const b = a + 1;
      const c = (iy + 1) * rowStride + ix;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createAvatar() {
  const avatar = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd9be, roughness: 0.62 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x3b2820, roughness: 0.68 });
  const blackClothMat = new THREE.MeshStandardMaterial({ color: 0x1e1d20, roughness: 0.65 });
  const whiteScarfMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.62 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x3b281c, roughness: 0.62 });
  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xfca5a5 });
  const eyeDarkMat = new THREE.MeshBasicMaterial({ color: 0x3a2318 });
  const eyeShineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });

  // 1. 상체 (둥근 어깨 + 검은 옷 + 흰 스카프)
  const bodyGroup = new THREE.Group();

  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.38, 22), blackClothMat);
  torsoMesh.scale.set(1.04, 1.0, 0.88);
  torsoMesh.position.set(0, 0.62, 0);
  bodyGroup.add(torsoMesh);

  [-0.20, 0.20].forEach((shX) => {
    const roundShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 16), blackClothMat);
    roundShoulder.position.set(shX, 0.76, 0);
    bodyGroup.add(roundShoulder);
  });

  const whiteScarf = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.052, 14, 26), whiteScarfMat);
  whiteScarf.rotation.x = Math.PI / 2;
  whiteScarf.position.set(0, 0.82, 0.01);
  bodyGroup.add(whiteScarf);

  avatar.add(bodyGroup);

  // 2. 계란형 머리 + 단정한 헤어 + 눈코입
  const headGroup = new THREE.Group();

  const eggFaceMesh = new THREE.Mesh(
    createEggPatchGeometry(0, Math.PI * 2, 0, Math.PI, 1.0, 40, 32),
    skinMat
  );
  headGroup.add(eggFaceMesh);

  const crownCap = new THREE.Mesh(
    createEggPatchGeometry(0, Math.PI * 2, 0, Math.PI * 0.34, 1.022, 36, 14),
    hairMat
  );
  headGroup.add(crownCap);

  const backHair = new THREE.Mesh(
    createEggPatchGeometry(Math.PI, Math.PI * 1.15, Math.PI * 0.22, Math.PI * 0.56, 1.025, 28, 18),
    hairMat
  );
  headGroup.add(backHair);

  [-1, 1].forEach((side) => {
    const sideTheta = side * (Math.PI * 0.52);
    const sideHair = new THREE.Mesh(
      createEggPatchGeometry(sideTheta, Math.PI * 0.38, Math.PI * 0.30, Math.PI * 0.44, 1.024, 18, 16),
      hairMat
    );
    headGroup.add(sideHair);
  });

  const bangThetas = [-0.85, -0.52, -0.22, 0.0, 0.22, 0.52, 0.85];
  bangThetas.forEach((th, idx) => {
    const edgeFactor = 1 - Math.abs(idx - 3) * 0.08;
    const p = getEggPoint(th, Math.PI * 0.355, 1.024);
    const bang = new THREE.Mesh(new THREE.SphereGeometry(0.088 * edgeFactor, 16, 14), hairMat);
    bang.scale.set(1.55, 0.62, 0.52);
    bang.position.copy(p);
    bang.lookAt(0, p.y, 0);
    bang.rotateX(-0.18);
    headGroup.add(bang);
  });

  [-0.36, 0.36].forEach((eyeTheta) => {
    const side = eyeTheta < 0 ? -1 : 1;

    const browPt = getEggPoint(eyeTheta, Math.PI * 0.465, 1.006);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.018, 0.016), eyeDarkMat);
    brow.position.copy(browPt);
    brow.lookAt(0, browPt.y, 0);
    headGroup.add(brow);

    const eyePt = getEggPoint(eyeTheta, Math.PI * 0.535, 1.005);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 18, 18), eyeDarkMat);
    eye.scale.set(0.92, 1.22, 0.42);
    eye.position.copy(eyePt);
    eye.lookAt(0, eyePt.y, 0);
    headGroup.add(eye);

    const shineBigPt = getEggPoint(eyeTheta + side * 0.04, Math.PI * 0.515, 1.012);
    const shineBig = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), eyeShineMat);
    shineBig.position.copy(shineBigPt);
    headGroup.add(shineBig);

    const shineSmallPt = getEggPoint(eyeTheta - side * 0.035, Math.PI * 0.55, 1.012);
    const shineSmall = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), eyeShineMat);
    shineSmall.position.copy(shineSmallPt);
    headGroup.add(shineSmall);

    const cheekPt = getEggPoint(eyeTheta + side * 0.22, Math.PI * 0.59, 1.004);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), cheekMat);
    cheek.scale.set(1.25, 0.68, 0.28);
    cheek.position.copy(cheekPt);
    cheek.lookAt(0, cheekPt.y, 0);
    headGroup.add(cheek);
  });

  const nosePt = getEggPoint(0, Math.PI * 0.57, 1.014);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.033, 12, 12), noseMat);
  nose.scale.set(1.2, 0.85, 0.85);
  nose.position.copy(nosePt);
  headGroup.add(nose);

  const mouthPt = getEggPoint(0, Math.PI * 0.64, 1.005);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.048, 0.011, 8, 18, Math.PI),
    eyeDarkMat
  );
  smile.position.copy(mouthPt);
  smile.lookAt(0, mouthPt.y, 0);
  smile.rotateX(Math.PI);
  headGroup.add(smile);

  headGroup.position.set(0, 1.17, 0.01);
  avatar.add(headGroup);

  // 3. 팔 & 다리 피벗
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.22, 0.74, 0);
  const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.062, 0.25, 14), blackClothMat);
  leftSleeve.position.set(0, -0.11, 0);
  leftSleeve.rotation.z = 0.16;
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 14), skinMat);
  leftHand.position.set(-0.035, -0.26, 0);
  leftArmPivot.add(leftSleeve, leftHand);
  avatar.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.22, 0.74, 0);
  const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.062, 0.25, 14), blackClothMat);
  rightSleeve.position.set(0, -0.11, 0);
  rightSleeve.rotation.z = -0.16;
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 14), skinMat);
  rightHand.position.set(0.035, -0.26, 0);
  rightArmPivot.add(rightSleeve, rightHand);
  avatar.add(rightArmPivot);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.095, 0.41, 0);
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.060, 0.27, 14), blackClothMat);
  leftLeg.position.set(0, -0.13, 0);
  const leftShoe = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), shoeMat);
  leftShoe.scale.set(0.95, 0.65, 1.35);
  leftShoe.position.set(0, -0.32, 0.03);
  leftLegPivot.add(leftLeg, leftShoe);
  avatar.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.095, 0.41, 0);
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.060, 0.27, 14), blackClothMat);
  rightLeg.position.set(0, -0.13, 0);
  const rightShoe = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), shoeMat);
  rightShoe.scale.set(0.95, 0.65, 1.35);
  rightShoe.position.set(0, -0.32, 0.03);
  rightLegPivot.add(rightLeg, rightShoe);
  avatar.add(rightLegPivot);

  return {
    group: avatar,
    parts: { headGroup, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot },
  };
}