/**
 * fixtureLibrary.js
 * 조명기구(픽스처) 타입 라이브러리 — 종류별 특성 포함.
 *
 * grandMA3 구조를 단순화해 모방:  FixtureType → Attributes → DMX 채널(offset)
 * 각 Attribute 는 "물리값"(Pan -270~270°, Zoom 5~50°, Frost 0~100% 등)을 가지며
 * DMX 출력 시 footprint 안의 채널로 8bit(0~255) 변환된다.
 *
 * 프로파일은 국내외 렌탈 현장에서 많이 쓰는 대표 기종군을 본뜬 "교육용 근사치"이다.
 * (실제 제조사 DMX 차트의 복제가 아니라 특성/채널 구성을 학습용으로 단순화)
 *
 * 구현 특성: Pan/Tilt + 이동속도, CMY/RGB/컬러휠, 고보(회전), 프리즘, 줌,
 *           포커스(선명도), 프로스트(가장자리 흐림), 아이리스, 스트로브(셔터).
 */

function attr(name, feature, offset, opts = {}) {
  return {
    name, feature, offset,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    home: opts.home ?? 0,
    unit: opts.unit ?? '%',
    color: opts.color ?? false,
    encoderLabel: opts.encoderLabel ?? name,
  };
}

// 공통 어트리뷰트 빌더(오프셋은 호출부에서 누적)
const A = {
  dim: (o) => attr('Dimmer', 'Dimmer', o, { min: 0, max: 100, home: 0 }),
  pan: (o) => attr('Pan', 'Position', o, { min: -270, max: 270, home: 0, unit: '°' }),
  tilt: (o) => attr('Tilt', 'Position', o, { min: -135, max: 135, home: 0, unit: '°' }),
  ptspeed: (o) => attr('PTSpeed', 'Control', o, { min: 0, max: 100, home: 100, unit: '%', encoderLabel: 'P/T Speed' }),
  r: (o) => attr('ColorRGB_R', 'Color', o, { min: 0, max: 100, home: 100, color: true, encoderLabel: 'Red' }),
  g: (o) => attr('ColorRGB_G', 'Color', o, { min: 0, max: 100, home: 100, color: true, encoderLabel: 'Green' }),
  b: (o) => attr('ColorRGB_B', 'Color', o, { min: 0, max: 100, home: 100, color: true, encoderLabel: 'Blue' }),
  cyan: (o) => attr('Cyan', 'Color', o, { min: 0, max: 100, home: 0, color: true, encoderLabel: 'Cyan' }),
  magenta: (o) => attr('Magenta', 'Color', o, { min: 0, max: 100, home: 0, color: true, encoderLabel: 'Magenta' }),
  yellow: (o) => attr('Yellow', 'Color', o, { min: 0, max: 100, home: 0, color: true, encoderLabel: 'Yellow' }),
  wheel: (o) => attr('ColorWheel', 'Color', o, { min: 0, max: 100, home: 0, unit: '', encoderLabel: 'Color Wheel' }),
  gobo: (o) => attr('Gobo', 'Gobo', o, { min: 0, max: 100, home: 0, unit: '', encoderLabel: 'Gobo' }),
  goborot: (o) => attr('GoboRot', 'Gobo', o, { min: -100, max: 100, home: 0, unit: '', encoderLabel: 'Gobo Rotate' }),
  zoom: (o, home = 20) => attr('Zoom', 'Beam', o, { min: 4, max: 55, home, unit: '°' }),
  focus: (o) => attr('Focus', 'Focus', o, { min: 0, max: 100, home: 50, unit: '%', encoderLabel: 'Focus(선명)' }),
  frost: (o) => attr('Frost', 'Focus', o, { min: 0, max: 100, home: 0, unit: '%', encoderLabel: 'Frost(흐림)' }),
  iris: (o) => attr('Iris', 'Beam', o, { min: 5, max: 100, home: 100, unit: '%', encoderLabel: 'Iris' }),
  prism: (o) => attr('Prism', 'Beam', o, { min: 0, max: 100, home: 0, unit: '', encoderLabel: 'Prism' }),
  shutter: (o) => attr('Shutter', 'Beam', o, { min: 0, max: 100, home: 0, unit: 'Hz', encoderLabel: 'Strobe' }),
};

export const FixtureLibrary = {
  dimmer: {
    id: 'dimmer', short: 'DIM', geometry: 'par',
    name: { ko: '컨벤셔널 디머', en: 'Generic Dimmer' },
    desc: { ko: '밝기만 제어하는 기본 기구(프로파일/프레넬 등).', en: 'Basic intensity-only fixture (profile/fresnel).' },
    attributes: [A.dim(0)],
  },

  ledPar: {
    id: 'ledPar', short: 'PAR', geometry: 'par',
    name: { ko: 'LED PAR (RGBW)', en: 'LED PAR (RGBW)' },
    desc: { ko: '가장 많이 쓰는 컬러 PAR. 색·밝기·스트로브.', en: 'Workhorse color PAR — color, intensity, strobe.' },
    attributes: [A.dim(0), A.r(1), A.g(2), A.b(3), A.shutter(4)],
  },

  ledBar: {
    id: 'ledBar', short: 'BAR', geometry: 'bar',
    name: { ko: 'LED 픽셀바 / 배튼', en: 'LED Pixel Bar / Batten' },
    desc: { ko: '띠 형태의 컬러 바. 백라이트·픽셀 효과.', en: 'Linear color batten for backlight/pixel looks.' },
    attributes: [A.dim(0), A.r(1), A.g(2), A.b(3), A.shutter(4)],
  },

  wash: {
    id: 'wash', short: 'WASH', geometry: 'movingHead',
    name: { ko: '무빙 워시 (Aura-class)', en: 'Moving Wash (Aura-class)' },
    desc: { ko: '부드러운 면 조명 무빙. 넓은 줌·빠른 이동.', en: 'Soft wide-beam mover — wide zoom, fast movement.' },
    attributes: [A.dim(0), A.pan(1), A.tilt(2), A.ptspeed(3), A.r(4), A.g(5), A.b(6), A.zoom(7, 35), A.shutter(8)],
  },

  beam: {
    id: 'beam', short: 'BEAM', geometry: 'movingHead',
    name: { ko: '빔 7R (Sharpy-class)', en: 'Beam 7R (Sharpy-class)' },
    desc: { ko: '아주 좁고 강한 빔. 컬러휠·고보·프리즘.', en: 'Razor-tight beam — color wheel, gobo, prism.' },
    attributes: [A.dim(0), A.pan(1), A.tilt(2), A.ptspeed(3), A.wheel(4), A.gobo(5), A.prism(6), A.frost(7), A.shutter(8)],
    beamFixed: 4, // 고정 빔각(좁음)
  },

  spot: {
    id: 'spot', short: 'SPOT', geometry: 'movingHead',
    name: { ko: '프로파일 스팟 (Viper/T1-class)', en: 'Profile Spot (Viper/T1-class)' },
    desc: { ko: 'CMY 색혼합 + 고보회전 + 포커스/아이리스/프로스트.', en: 'CMY mixing + rotating gobo + focus/iris/frost.' },
    attributes: [
      A.dim(0), A.pan(1), A.tilt(2), A.ptspeed(3),
      A.cyan(4), A.magenta(5), A.yellow(6), A.wheel(7),
      A.gobo(8), A.goborot(9), A.prism(10),
      A.zoom(11, 18), A.focus(12), A.iris(13), A.frost(14), A.shutter(15),
    ],
  },

  hybrid: {
    id: 'hybrid', short: 'HYB', geometry: 'movingHead',
    name: { ko: '하이브리드 (MegaPointe-class)', en: 'Hybrid (MegaPointe-class)' },
    desc: { ko: '빔·스팟·워시 겸용. 컬러휠+고보회전+프리즘.', en: 'Beam/spot/wash in one — wheel + rotating gobo + prism.' },
    attributes: [
      A.dim(0), A.pan(1), A.tilt(2), A.ptspeed(3),
      A.wheel(4), A.gobo(5), A.goborot(6), A.prism(7),
      A.zoom(8, 10), A.focus(9), A.iris(10), A.frost(11), A.shutter(12),
    ],
  },

  strobe: {
    id: 'strobe', short: 'STR', geometry: 'par',
    name: { ko: '스트로브/블라인더 (JDC1-class)', en: 'Strobe/Blinder (JDC1-class)' },
    desc: { ko: '강력한 섬광·블라인더. 색 가능.', en: 'Powerful strobe/blinder, color-capable.' },
    attributes: [A.dim(0), A.r(1), A.g(2), A.b(3), A.shutter(4)],
  },
};

// footprint(채널 수) 자동 계산
for (const t of Object.values(FixtureLibrary)) {
  t.footprint = Math.max(...t.attributes.map((a) => a.offset)) + 1;
}

/** 픽스처 타입의 어트리뷰트 정의를 이름으로 찾는다. */
export function getAttrDef(typeId, attrName) {
  const t = FixtureLibrary[typeId];
  if (!t) return null;
  return t.attributes.find((a) => a.name === attrName) || null;
}

export function hasAttr(typeId, attrName) {
  return !!getAttrDef(typeId, attrName);
}

/** 물리값 → DMX 8bit. */
export function toDmx(attrDef, value) {
  const { min, max } = attrDef;
  const span = max - min || 1;
  const norm = Math.max(0, Math.min(1, (value - min) / span));
  return Math.round(norm * 255);
}

/** 인코더 바 Feature Group 탭 순서. */
export const FEATURE_ORDER = ['Dimmer', 'Position', 'Color', 'Gobo', 'Beam', 'Focus', 'Control'];

// 컬러휠 팔레트(슬롯)
const WHEEL = [
  [1, 1, 1],     // open / white
  [1, 0.1, 0.1], // red
  [1, 0.5, 0],   // orange
  [1, 0.95, 0.2],// yellow
  [0.1, 1, 0.2], // green
  [0.1, 0.9, 1], // cyan
  [0.15, 0.3, 1],// blue
  [1, 0.2, 0.9], // magenta
];

/**
 * 픽스처의 출력값으로부터 화면 표시용 RGB(0..1) 계산.
 * RGB 직접 / CMY 감산혼합 / 컬러휠 슬롯 순으로 해석.
 */
export function resolveColor(typeId, v) {
  let r = 1, g = 1, b = 1;
  if (v.ColorRGB_R !== undefined) {
    r = (v.ColorRGB_R ?? 100) / 100; g = (v.ColorRGB_G ?? 100) / 100; b = (v.ColorRGB_B ?? 100) / 100;
  } else if (v.Cyan !== undefined) {
    r = 1 - (v.Cyan ?? 0) / 100; g = 1 - (v.Magenta ?? 0) / 100; b = 1 - (v.Yellow ?? 0) / 100;
  }
  // 컬러휠이 있고 open 이 아니면 해당 슬롯색을 곱한다
  if (v.ColorWheel !== undefined && v.ColorWheel > 3) {
    const idx = Math.min(WHEEL.length - 1, Math.floor((v.ColorWheel / 100) * WHEEL.length));
    const w = WHEEL[idx];
    r *= w[0]; g *= w[1]; b *= w[2];
  }
  return { r, g, b };
}
