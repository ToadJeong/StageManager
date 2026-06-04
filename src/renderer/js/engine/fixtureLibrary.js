/**
 * fixtureLibrary.js
 * 조명기구(픽스처) 타입 라이브러리.
 *
 * grandMA3 구조를 단순화해 모방한다:
 *   FixtureType  → Modules/Channels → Attributes
 * 각 Attribute 는 "물리값"(예: Pan -270~270°, Dimmer 0~100%)을 가지며,
 * DMX 출력 시 footprint 안의 채널(offset)로 8bit(0~255) 변환된다.
 *
 * Each attribute carries a natural/physical value and maps to one DMX channel
 * (offset within the fixture footprint) as an 8-bit value.
 *
 * feature: 인코더 바(Encoder Bar)에서 묶이는 Feature Group
 *   (Dimmer / Position / Color / Beam / Gobo ...) — 실제 MA3 의 Preset Type 과 유사.
 */

/**
 * @typedef {Object} AttributeDef
 * @property {string} name      어트리뷰트 이름 (MA3 표기, 예: 'Pan', 'Dimmer', 'ColorRGB_R')
 * @property {string} feature   Feature Group (Dimmer/Position/Color/Beam/Gobo)
 * @property {number} offset    footprint 내 DMX 채널 오프셋 (0부터)
 * @property {number} min       물리값 최소
 * @property {number} max       물리값 최대
 * @property {number} home      디폴트(홈) 물리값
 * @property {string} unit      표시 단위
 * @property {boolean} [color]  색상 채널 여부(R/G/B)
 */

function attr(name, feature, offset, opts = {}) {
  return {
    name,
    feature,
    offset,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    home: opts.home ?? 0,
    unit: opts.unit ?? '%',
    color: opts.color ?? false,
    encoderLabel: opts.encoderLabel ?? name,
  };
}

export const FixtureLibrary = {
  dimmer: {
    id: 'dimmer',
    name: { ko: '디머', en: 'Generic Dimmer' },
    short: 'DIM',
    footprint: 1,
    geometry: 'par',
    attributes: [
      attr('Dimmer', 'Dimmer', 0, { min: 0, max: 100, home: 0, unit: '%' }),
    ],
  },

  ledPar: {
    id: 'ledPar',
    name: { ko: 'LED 파라이트 (RGB)', en: 'LED PAR (RGB)' },
    short: 'PAR',
    footprint: 4,
    geometry: 'par',
    attributes: [
      attr('Dimmer', 'Dimmer', 0, { min: 0, max: 100, home: 0 }),
      attr('ColorRGB_R', 'Color', 1, { min: 0, max: 100, home: 100, color: true, encoderLabel: 'Red' }),
      attr('ColorRGB_G', 'Color', 2, { min: 0, max: 100, home: 100, color: true, encoderLabel: 'Green' }),
      attr('ColorRGB_B', 'Color', 3, { min: 0, max: 100, home: 100, color: true, encoderLabel: 'Blue' }),
    ],
  },

  movingHead: {
    id: 'movingHead',
    name: { ko: '무빙헤드 스팟', en: 'Moving Head Spot' },
    short: 'MH',
    footprint: 8,
    geometry: 'movingHead',
    attributes: [
      attr('Dimmer', 'Dimmer', 0, { min: 0, max: 100, home: 0 }),
      attr('Pan', 'Position', 1, { min: -270, max: 270, home: 0, unit: '°' }),
      attr('Tilt', 'Position', 2, { min: -135, max: 135, home: 0, unit: '°' }),
      attr('ColorRGB_R', 'Color', 3, { min: 0, max: 100, home: 100, color: true, encoderLabel: 'Red' }),
      attr('ColorRGB_G', 'Color', 4, { min: 0, max: 100, home: 100, color: true, encoderLabel: 'Green' }),
      attr('ColorRGB_B', 'Color', 5, { min: 0, max: 100, home: 100, color: true, encoderLabel: 'Blue' }),
      attr('Zoom', 'Beam', 6, { min: 6, max: 50, home: 22, unit: '°' }),
      attr('Gobo', 'Gobo', 7, { min: 0, max: 6, home: 0, unit: '' }),
    ],
  },

  strobe: {
    id: 'strobe',
    name: { ko: '스트로브 / 블라인더', en: 'Strobe / Blinder' },
    short: 'STR',
    footprint: 2,
    geometry: 'par',
    attributes: [
      attr('Dimmer', 'Dimmer', 0, { min: 0, max: 100, home: 0 }),
      attr('Shutter', 'Beam', 1, { min: 0, max: 100, home: 0, unit: 'Hz', encoderLabel: 'Strobe' }),
    ],
  },
};

/** 픽스처 타입의 어트리뷰트 정의를 이름으로 찾는다. */
export function getAttrDef(typeId, attrName) {
  const t = FixtureLibrary[typeId];
  if (!t) return null;
  return t.attributes.find((a) => a.name === attrName) || null;
}

/** 물리값 → DMX 8bit. */
export function toDmx(attrDef, value) {
  const { min, max } = attrDef;
  const span = max - min || 1;
  const norm = Math.max(0, Math.min(1, (value - min) / span));
  return Math.round(norm * 255);
}

/** 라이브러리에 존재하는 모든 Feature Group(인코더 바 탭 순서). */
export const FEATURE_ORDER = ['Dimmer', 'Position', 'Color', 'Gobo', 'Beam'];
