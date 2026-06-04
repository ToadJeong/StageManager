/**
 * stage3d.js
 * Three.js 3D 무대 비주얼라이저 — Vectorworks Spotlight 풍 + 픽스처 특성 반영.
 *
 * 종류별 특성 반영:
 *  - 이동속도(PTSpeed): 헤드가 목표 Pan/Tilt 로 속도에 맞춰 슬루(부드럽게 이동)
 *  - 줌/아이리스: 빔 굵기·풀 크기
 *  - 포커스(선명도)/프로스트(가장자리 흐림): 풀/고보 가장자리의 또렷함·번짐
 *  - 고보(+회전): 바닥 풀에 패턴 투사 + 회전
 *  - 프리즘: 빔을 여러 개로 분할(풀 3개)
 *  - 컬러: RGB / CMY / 컬러휠 해석
 *  - 스트로브(셔터): 밝기 점멸
 *  - 무대 모형(OBJ/glTF) 가져오기
 *
 *  카메라 3D/Top/Front, 테마 Stage(어두움)/Design(밝음).
 */
import * as THREE from '../../vendor/three.module.js';
import { OBJLoader } from '../../vendor/loaders/OBJLoader.js';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';
import { FixtureLibrary, resolveColor } from '../engine/fixtureLibrary.js';

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

const deg = THREE.MathUtils.degToRad;
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

export class Stage3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.rigs = new Map();
    this.themeName = 'stage';
    this.scenery = null;
    this._lastT = performance.now();
    this._goboCache = new Map(); // key → CanvasTexture
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

    this.hemi = new THREE.HemisphereLight(0x223044, 0x05060a, 0.35);
    scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(this.amb);

    this.floorMat = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 32), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    this.grid = new THREE.GridHelper(44, 22, 0x1b2430, 0x121821);
    this.grid.position.y = 0.01;
    scene.add(this.grid);

    this.wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 1.0, side: THREE.DoubleSide });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(44, 20), this.wallMat);
    wall.position.set(0, 10, -16);
    scene.add(wall);

    this.trussMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.5, metalness: 0.85 });
    this.bodyMatColor = 0x20262e;
    scene.add(this._makeTruss(38, 9.4, 3));
    scene.add(this._makeTruss(38, 10.6, -5));
    [[-18, 3], [18, 3], [-18, -5], [18, -5]].forEach(([x, z]) => {
      const h = z === 3 ? 9.4 : 10.6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, h, 8), this.trussMat);
      post.position.set(x, h / 2, z);
      scene.add(post);
    });

    this.applyTheme('stage');
  }

  _makeTruss(length, y, z) {
    const g = new THREE.Group();
    const r = 0.07, halfH = 0.28;
    const chord = (yy) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 6), this.trussMat);
      m.rotation.z = Math.PI / 2; m.position.set(0, yy, 0); g.add(m);
    };
    chord(halfH); chord(-halfH);
    const seg = 1.4, n = Math.floor(length / seg);
    for (let i = 0; i < n; i++) {
      const x0 = -length / 2 + i * seg;
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, Math.hypot(seg, halfH * 2), 5), this.trussMat);
      brace.position.set(x0 + seg / 2, 0, 0);
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
      this.cam.phi = clamp(this.cam.phi - (e.clientY - ly) * 0.006, 0.05, 1.5);
      lx = e.clientX; ly = e.clientY; this._updateCamera();
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cam.radius = clamp(this.cam.radius + e.deltaY * 0.02, 10, 90);
      this._updateCamera();
    }, { passive: false });
  }

  setView(preset) {
    if (preset === 'top') this.cam = { radius: 34, theta: Math.PI / 2, phi: 0.05, target: new THREE.Vector3(0, 0, -1) };
    else if (preset === 'front') this.cam = { radius: 34, theta: Math.PI / 2, phi: 1.45, target: new THREE.Vector3(0, 5, 0) };
    else this.cam = { radius: 28, theta: Math.PI / 2, phi: 1.02, target: new THREE.Vector3(0, 2.5, 0) };
    this._updateCamera();
  }

  applyTheme(name) {
    const t = THEMES[name] || THEMES.stage;
    this.themeName = name;
    this.scene.background = new THREE.Color(t.bg);
    this.scene.fog = t.fog > 0 ? new THREE.FogExp2(t.bg, t.fog) : null;
    this.floorMat.color.setHex(t.floor);
    if (this.grid) this.scene.remove(this.grid);
    this.grid = new THREE.GridHelper(44, 22, t.grid1, t.grid2);
    this.grid.position.y = 0.01; this.scene.add(this.grid);
    this.wallMat.color.setHex(t.wall);
    this.trussMat.color.setHex(t.truss);
    this.hemi.color.setHex(t.hemi[0]); this.hemi.groundColor.setHex(t.hemi[1]); this.hemi.intensity = t.hemi[2];
    this.amb.intensity = t.amb;
    this.bodyMatColor = t.body;
    for (const rig of this.rigs.values()) { rig.bodyMat.color.setHex(t.body); this._regenLabel(rig); }
  }

  toggleTheme() { this.applyTheme(this.themeName === 'stage' ? 'design' : 'stage'); }

  syncFixtures(show) {
    for (const [id, rig] of this.rigs) {
      if (!show.fixtures.has(id)) {
        this.scene.remove(rig.group);
        rig.pools.forEach((p) => this.scene.remove(p));
        this.scene.remove(rig.label);
        this.rigs.delete(id);
      }
    }
    for (const fx of show.fixtures.values()) {
      if (!this.rigs.has(fx.fixtureId)) this.rigs.set(fx.fixtureId, this._makeRig(fx));
      else {
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

    // 클램프 + 행거
    const clamp_ = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 12), this.trussMat);
    clamp_.position.y = 0.55; clamp_.rotation.x = Math.PI / 2; group.add(clamp_);
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), bodyMat);
    hanger.position.y = 0.28; group.add(hanger);

    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), lensMat);
    const beamLen = 14;
    const beamGeo = new THREE.ConeGeometry(1.4, beamLen, 24, 1, true);
    beamGeo.translate(0, -beamLen / 2, 0);
    const beam = new THREE.Mesh(beamGeo, beamMat);

    if (type.geometry === 'movingHead') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.7), bodyMat); group.add(base);
      const yoke = new THREE.Group(); yoke.position.y = -0.25; group.add(yoke);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.1), bodyMat);
      const armL = arm.clone(); armL.position.set(-0.32, -0.3, 0); yoke.add(armL);
      const armR = arm.clone(); armR.position.set(0.32, -0.3, 0); yoke.add(armR);
      const head = new THREE.Group();
      const headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.33, 0.66, 14), bodyMat);
      headMesh.position.y = -0.5; head.add(headMesh);
      const lensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 14), this.trussMat);
      lensRing.position.y = -0.84; head.add(lensRing);
      beam.position.y = -0.86; lens.position.y = -0.86; head.add(beam); head.add(lens);
      head.position.y = -0.3; yoke.add(head);
      group.userData.yoke = yoke; group.userData.head = head;
    } else if (type.geometry === 'bar') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.32), bodyMat);
      body.position.y = -0.25; group.add(body);
      beam.position.y = -0.4; lens.position.y = -0.4; group.add(beam); group.add(lens);
    } else {
      const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 6, 16, Math.PI), bodyMat);
      bracket.position.y = -0.1; group.add(bracket);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.62, 16), bodyMat);
      body.position.y = -0.42; group.add(body);
      const lensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), this.trussMat);
      lensRing.position.y = -0.74; group.add(lensRing);
      beam.position.y = -0.74; lens.position.y = -0.74; group.add(beam); group.add(lens);
    }

    this.scene.add(group);

    // 풀 3개(프리즘 분할용). 0=메인
    const pools = [];
    for (let i = 0; i < 3; i++) {
      const pm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 28), pm);
      pool.rotation.x = -Math.PI / 2; pool.position.y = 0.02; pool.visible = false;
      this.scene.add(pool); pools.push(pool);
    }

    const rig = {
      group, beam, beamMat, lens, lensMat, pools, bodyMat, type, fx,
      label: null,
      target: { dim: 0, color: { r: 1, g: 1, b: 1 }, pan: 0, tilt: 0, ptspeed: 100, zoom: 22, iris: 100, focus: 50, frost: 0, gobo: 0, goboRot: 0, prism: 0, shutter: 0 },
      cur: { pan: 0, tilt: 0, goboPhase: 0 },
      _goboKey: '',
    };
    rig.label = this._makeLabel(fx);
    rig.label.position.set(fx.position.x, fx.position.y + 0.9, fx.position.z);
    this.scene.add(rig.label);
    return rig;
  }

  _labelText(fx) { return `${fx.fixtureId}`; }
  _makeLabel(fx) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: true }));
    sp.scale.set(2.0, 1.0, 1); sp.userData.fx = fx; this._paintLabel(sp); return sp;
  }
  _regenLabel(rig) { if (rig.label) this._paintLabel(rig.label); }
  _paintLabel(sprite) {
    const fx = sprite.userData.fx, t = THEMES[this.themeName];
    const c = document.createElement('canvas'); c.width = 160; c.height = 80;
    const ctx = c.getContext('2d');
    ctx.fillStyle = t.label;
    const w = 150, h = 52, x = 5, y = 14, rr = 12;
    ctx.beginPath(); ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath(); ctx.fill();
    ctx.fillStyle = t.labelText; ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this._labelText(fx), 80, 41);
    const tex = new THREE.CanvasTexture(c);
    if (sprite.material.map) sprite.material.map.dispose();
    sprite.material.map = tex; sprite.material.needsUpdate = true;
  }

  /** 출력값 → 각 rig 의 target 설정(실제 적용은 _animate 에서 슬루/점멸 반영). */
  update(show, values) {
    for (const [id, rig] of this.rigs) {
      const v = values.get(id);
      if (!v) continue;
      const t = rig.target;
      t.dim = (v.Dimmer ?? 0) / 100;
      t.color = resolveColor(rig.fx.type, v);
      t.pan = v.Pan ?? 0;
      t.tilt = v.Tilt ?? 0;
      t.ptspeed = v.PTSpeed ?? 100;
      t.zoom = v.Zoom ?? (rig.type.beamFixed ?? 22);
      t.iris = v.Iris ?? 100;
      t.focus = v.Focus ?? 50;
      t.frost = v.Frost ?? 0;
      t.gobo = v.Gobo ?? 0;
      t.goboRot = v.GoboRot ?? 0;
      t.prism = v.Prism ?? 0;
      t.shutter = v.Shutter ?? 0;
    }
  }

  _animate() {
    requestAnimationFrame(this._animate);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._lastT) / 1000);
    this._lastT = now;
    for (const rig of this.rigs.values()) this._applyRig(rig, dt, now);
    this.renderer.render(this.scene, this.camera);
  }

  _applyRig(rig, dt, now) {
    const t = rig.target, cur = rig.cur;

    // 이동속도 슬루
    const speed = clamp(t.ptspeed / 100, 0, 1);
    const rate = lerp(50, 1400, speed) * dt; // deg/frame
    cur.pan = approach(cur.pan, t.pan, rate);
    cur.tilt = approach(cur.tilt, t.tilt, rate);
    if (rig.type.geometry === 'movingHead') {
      rig.group.userData.yoke.rotation.y = deg(cur.pan);
      rig.group.userData.head.rotation.x = deg(cur.tilt);
    }

    // 스트로브 게이트
    let gate = 1;
    if (t.shutter > 2) {
      const freq = lerp(1, 16, t.shutter / 100);
      gate = (Math.sin(now * 0.001 * freq * Math.PI * 2) > 0) ? 1 : 0.04;
    }
    const dim = t.dim * gate;

    // 색
    rig.beamMat.color.setRGB(t.color.r, t.color.g, t.color.b);
    rig.lensMat.color.setRGB(t.color.r, t.color.g, t.color.b);

    // 줌 + 아이리스 → 빔 굵기
    const zoomN = clamp((t.zoom - 4) / (55 - 4), 0, 1);
    const irisN = clamp(t.iris / 100, 0.15, 1);
    const spread = lerp(0.35, 2.4, zoomN) * irisN;
    rig.beam.scale.set(spread, 1, spread);

    // 프로스트 → 빔 더 번지고 옅게
    const frostN = t.frost / 100;
    rig.beamMat.opacity = dim * lerp(0.62, 0.4, frostN);
    rig.lensMat.opacity = Math.min(1, dim * 1.4);
    rig.lens.scale.setScalar(0.6 + dim * 0.9);

    // 고보 회전 위상
    cur.goboPhase += (t.goboRot / 100) * dt * 3;

    // 풀 텍스처(고보+가장자리) 갱신 — 키가 바뀔 때만
    const blur = Math.round(frostN * 7 + Math.max(0, (50 - t.focus)) * 0.06);
    const edge = clamp(t.focus / 100, 0, 1); // 선명도(높을수록 또렷한 가장자리)
    const goboIdx = Math.floor((t.gobo / 100) * 6.99);
    const key = `${goboIdx}|${blur}|${Math.round(edge * 5)}`;
    if (key !== rig._goboKey) {
      const tex = this._poolTexture(goboIdx, blur, edge);
      rig.pools.forEach((p) => { p.material.map = tex; p.material.needsUpdate = true; });
      rig._goboKey = key;
    }

    // 풀 색/투명/회전
    const poolOpacity = Math.min(0.95, dim * lerp(1.0, 0.7, frostN));
    rig.pools.forEach((p) => {
      p.material.color.setRGB(t.color.r, t.color.g, t.color.b);
      p.material.opacity = poolOpacity;
      if (p.material.map) { p.material.map.center.set(0.5, 0.5); p.material.map.rotation = cur.goboPhase; }
    });

    // 풀 위치/프리즘
    this._placePools(rig, spread, t.prism);
  }

  _placePools(rig, spread, prism) {
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
    if (Math.abs(dir.y) < 0.02) { rig.pools.forEach((p) => p.visible = false); return; }
    const dist = -origin.y / dir.y;
    if (dist <= 0) { rig.pools.forEach((p) => p.visible = false); return; }
    const hx = origin.x + dir.x * dist, hz = origin.z + dir.z * dist;
    const s = clamp(dist / 12, 0.6, 1.8) * spread;

    const on = prism > 50;
    const count = on ? 3 : 1;
    const sep = on ? s * 1.1 : 0;
    for (let i = 0; i < 3; i++) {
      const p = rig.pools[i];
      if (i >= count) { p.visible = false; continue; }
      p.visible = true;
      const ang = (i / count) * Math.PI * 2;
      p.position.set(hx + Math.cos(ang) * sep, 0.02 + i * 0.001, hz + Math.sin(ang) * sep);
      p.scale.set(s, s, s);
    }
  }

  /** 풀/고보 텍스처(흰색 패턴; 색은 머티리얼 color 로 틴트). */
  _poolTexture(goboIdx, blurPx, edge) {
    const key = `t${goboIdx}|${blurPx}|${Math.round(edge * 5)}`;
    if (this._goboCache.has(key)) return this._goboCache.get(key);
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;
    // 부드러운 원형 그라디언트(가장자리 선명도 = edge)
    const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2 - 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(clamp(0.55 + edge * 0.4, 0.5, 0.96), 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.fill();
    // 고보 패턴을 알파 마스크로 적용
    if (goboIdx > 0) {
      const mask = this._goboPattern(goboIdx, S);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.filter = blurPx > 0 ? `blur(${Math.max(1, blurPx)}px)` : 'none';
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
    const tex = new THREE.CanvasTexture(c);
    tex.center = new THREE.Vector2(0.5, 0.5);
    this._goboCache.set(key, tex);
    return tex;
  }

  /** 고보 패턴 마스크 캔버스(흰=통과). */
  _goboPattern(idx, S) {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    const cx = S / 2, cy = S / 2;
    if (idx === 1) { // breakup(잎/조각)
      for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * S * 0.42; x.beginPath(); x.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 6 + Math.random() * 12, 4 + Math.random() * 8, a, 0, Math.PI * 2); x.fill(); }
    } else if (idx === 2) { // dots
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { x.beginPath(); x.arc(cx + i * 16, cy + j * 16, 5, 0, Math.PI * 2); x.fill(); }
    } else if (idx === 3) { // stripes
      for (let i = -4; i <= 4; i++) x.fillRect(cx + i * 14 - 4, 0, 8, S);
    } else if (idx === 4) { // radial spokes
      x.translate(cx, cy); for (let i = 0; i < 12; i++) { x.rotate(Math.PI / 6); x.fillRect(-3, 0, 6, S / 2); } x.setTransform(1, 0, 0, 1, 0, 0);
    } else if (idx === 5) { // triangles ring
      x.translate(cx, cy); for (let i = 0; i < 8; i++) { x.rotate(Math.PI / 4); x.beginPath(); x.moveTo(0, -S * 0.4); x.lineTo(10, -S * 0.25); x.lineTo(-10, -S * 0.25); x.closePath(); x.fill(); } x.setTransform(1, 0, 0, 1, 0, 0);
    } else { // stars / concentric
      for (let r = S * 0.42; r > 6; r -= 14) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.lineWidth = 5; x.strokeStyle = '#fff'; x.stroke(); }
    }
    return c;
  }

  // ── 무대 모형(세트) 가져오기 ──
  loadSceneryOBJ(text) { this._setScenery(new OBJLoader().parse(text)); }
  loadSceneryGLTF(data) { new GLTFLoader().parse(data, '', (g) => this._setScenery(g.scene), (e) => console.error('glTF', e)); }
  clearScenery() { if (this.scenery) { this.scene.remove(this.scenery); this.scenery = null; } }
  _setScenery(object3d) {
    this.clearScenery();
    const box = new THREE.Box3().setFromObject(object3d);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 22 / maxDim;
    object3d.scale.setScalar(scale);
    object3d.position.sub(center.multiplyScalar(scale));
    const box2 = new THREE.Box3().setFromObject(object3d);
    object3d.position.y -= box2.min.y;
    object3d.traverse((c) => { if (c.isMesh && c.material) c.material.side = THREE.DoubleSide; });
    this.scenery = object3d; this.scene.add(object3d);
  }

  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
}

function approach(curV, targetV, step) {
  const d = targetV - curV;
  if (Math.abs(d) <= step) return targetV;
  return curV + Math.sign(d) * step;
}
