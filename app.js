import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CATHEDRAL_BOUNDS, createCathedral } from './cathedral.js';
import { createAvatar } from './avatar.js?v=5';

// 1. 씬, 카메라, 렌더러
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14100e);
scene.fog = new THREE.Fog(0x14100e, 50, 140);

const isPortrait = window.innerHeight > window.innerWidth;
const camera = new THREE.PerspectiveCamera(
  isPortrait ? 68 : 56,
  window.innerWidth / window.innerHeight,
  0.1,
  280
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 2.0;
controls.maxDistance = 12.0;
controls.maxPolarAngle = Math.PI * 0.55;
controls.minPolarAngle = Math.PI * 0.10;

// 2. 조명
scene.add(new THREE.AmbientLight(0xffedd5, 0.85));
scene.add(new THREE.HemisphereLight(0xffe6c2, 0x2d241e, 0.9));

const apseLight = new THREE.PointLight(0xffdfa8, 40, 68, 1.3);
apseLight.position.set(0, 21, -33);
scene.add(apseLight);

[-20, -4, 12, 26].forEach((zPos) => {
  const pLight = new THREE.PointLight(0xffd799, 22, 48, 1.4);
  pLight.position.set(0, 18, zPos);
  scene.add(pLight);
});

// 3. 성당 및 아바타 생성
const { group: cathedralGroup, flames, seatSpots, colliders } = createCathedral();
scene.add(cathedralGroup);

const { group: kidAvatar, parts } = createAvatar();
const { headGroup, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot } = parts;

const startAvatarPos = new THREE.Vector3(0, 0, 16);
const AVATAR_PIVOT_Y = 1.05;
const AVATAR_RADIUS = 0.36;
const MAX_STEP_CLIMB = 0.75;

kidAvatar.position.copy(startAvatarPos);
scene.add(kidAvatar);

let prevAvatarPos = kidAvatar.position.clone();
camera.position.set(kidAvatar.position.x, 2.2, kidAvatar.position.z + 4.2);
controls.target.set(kidAvatar.position.x, AVATAR_PIVOT_Y, kidAvatar.position.z);
controls.update();

// 착석 상태 관리
let pendingSeat = null;
let seatedState = null;

function standUpIfSeated() {
  seatedState = null;
}

window.resetAvatarPos = function () {
  kidAvatar.position.copy(startAvatarPos);
  tapTarget = null;
  pendingSeat = null;
  seatedState = null;
  const deltaX = kidAvatar.position.x - prevAvatarPos.x;
  const deltaZ = kidAvatar.position.z - prevAvatarPos.z;
  camera.position.x += deltaX;
  camera.position.z += deltaZ;
  controls.target.x += deltaX;
  controls.target.z += deltaZ;
  controls.target.y = AVATAR_PIVOT_Y;
  prevAvatarPos.copy(kidAvatar.position);
  controls.update();
};

// 4. 충돌 판정 및 단상 높이 계산
function resolveHorizontalCollisions(pos) {
  pos.x = THREE.MathUtils.clamp(pos.x, CATHEDRAL_BOUNDS.minX, CATHEDRAL_BOUNDS.maxX);
  pos.z = THREE.MathUtils.clamp(pos.z, CATHEDRAL_BOUNDS.minZ, CATHEDRAL_BOUNDS.maxZ);

  for (const col of colliders) {
    if (col.topY <= MAX_STEP_CLIMB) continue;

    if (col.type === 'aabb') {
      const closestX = THREE.MathUtils.clamp(pos.x, col.minX, col.maxX);
      const closestZ = THREE.MathUtils.clamp(pos.z, col.minZ, col.maxZ);
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < AVATAR_RADIUS * AVATAR_RADIUS) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = AVATAR_RADIUS - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        } else {
          const penLeft = Math.abs(pos.x - col.minX);
          const penRight = Math.abs(col.maxX - pos.x);
          const penTop = Math.abs(pos.z - col.minZ);
          const penBottom = Math.abs(col.maxZ - pos.z);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) pos.x = col.minX - AVATAR_RADIUS;
          else if (minPen === penRight) pos.x = col.maxX + AVATAR_RADIUS;
          else if (minPen === penTop) pos.z = col.minZ - AVATAR_RADIUS;
          else pos.z = col.maxZ + AVATAR_RADIUS;
        }
      }
    }
  }
}

function getGroundHeightAt(x, z) {
  let groundY = 0;
  for (const col of colliders) {
    if (col.topY > MAX_STEP_CLIMB) continue;
    if (col.type === 'aabb') {
      if (x >= col.minX && x <= col.maxX && z >= col.minZ && z <= col.maxZ) {
        if (col.topY > groundY) groundY = col.topY;
      }
    }
  }
  return groundY;
}

// 5. 사운드 (발소리 + 성가)
let audioCtx = null;
function ensureAudioCtx() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playAnimalCrossingFootstep(stepIndex) {
  try {
    ensureAudioCtx();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    const baseFreq = stepIndex % 2 === 0 ? 440 : 495;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(165, now + 0.065);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

let isPlaying = false;
let loopTimer = null;

function playChordSequence() {
  if (!isPlaying || !audioCtx) return;
  const chords = [
    [261.63, 329.63, 392.00],
    [220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63],
    [196.00, 246.94, 293.66],
  ];
  const now = audioCtx.currentTime;
  chords.forEach((chord, cIdx) => {
    const start = now + cIdx * 3.2;
    chord.forEach((freq) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.035, start + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 3.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 3.2);
    });
  });
  loopTimer = setTimeout(playChordSequence, 12800);
}

window.toggleAudio = function () {
  const btn = document.getElementById('music-btn');
  if (!isPlaying) {
    ensureAudioCtx();
    isPlaying = true;
    btn.textContent = '성가 끄기';
    playChordSequence();
  } else {
    isPlaying = false;
    clearTimeout(loopTimer);
    btn.textContent = '성가 켜기';
  }
};

// 6. 이동 입력 (패드 + 키보드 + 좌석/바닥 탭 + 커서)
const dpadWrap = document.getElementById('dpad-wrap');
const dpadKnob = document.getElementById('dpad-knob');
const padVec = new THREE.Vector2(0, 0);
let activePadPointerId = null;
const maxKnobRadius = 42;

function updatePadFromClient(clientX, clientY) {
  const rect = dpadWrap.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxKnobRadius) {
    dx = (dx / dist) * maxKnobRadius;
    dy = (dy / dist) * maxKnobRadius;
  }
  dpadKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  if (dist > 8) {
    const angle = Math.atan2(dy, dx);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    padVec.set(Math.cos(snapped), Math.sin(snapped));
  } else {
    padVec.set(0, 0);
  }
}

function resetPad() {
  activePadPointerId = null;
  padVec.set(0, 0);
  dpadKnob.style.transform = 'translate(0px, 0px)';
}

dpadWrap.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  ensureAudioCtx();
  standUpIfSeated();
  pendingSeat = null;
  activePadPointerId = e.pointerId;
  dpadWrap.setPointerCapture(e.pointerId);
  tapTarget = null;
  updatePadFromClient(e.clientX, e.clientY);
});
dpadWrap.addEventListener('pointermove', (e) => {
  if (e.pointerId === activePadPointerId) {
    e.stopPropagation();
    updatePadFromClient(e.clientX, e.clientY);
  }
});
dpadWrap.addEventListener('pointerup', (e) => {
  if (e.pointerId === activePadPointerId) {
    e.stopPropagation();
    resetPad();
  }
});
dpadWrap.addEventListener('pointercancel', resetPad);

const keysPressed = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

window.addEventListener('keydown', (e) => {
  if (e.key in keysPressed) {
    e.preventDefault();
    ensureAudioCtx();
    standUpIfSeated();
    pendingSeat = null;
    keysPressed[e.key] = true;
    tapTarget = null;
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key in keysPressed) {
    keysPressed[e.key] = false;
  }
});

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let tapTarget = null;
let cursorFollowEnabled = false;
let cursorGroundTarget = null;

window.toggleCursorMove = function () {
  cursorFollowEnabled = !cursorFollowEnabled;
  const btn = document.getElementById('cursor-btn');
  btn.textContent = cursorFollowEnabled ? '커서 따라가기: 켬' : '커서 따라가기: 끔';
  if (!cursorFollowEnabled) cursorGroundTarget = null;
};

function setPointerNdc(clientX, clientY) {
  pointerNdc.x = (clientX / window.innerWidth) * 2 - 1;
  pointerNdc.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
}

function intersectFloor(clientX, clientY) {
  setPointerNdc(clientX, clientY);
  const hitPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(floorPlane, hitPoint)) {
    hitPoint.y = 0;
    resolveHorizontalCollisions(hitPoint);
    return hitPoint;
  }
  return null;
}

function pickSeatSpot(clientX, clientY) {
  setPointerNdc(clientX, clientY);
  const hits = raycaster.intersectObjects(seatSpots, false);
  if (hits.length > 0 && hits[0].object.userData) {
    const data = hits[0].object.userData;
    const approach = data.approachPos.clone();
    resolveHorizontalCollisions(approach);
    return {
      seatWorldPos: data.seatWorldPos.clone(),
      approachPos: approach,
      faceYaw: data.faceYaw,
    };
  }
  return null;
}

let pointerDownPos = { x: 0, y: 0 };
renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (moveDist < 10) {
    ensureAudioCtx();
    const seatHit = pickSeatSpot(e.clientX, e.clientY);
    if (seatHit) {
      standUpIfSeated();
      pendingSeat = seatHit;
      tapTarget = seatHit.approachPos.clone();
      return;
    }

    standUpIfSeated();
    pendingSeat = null;
    const hit = intersectFloor(e.clientX, e.clientY);
    if (hit) tapTarget = hit;
  }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (cursorFollowEnabled && e.pointerType === 'mouse' && !seatedState) {
    cursorGroundTarget = intersectFloor(e.clientX, e.clientY);
  }
});

// 6. 애니메이션 루프
const clock = new THREE.Clock();
const moveSpeed = 4.2;
let walkCycle = 0;
let lastStepCount = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  flames.forEach((f, idx) => {
    f.scale.y = 1 + Math.sin(t * 9 + idx * 2) * 0.15;
    f.scale.x = 1 + Math.cos(t * 7 + idx) * 0.08;
  });

  const moveDir = new THREE.Vector3(0, 0, 0);

  let keyX = 0;
  let keyY = 0;
  if (keysPressed.ArrowLeft) keyX -= 1;
  if (keysPressed.ArrowRight) keyX += 1;
  if (keysPressed.ArrowUp) keyY -= 1;
  if (keysPressed.ArrowDown) keyY += 1;

  const camForward = new THREE.Vector3();
  camera.getWorldDirection(camForward);
  camForward.y = 0;
  if (camForward.lengthSq() > 0.0001) camForward.normalize();
  const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

  if (keyX !== 0 || keyY !== 0) {
    const kLen = Math.hypot(keyX, keyY);
    moveDir.addScaledVector(camRight, keyX / kLen);
    moveDir.addScaledVector(camForward, -(keyY / kLen));
  } else if (padVec.lengthSq() > 0.01) {
    moveDir.addScaledVector(camRight, padVec.x);
    moveDir.addScaledVector(camForward, -padVec.y);
    tapTarget = null;
  } else if (tapTarget) {
    const toTarget = tapTarget.clone().sub(kidAvatar.position);
    toTarget.y = 0;
    if (toTarget.length() > 0.28) {
      moveDir.copy(toTarget.normalize());
    } else {
      tapTarget = null;
      if (pendingSeat) {
        seatedState = {
          seatWorldPos: pendingSeat.seatWorldPos.clone(),
          faceYaw: pendingSeat.faceYaw,
        };
        pendingSeat = null;
      }
    }
  } else if (cursorFollowEnabled && cursorGroundTarget && !seatedState) {
    const toCursor = cursorGroundTarget.clone().sub(kidAvatar.position);
    toCursor.y = 0;
    if (toCursor.length() > 0.5) {
      moveDir.copy(toCursor.normalize());
    }
  }

  const isMoving = moveDir.lengthSq() > 0.0001 && !seatedState;

  if (isMoving) {
    moveDir.normalize();
    kidAvatar.position.addScaledVector(moveDir, moveSpeed * dt);
    resolveHorizontalCollisions(kidAvatar.position);

    kidAvatar.rotation.y = Math.atan2(moveDir.x, moveDir.z);

    walkCycle += dt * 7.2;
    const swing = Math.sin(walkCycle) * 0.55;
    leftLegPivot.rotation.x = swing;
    rightLegPivot.rotation.x = -swing;
    leftArmPivot.rotation.x = -swing * 0.72;
    rightArmPivot.rotation.x = swing * 0.72;

    const baseGroundY = getGroundHeightAt(kidAvatar.position.x, kidAvatar.position.z);
    kidAvatar.position.y = baseGroundY + Math.abs(Math.sin(walkCycle)) * 0.04;
    headGroup.rotation.z = Math.sin(walkCycle) * 0.035;

    const currentStep = Math.floor(walkCycle / Math.PI);
    if (currentStep > lastStepCount) {
      lastStepCount = currentStep;
      playAnimalCrossingFootstep(currentStep);
    }
  } else if (seatedState) {
    kidAvatar.position.lerp(seatedState.seatWorldPos, 0.22);
    kidAvatar.rotation.y = seatedState.faceYaw;
    leftLegPivot.rotation.x = THREE.MathUtils.lerp(leftLegPivot.rotation.x, -Math.PI * 0.45, 0.25);
    rightLegPivot.rotation.x = THREE.MathUtils.lerp(rightLegPivot.rotation.x, -Math.PI * 0.45, 0.25);
    leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, -0.25, 0.2);
    rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, -0.25, 0.2);
    headGroup.rotation.z *= 0.85;
  } else {
    leftLegPivot.rotation.x *= 0.82;
    rightLegPivot.rotation.x *= 0.82;
    leftArmPivot.rotation.x *= 0.82;
    rightArmPivot.rotation.x *= 0.82;
    headGroup.rotation.z *= 0.82;
    const baseGroundY = getGroundHeightAt(kidAvatar.position.x, kidAvatar.position.z);
    kidAvatar.position.y = baseGroundY + Math.sin(t * 2.5) * 0.01;
  }

  // 카메라 수평 추적 유지 (걷기 바운스에 의한 위아래 흔들림 방지)
  const frameDeltaX = kidAvatar.position.x - prevAvatarPos.x;
  const frameDeltaZ = kidAvatar.position.z - prevAvatarPos.z;
  camera.position.x += frameDeltaX;
  camera.position.z += frameDeltaZ;
  controls.target.x += frameDeltaX;
  controls.target.z += frameDeltaZ;
  controls.target.y = AVATAR_PIVOT_Y;
  prevAvatarPos.copy(kidAvatar.position);

  controls.update();

  if (camera.position.y < 0.45) {
    camera.position.y = 0.45;
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  const portrait = window.innerHeight > window.innerWidth;
  camera.fov = portrait ? 68 : 56;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});