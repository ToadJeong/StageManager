/**
 * stage3d.js
 * Three.js 기반 3D 무대 비주얼라이저.
 *
 * - 무대 바닥 + 트러스(truss) + 픽스처 리그를 그린다.
 * - 각 픽스처는 출력값(Dimmer/Pan/Tilt/Color/Zoom)에 따라
 *   빔 콘(beam cone)과 바닥의 빛 웅덩이(pool)로 표현된다.
 * - 마우스 드래그로 회전, 휠로 줌.
 *
 * 실제 MA3 의 3D 처럼 정밀한 볼류메트릭은 아니지만,
 * 무빙/색/디머/줌 변화를 직관적으로 확인할 수 있게 했다.
 */
import * as THREE from '../../vendor/three.module.js';
import { FixtureLibrary } from '../engine/fixtureLibrary.js';

export class Stage3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.rigs = new Map(); // fixtureId → rig
    this._initScene();
    this._bindControls();
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _initScene() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090d);
    scene.fog = new THREE.FogExp2(0x07090d, 0.010);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    this.camera = camera;
    // 카메라 구면 좌표 (관객석에서 무대를 바라봄)
    this.cam = { radius: 28, theta: Math.PI / 2, phi: 1.02, target: new THREE.Vector3(0, 2.5, 0) };
    this._updateCamera();

    // 약한 환경광 (완전 암전 방지)
    scene.add(new THREE.HemisphereLight(0x223044, 0x05060a, 0.35));
    const amb = new THREE.AmbientLight(0x101418, 0.4);
    scene.add(amb);

    // 무대 바닥
    const floorGeo = new THREE.PlaneGeometry(40, 30);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.95, metalness: 0.0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 바닥 그리드
    const grid = new THREE.GridHelper(40, 20, 0x1b2430, 0x121821);
    grid.position.y = 0.01;
    scene.add(grid);

    // 뒷벽(사이클로라마)
    const wallGeo = new THREE.PlaneGeometry(40, 18);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 1.0, side: THREE.DoubleSide });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 9, -15);
    scene.add(wall);
    this.wall = wall;

    // 트러스 두 줄 (앞=PAR, 뒤=무빙)
    this._addTruss(3, 9.4);
    this._addTruss(-5, 10.4);
  }

  _addTruss(z, height) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x30373f, roughness: 0.6, metalness: 0.7 });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 36, 8), mat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, height, z);
    this.scene.add(bar);
  }

  _updateCamera() {
    const { radius, theta, phi, target } = this.cam;
    this.camera.position.set(
      target.x + radius * Math.sin(phi) * Math.cos(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.sin(theta)
    );
    this.camera.lookAt(target);
  }

  _bindControls() {
    const el = this.canvas;
    let dragging = false;
    let lx = 0, ly = 0;
    el.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointerup', (e) => { dragging = false; });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      this.cam.theta -= dx * 0.006;
      this.cam.phi = Math.max(0.25, Math.min(1.5, this.cam.phi - dy * 0.006));
      this._updateCamera();
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cam.radius = Math.max(12, Math.min(70, this.cam.radius + e.deltaY * 0.02));
      this._updateCamera();
    }, { passive: false });
  }

  /** 패치(픽스처 목록)에 맞춰 리그를 다시 만든다. */
  syncFixtures(show) {
    // 제거된 픽스처 정리
    for (const [id, rig] of this.rigs) {
      if (!show.fixtures.has(id)) {
        this.scene.remove(rig.group);
        this.scene.remove(rig.pool);
        this.rigs.delete(id);
      }
    }
    // 추가/갱신
    for (const fx of show.fixtures.values()) {
      if (!this.rigs.has(fx.fixtureId)) {
        this.rigs.set(fx.fixtureId, this._makeRig(fx));
      } else {
        const rig = this.rigs.get(fx.fixtureId);
        rig.group.position.set(fx.position.x, fx.position.y, fx.position.z);
      }
    }
  }

  _makeRig(fx) {
    const type = FixtureLibrary[fx.type];
    const group = new THREE.Group();
    group.position.set(fx.position.x, fx.position.y, fx.position.z);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x20262e, roughness: 0.5, metalness: 0.6 });

    // 빔 콘 (additive, 투명) — 공통
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    // 렌즈 글로우 (빔이 나오는 지점의 밝은 점)
    const lensMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), lensMat);
    const beamLen = 14;
    const beamGeo = new THREE.ConeGeometry(1.4, beamLen, 24, 1, true);
    // 콘의 꼭짓점이 픽스처에, 바닥이 아래로 향하도록: 기본은 +Y 꼭짓점, -Y 바닥
    beamGeo.translate(0, -beamLen / 2, 0); // 꼭짓점을 원점(0)으로
    const beam = new THREE.Mesh(beamGeo, beamMat);

    // 헤드(빔이 나오는 부분) — 무빙은 yoke/head, 그 외는 고정 바디
    let head;
    if (type.geometry === 'movingHead') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), bodyMat);
      group.add(base);
      const yoke = new THREE.Group();
      yoke.position.y = -0.3;
      group.add(yoke);
      this._yokeRef = yoke;
      head = new THREE.Group();
      const headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 12), bodyMat);
      headMesh.position.y = -0.45;
      head.add(headMesh);
      beam.position.y = -0.8;
      lens.position.y = -0.8;
      head.add(beam);
      head.add(lens);
      yoke.add(head);
      group.userData.yoke = yoke;
      group.userData.head = head;
    } else {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.6, 12), bodyMat);
      group.add(body);
      beam.position.y = -0.4;
      lens.position.y = -0.45;
      group.add(beam);
      group.add(lens);
    }

    this.scene.add(group);

    // 바닥 빛 웅덩이
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.02;
    this.scene.add(pool);

    return { group, beam, beamMat, lens, lensMat, pool, poolMat, type, fx };
  }

  /** 출력값(values: fixtureId→{attr:val})으로 시각 갱신. */
  update(show, values) {
    for (const [id, rig] of this.rigs) {
      const v = values.get(id);
      if (!v) continue;
      const dim = (v.Dimmer ?? 0) / 100;

      // 색
      const r = (v.ColorRGB_R ?? 100) / 100;
      const g = (v.ColorRGB_G ?? 100) / 100;
      const b = (v.ColorRGB_B ?? 100) / 100;
      rig.beamMat.color.setRGB(r, g, b);
      rig.poolMat.color.setRGB(r, g, b);
      rig.lensMat.color.setRGB(r, g, b);

      // 줌 → 콘 굵기
      const zoom = v.Zoom ?? 22;
      const spread = THREE.MathUtils.lerp(0.5, 2.2, (zoom - 6) / (50 - 6));
      rig.beam.scale.set(spread, 1, spread);

      // 디머 → 밝기/불투명도
      rig.beamMat.opacity = dim * 0.62;
      rig.poolMat.opacity = Math.min(0.95, dim * 1.0);
      rig.lensMat.opacity = Math.min(1, dim * 1.4);
      rig.lens.scale.setScalar(0.6 + dim * 0.9);

      // 무빙: pan/tilt 회전
      if (rig.type.geometry === 'movingHead') {
        const pan = THREE.MathUtils.degToRad(v.Pan ?? 0);
        const tilt = THREE.MathUtils.degToRad(v.Tilt ?? 0);
        rig.group.userData.yoke.rotation.y = pan;
        rig.group.userData.head.rotation.x = tilt;
      }

      // 빛 웅덩이 위치 — 빔의 월드 방향을 바닥(y=0)에 투영
      this._placePool(rig);
    }
  }

  _placePool(rig) {
    // 빔이 시작되는 월드 위치와 방향
    rig.group.updateWorldMatrix(true, true);
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, -1, 0);
    if (rig.type.geometry === 'movingHead') {
      const head = rig.group.userData.head;
      head.getWorldPosition(origin);
      dir.applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
    } else {
      rig.group.getWorldPosition(origin);
    }
    if (Math.abs(dir.y) < 0.02) {
      rig.pool.visible = false;
      return;
    }
    const t = -origin.y / dir.y;
    if (t <= 0) { rig.pool.visible = false; return; }
    rig.pool.visible = true;
    rig.pool.position.set(origin.x + dir.x * t, 0.02, origin.z + dir.z * t);
    // 멀수록 살짝 더 크게
    const s = THREE.MathUtils.clamp(t / 12, 0.6, 1.8) * (rig.beam.scale.x);
    rig.pool.scale.set(s, s, s);
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _animate() {
    requestAnimationFrame(this._animate);
    this.renderer.render(this.scene, this.camera);
  }
}
