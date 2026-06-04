/**
 * output.js
 * 최종 출력값 계산기.
 *
 * 우선순위(단순화한 MA3 모델):
 *   1) Programmer   — 라이브로 편집 중인 값 (최우선, LTP)
 *   2) Executor Cue — 재생 중인 익스큐터의 활성 큐 값
 *                     · Dimmer 계열은 HTP(가장 밝은 값) + 페이더 비율
 *                     · 그 외(Position/Color/Beam)는 LTP(버튼번호 큰 쪽 우선)
 *   3) Home         — 픽스처 타입의 기본값
 *
 * 결과는 두 형태로 제공한다:
 *   - values: fixtureId → { attrName: 물리값 }   (3D 비주얼라이저/시트용)
 *   - dmx:    universe  → Uint8Array(512)        (DMX 시트용)
 */
import { FixtureLibrary, getAttrDef, toDmx } from './fixtureLibrary.js';

/**
 * @param {import('./show.js').Show} show
 * @returns {{ values: Map<number, Object>, dmx: Map<number, Uint8Array>, sources: Map<number, Object> }}
 */
export function computeOutput(show) {
  const values = new Map();
  const sources = new Map(); // fixtureId → { attrName: 'programmer'|'cue'|'home' } (셀 색상용)

  // 익스큐터를 버튼번호 오름차순으로 — 큰 번호가 나중에 적용(LTP)
  const execs = [...show.executors.values()].sort((a, b) => a.buttonNo - b.buttonNo);

  for (const fx of show.fixtures.values()) {
    const type = FixtureLibrary[fx.type];
    const out = {};
    const src = {};

    // 1) Home 기본값
    for (const a of type.attributes) {
      out[a.name] = a.home;
      src[a.name] = 'home';
    }

    // 2) 익스큐터 큐 적용
    for (const exec of execs) {
      if (!exec.on || exec.cueIndex < 0) continue;
      const seq = show.sequences.get(exec.sequenceId);
      if (!seq) continue;
      const cue = seq.cues[exec.cueIndex];
      if (!cue) continue;
      const cv = cue.values[fx.fixtureId];
      if (!cv) continue;
      const faderRatio = exec.fader / 100;
      for (const attrName in cv) {
        const def = getAttrDef(fx.type, attrName);
        if (!def) continue;
        const val = cv[attrName];
        if (def.feature === 'Dimmer') {
          // HTP + 페이더 비율
          const scaled = val * faderRatio;
          if (scaled >= (out[attrName] ?? 0)) {
            out[attrName] = scaled;
            src[attrName] = 'cue';
          }
        } else {
          // LTP — 큰 버튼번호가 마지막에 덮어씀
          out[attrName] = val;
          src[attrName] = 'cue';
        }
      }
    }

    // 3) Programmer (최우선)
    const pm = show.programmer.get(fx.fixtureId);
    if (pm) {
      for (const attrName in pm) {
        out[attrName] = pm[attrName];
        src[attrName] = 'programmer';
      }
    }

    values.set(fx.fixtureId, out);
    sources.set(fx.fixtureId, src);
  }

  // DMX 버퍼 생성
  const dmx = new Map();
  for (const fx of show.fixtures.values()) {
    const type = FixtureLibrary[fx.type];
    const out = values.get(fx.fixtureId);
    if (!dmx.has(fx.universe)) dmx.set(fx.universe, new Uint8Array(512));
    const buf = dmx.get(fx.universe);
    for (const a of type.attributes) {
      const ch = fx.address - 1 + a.offset; // DMX 주소는 1-base
      if (ch < 0 || ch >= 512) continue;
      buf[ch] = toDmx(a, out[a.name] ?? a.home);
    }
  }

  return { values, dmx, sources };
}
