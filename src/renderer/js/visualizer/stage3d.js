/**
 * stage3d.js
 * Three.js 3D 무대 비주얼라이저 — Vectorworks Spotlight 풍.
 *
 * 디자인 의도:
 *  - 격자(lattice) 트러스에 클램프로 매단 실사형 픽스처
 *  - 각 픽스처 위/아래에 채널(주소) 라벨 (라이트 플롯 느낌)
 *  - 카메라 프리셋: 3D / Top(평면도=light plot) / Front(정면도)
 *  - 테마 토글: Design(밝은 작업화면) / Stage(어두운 공연화면)
 *  - 출력값에 따라 빔 콘·바닥 풀·무빙 회전·줌이 실시간 반영
 */
import * as THREE from '../../vendor/three.module.js';
import { FixtureLibrary } from '../engine/fixtureLibrary.js';

const THEMES = {
  stage: {
    bg: 0x07090d, fog: 0.010, floor: 0x0c0f14, grid1: 0x1b2430, grid2: 0x121821,
    wall: 0x0a0d12, truss: 0x9aa3ad, body: 0x20262e, hemi: [0x223044, 0x05060a, 0.35], amb: 0.4,
    label: 'rgba(12,15,20,0.78)', labelText: '#ffd27f',
  },
  design: {
    bg: 0xd7dbe0, fog: 0.0, floor: 0xc4c9d0, grid1: 0x9aa1ab, grid2: 0xb3b9c1,
    wall: 0xcfd4da, truss: 0x6b7178, body: 0x3a3f47, hemi: [0xffffff, 0x9098a0, 0.7], amb: 0.85,
    label: 'rgba(255,255,255,0.9)', labelText: '#1d2733',
  },
};

export class Stage3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.rigs = new Map();
    this.themeName = 'stage';
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
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 800);
    this.camera = camera;
    this.cam = { radius: 28, theta: Math.PI / 2, phi: 1.02, target: new THREE.Vector3(0, 2.5, 0) };
    this._updateCamera();

    // 조명
    this.hemi = new THREE.HemisphereLight(0x223044, 0x05060a, 0.35);
    scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(this.amb);

    // 바닥
    this.floorMat = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 32), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 그리드
    this.grid = new THREE.GridHelper(44, 22, 0x1b2430, 0x121821);
    this.grid.position.y = 0.01;
    scene.add(this.grid);

    // 뒷벽
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 1.0, side: THREE.DoubleSide });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(44, 20), this.wallMat);
    wall.position.set(0, 10, -16);
    scene.add(wall);

    // 트러스(격자) — 앞(PAR), 뒤(무빙)
    this.trussMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.5, metalness: 0.85 });
    this.bodyMatColor = 0x20262e;
    scene.add(this._makeTruss(38, 9.6, 3));
    scene.add(this._makeTruss(38, 10.6, -5));
    // 트러스를 받치는 수직 기둥
    [[-18, 3], [18, 3], [-18, -5], [18, -5]].forEach(([x, z]) => {
      const h = z === 3 ? 9.6 : 10.6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, h, 8), this.trussMat);
      post.position.set(x, h / 2, z);
      scene.add(post);
    });

    this.applyTheme('stage');
  }

  /** 격자 트러스 그룹 생성 (위/아래 코드 + 지그재그 대각). */
  _makeTruss(length, y, z) {
    const g = new THREE.Group();
    const r = 0.07;
    const halfH = 0.28; // 트러스 단면 높이의 절반
    const chord = (yy) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 6), this.trussMat);
      m.rotation.z = Math.PI / 2;
      m.position.set(0, yy, 0);
      g.add(m);
    };
    chord(halfH); chord(-halfH);
    // 대각 브레이스
    const seg = 1.4;
    const n = Math.floor(length / seg);
    for (let i = 0; i < n; i++) {
      const x0 = -length / 2 + i * seg;
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, Math.hypot(seg, halfH * 2), 5), this.trussMat);
      const x1 = x0 + seg;
      brace.position.set((x0 + x1) / 2, 0, 0);
      brace.rotation.z = Math.atan2(halfH * 2, seg) * (i % 2 === 0 ? 1 : -1) + Math.PI / 2;
      g.add(brace);
    }
    g.position.set(0, y, z);
    return g;
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
    let dragging = false, lx = 0, ly = 0;
    el.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointerup', () => { dragging = false; });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.cam.theta -= (e.clientX - lx) * 0.006;
      this.cam.phi = Math.max(0.05, Math.min(1.5, this.cam.phi - (e.clientY - ly) * 0.006));
      lx = e.clientX; ly = e.clientY;
      this._updateCamera();
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cam.radius = Math.max(10, Math.min(90, this.cam.radius + e.deltaY * 0.02));
      this._updateCamera();
    }, { passive: false });
  }

  /** 카메라 프리셋: '3d' | 'top'(평면도) | 'front'(정면도). */
  setView(preset) {
    if (preset === 'top') {
      this.cam = { radius: 34, theta: Math.PI / 2, phi: 0.05, target: new THREE.Vector3(0, 0, -1) };
    } else if (preset === 'front') {
      this.cam = { radius: 34, theta: Math.PI / 2, phi: 1.45, target: new THREE.Vector3(0, 5, 0) };
    } else {
      this.cam = { radius: 28, theta: Math.PI / 2, phi: 1.02, target: new THREE.Vector3(0, 2.5, 0) };
    }
    this._updateCamera();
  }

  /** 테마: 'stage'(어두움) | 'design'(밝은 라이트플롯). */
  applyTheme(name) {
    const t = THEMES[name] || THEMES.stage;
    this.themeName = name;
    this.scene.background = new THREE.Color(t.bg);
    this.scene.fog = t.fog > 0 ? new THREE.FogExp2(t.bg, t.fog) : null;
    this.floorMat.color.setHex(t.floor);
    // GridHelper 는 색을 정점에 굽기 때문에 재생성
    if (this.grid) this.scene.remove(this.grid);
    this.grid = new THREE.GridHelper(44, 22, t.grid1, t.grid2);
    this.grid.position.y = 0.01;
    this.scene.add(this.grid);
    this.wallMat.color.setHex(t.wall);
    this.trussMat.color.setHex(t.truss);
    this.hemi.color.setHex(t.hemi[0]); this.hemi.groundColor.setHex(t.hemi[1]); this.hemi.intensity = t.hemi[2];
    this.amb.intensity = t.amb;
    this.bodyMatColor = t.body;
    // 라벨/바디 색 갱신
    for (const rig of this.rigs.values()) {
      rig.bodyMat.color.setHex(t.body);
      this._regenLabel(rig);
    }
  }

  toggleTheme() {
    this.applyTheme(this.themeName === 'stage' ? 'design' : 'stage');
  }

  syncFixtures(show) {
    for (const [id, rig] of this.rigs) {
      if (!show.fixtures.has(id)) {
        this.scene.remove(rig.group); this.scene.remove(rig.pool); this.scene.remove(rig.label);
        this.rigs.delete(id);
      }
    }
    for (const fx of show.fixtures.values()) {
      if (!this.rigs.has(fx.fixtureId)) {
        this.rigs.set(fx.fixtureId, this._makeRig(fx));
      } else {
        const rig = this.rigs.get(fx.fixtureId);
        rig.group.position.set(fx.position.x, fx.position.y, fx.position.z);
        rig.label.position.set(fx.position.x, fx.position.y + 0.9, fx.position.z);
      }
    }
  }

  _makeRig(fx) {
    const type = FixtureLibrary[fx.type];
    const group = new THREE.Group();
    group.position.set(fx.position.x, fx.position.y, fx.position.z);

    const bodyMat = new THREE.MeshStandardMaterial({ color: this.bodyMatColor, roughness: 0.5, metalness: 0.55 });

    // 클램프(트러스에 거는 고리) + 행거
    const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 12), this.trussMat);
    clamp.position.y = 0.55; clamp.rotation.x = Math.PI / 2;
    group.add(clamp);
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), bodyMat);
    hanger.position.y = 0.28; group.add(hanger);

    // 빔 콘
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), lensMat);
    const beamLen = 14;
    const beamGeo = new THREE.ConeGeometry(1.4, beamLen, 24, 1, true);
    beamGeo.translate(0, -beamLen / 2, 0);
    const beam = new THREE.Mesh(beamGeo, beamMat);

    if (type.geometry === 'movingHead') {
      // 베이스 → 요크 → 헤드
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.7), bodyMat);
      group.add(base);
      const yoke = new THREE.Group(); yoke.position.y = -0.25; group.add(yoke);
      // 요크 암 두 개
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.1), bodyMat);
      const armL = arm.clone(); armL.position.set(-0.32, -0.3, 0); yoke.add(armL);
      const armR = arm.clone(); armR.position.set(0.32, -0.3, 0); yoke.add(armR);
      const head = new THREE.Group();
      const headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.33, 0.66, 14), bodyMat);
      headMesh.position.y = -0.5; head.add(headMesh);
      const lensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 14), this.trussMat);
      lensRing.position.y = -0.84; head.add(lensRing);
      beam.position.y = -0.86; lens.position.y = -0.86;
      head.add(beam); head.add(lens);
      head.position.y = -0.3; yoke.add(head);
      group.userData.yoke = yoke; group.userData.head = head;
    } else {
      // PAR/디머/스트로브: 요크 브래킷 + 원통 바디
      const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 6, 16, Math.PI), bodyMat);
      bracket.position.y = -0.1; group.add(bracket);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.62, 16), bodyMat);
      body.position.y = -0.42; group.add(body);
      const lensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), this.trussMat);
      lensRing.position.y = -0.74; group.add(lensRing);
      beam.position.y = -0.74; lens.position.y = -0.74;
      group.add(beam); group.add(lens);
    }

    this.scene.add(group);

    // 바닥 풀
    const poolMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), poolMat);
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.02;
    this.scene.add(pool);

    // 채널 라벨 (라이트 플롯 느낌)
    const rig = { group, beam, beamMat, lens, lensMat, pool, poolMat, bodyMat, type, fx, label: null };
    rig.label = this._makeLabel(fx);
    rig.label.position.set(fx.position.x, fx.position.y + 0.9, fx.position.z);
    this.scene.add(rig.label);
    return rig;
  }

  _labelText(fx) {
    return `${fx.fixtureId}`;
  }

  _makeLabel(fx) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: true }));
    sp.scale.set(2.0, 1.0, 1);
    sp.userData.fx = fx;
    this._paintLabel(sp);
    return sp;
  }

  _regenLabel(rig) {
    if (rig.label) this._paintLabel(rig.label);
  }

  _paintLabel(sprite) {
    const fx = sprite.userData.fx;
    const t = THEMES[this.themeName];
    const c = document.createElement('canvas'); c.width = 160; c.height = 80;
    const ctx = c.getContext('2d');
    ctx.fillStyle = t.label;
    const w = 150, h = 52, x = 5, y = 14, rr = 12;
    ctx.beginPath();
    ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath(); ctx.fill();
    ctx.fillStyle = t.labelText;
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this._labelText(fx), 80, 41);
    const tex = new THREE.CanvasTexture(c);
    if (sprite.material.map) sprite.material.map.dispose();
    sprite.material.map = tex;
    sprite.material.needsUpdate = true;
  }

  update(show, values) {
    for (const [id, rig] of this.rigs) {
      const v = values.get(id);
      if (!v) continue;
      const dim = (v.Dimmer ?? 0) / 100;
      const r = (v.ColorRGB_R ?? 100) / 100;
      const g = (v.ColorRGB_G ?? 100) / 100;
      const b = (v.ColorRGB_B ?? 100) / 100;
      rig.beamMat.color.setRGB(r, g, b);
      rig.poolMat.color.setRGB(r, g, b);
      rig.lensMat.color.setRGB(r, g, b);

      const zoom = v.Zoom ?? 22;
      const spread = THREE.MathUtils.lerp(0.5, 2.2, (zoom - 6) / (50 - 6));
      rig.beam.scale.set(spread, 1, spread);

      rig.beamMat.opacity = dim * 0.62;
      rig.poolMat.opacity = Math.min(0.95, dim * 1.0);
      rig.lensMat.opacity = Math.min(1, dim * 1.4);
      rig.lens.scale.setScalar(0.6 + dim * 0.9);

      if (rig.type.geometry === 'movingHead') {
        rig.group.userData.yoke.rotation.y = THREE.MathUtils.degToRad(v.Pan ?? 0);
        rig.group.userData.head.rotation.x = THREE.MathUtils.degToRad(v.Tilt ?? 0);
      }
      this._placePool(rig);
    }
  }

  _placePool(rig) {
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
    if (Math.abs(dir.y) < 0.02) { rig.pool.visible = false; return; }
    const tt = -origin.y / dir.y;
    if (tt <= 0) { rig.pool.visible = false; return; }
    rig.pool.visible = true;
    rig.pool.position.set(origin.x + dir.x * tt, 0.02, origin.z + dir.z * tt);
    const s = THREE.MathUtils.clamp(tt / 12, 0.6, 1.8) * rig.beam.scale.x;
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
