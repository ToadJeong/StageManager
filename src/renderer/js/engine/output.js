/**
 * output.js
 * 최종 출력값 계산기 (+ 큐 페이드 보간).
 *
 * 우선순위(단순화한 MA3 모델):
 *   1) Programmer   — 라이브로 편집 중인 값 (최우선, LTP, 페이드 없음)
 *   2) Executor Cue — 재생 중인 익스큐터의 활성 큐 값.
 *                     · Go 시 이전 모습(fadeFrom) → 새 큐 값으로 fade 시간 동안 크로스페이드.
 *                     · Dimmer 계열은 HTP + 페이더 비율, 그 외는 LTP(버튼번호 큰 쪽 우선).
 *   3) Home         — 픽스처 타입의 기본값
 *
 * 시간 의존(페이드) 계산을 위해 now(ms) 를 받는다. 생략 시 현재 시각.
 */
import { FixtureLibrary, getAttrDef, toDmx } from './fixtureLibrary.js';

const lerp = (a, b, t) => a + (b - a) * t;

function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const m = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
  return m;
}

/**
 * 이펙트(Phaser) 한 개를 한 픽스처에 적용 — 시간 기반 파형.
 * kind: dimmerChase / rainbow / circle
 * 그룹 내 인덱스(idx)로 위상을 분산해 체이스/원형을 만든다.
 */
function applyEffect(out, src, typeId, kind, idx, count, now, rateBPM, size, srcTag) {
  const ph = (now / 1000) * ((rateBPM || 60) / 60) * 2 * Math.PI + idx * (2 * Math.PI / Math.max(1, count));
  const set = (attr, val) => {
    const def = getAttrDef(typeId, attr);
    if (!def) return;
    out[attr] = Math.max(def.min, Math.min(def.max, val));
    src[attr] = srcTag;
  };
  if (kind === 'dimmerChase') {
    set('Dimmer', (size ?? 100) * (0.5 + 0.5 * Math.sin(ph)));
  } else if (kind === 'rainbow') {
    const h = ((ph / (2 * Math.PI)) % 1 + 1) % 1;
    const [r, g, b] = hsvToRgb(h, 1, 1);
    set('ColorRGB_R', r * 100); set('ColorRGB_G', g * 100); set('ColorRGB_B', b * 100);
    set('Cyan', (1 - r) * 100); set('Magenta', (1 - g) * 100); set('Yellow', (1 - b) * 100);
  } else if (kind === 'circle') {
    const deg = (size ?? 100) * 0.5; // 0..50°
    set('Pan', deg * Math.cos(ph));
    set('Tilt', deg * 0.6 * Math.sin(ph));
  }
}

/** 익스큐터의 페이드 진행도 0..1. */
export function execProgress(exec, now) {
  if (!exec.fadeDur || exec.fadeDur <= 0) return 1;
  return Math.min(1, Math.max(0, (now - (exec.fadeStart || 0)) / (exec.fadeDur * 1000)));
}

/**
 * 익스큐터 하나의 현재 기여값(페이드 보간 적용, 페이더 미적용).
 * @returns {Object|null} fixtureId → { attrName: value }
 */
export function execContribution(show, exec, now) {
  if (!exec || !exec.on || exec.cueIndex < 0) return null;
  const seq = show.sequences.get(exec.sequenceId);
  if (!seq) return null;
  const cue = seq.cues[exec.cueIndex];
  if (!cue) return null;

  const p = execProgress(exec, now);
  const from = exec.fadeFrom || {};
  const res = {};

  for (const fx of show.fixtures.values()) {
    const fid = fx.fixtureId;
    const toV = cue.values[fid] || {};
    const frV = from[fid] || {};
    const names = new Set([...Object.keys(toV), ...Object.keys(frV)]);
    if (!names.size) continue;
    const o = {};
    for (const n of names) {
      const def = getAttrDef(fx.type, n);
      if (!def) continue;
      const a = frV[n] !== undefined ? frV[n] : def.home;
      const b = toV[n] !== undefined ? toV[n] : def.home;
      o[n] = lerp(a, b, p);
    }
    res[fid] = o;
  }
  return res;
}

/**
 * @param {import('./show.js').Show} show
 * @param {number} [now] performance.now() 기준 ms
 * @returns {{ values: Map<number, Object>, dmx: Map<number, Uint8Array>, sources: Map<number, Object> }}
 */
export function computeOutput(show, now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
  const values = new Map();
  const sources = new Map();

  // 익스큐터를 버튼번호 오름차순으로 — 큰 번호가 나중에 적용(LTP)
  const execs = [...show.executors.values()].sort((a, b) => a.buttonNo - b.buttonNo);
  const contribs = execs.map((e) => ({ exec: e, c: execContribution(show, e, now) }));

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
    for (const { exec, c } of contribs) {
      if (!c) continue;
      const cv = c[fx.fixtureId];
      if (!cv) continue;
      const faderRatio = exec.fader / 100;
      for (const attrName in cv) {
        const def = getAttrDef(fx.type, attrName);
        if (!def) continue;
        const val = cv[attrName];
        if (def.feature === 'Dimmer') {
          const scaled = val * faderRatio; // HTP + 페이더
          if (scaled >= (out[attrName] ?? 0)) {
            out[attrName] = scaled;
            src[attrName] = 'cue';
          }
        } else {
          out[attrName] = val; // LTP
          src[attrName] = 'cue';
        }
      }
    }

    // 2b) 익스큐터 큐에 저장된 이펙트(Phaser) 적용
    for (const { exec } of contribs) {
      if (!exec.on || exec.cueIndex < 0) continue;
      const seq = show.sequences.get(exec.sequenceId);
      const cue = seq && seq.cues[exec.cueIndex];
      if (!cue || !cue.effects) continue;
      for (const eff of cue.effects) {
        const idx = eff.fixtureIds.indexOf(fx.fixtureId);
        if (idx < 0) continue;
        applyEffect(out, src, fx.type, eff.kind, idx, eff.fixtureIds.length, now, eff.rateBPM, eff.size, 'cue');
      }
    }

    // 3) Programmer (Blind 모드면 라이브 출력에서 제외)
    const pm = show.programmer.get(fx.fixtureId);
    if (pm && !show.blind) {
      for (const attrName in pm) {
        out[attrName] = pm[attrName];
        src[attrName] = 'programmer';
      }
    }

    // 3b) 라이브 이펙트(Phaser) — 최우선
    for (const eff of show.effects) {
      const idx = eff.fixtureIds.indexOf(fx.fixtureId);
      if (idx < 0) continue;
      applyEffect(out, src, fx.type, eff.kind, idx, eff.fixtureIds.length, now, show.fxRateBPM, show.fxSize, 'effect');
    }

    // 4) 그랜드마스터(전체 디머 스케일)
    const gm = (show.grandMaster ?? 100) / 100;
    if (gm < 1 && out.Dimmer !== undefined) out.Dimmer *= gm;

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
      const ch = fx.address - 1 + a.offset;
      if (ch < 0 || ch >= 512) continue;
      buf[ch] = toDmx(a, out[a.name] ?? a.home);
    }
  }

  return { values, dmx, sources };
}
