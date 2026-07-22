/**
 * encoderBar.js
 * 인코더 바 — 선택된 픽스처의 어트리뷰트를 Feature Group 단위로 조절.
 *
 * - 상단 탭: Dimmer / Position / Color / Gobo / Beam (실제 MA3 Preset Type)
 * - 각 인코더: 위/아래 버튼, 세로 드래그, 직접 입력으로 값 조절.
 * - 조절 시 선택된 모든 픽스처의 프로그래머에 절대값으로 기록.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { FixtureLibrary, FEATURE_ORDER, getAttrDef } from '../engine/fixtureLibrary.js';
import { bi } from '../i18n.js';

export class EncoderBar {
  constructor(show, el) {
    this.show = show;
    this.el = el;
    this.feature = 'Dimmer';
    this.values = new Map();
    this.dragging = false;

    bus.on(EVT.SELECTION_CHANGED, () => this.render());
    bus.on(EVT.PROGRAMMER_CHANGED, () => { if (!this.dragging) this.render(); });
    bus.on(EVT.SHOW_LOADED, () => this.render());
  }

  update(values) { this.values = values; }

  /** 선택된 픽스처들에서 현재 feature 에 속한 어트리뷰트 목록(이름 기준 합집합). */
  _attrsForFeature() {
    const seen = new Map();
    for (const id of this.show.selection) {
      const fx = this.show.getFixture(id);
      if (!fx) continue;
      for (const a of FixtureLibrary[fx.type].attributes) {
        if (a.feature === this.feature && !seen.has(a.name)) seen.set(a.name, a);
      }
    }
    return [...seen.values()];
  }

  /** 대표 현재값(선택 중 첫 번째에서 프로그래머값 우선, 없으면 출력/홈). */
  _currentValue(attrName) {
    for (const id of this.show.selection) {
      const pv = this.show.getProgrammerValue(id, attrName);
      if (pv !== undefined) return pv;
    }
    for (const id of this.show.selection) {
      const v = this.values.get(id);
      if (v && v[attrName] !== undefined) return v[attrName];
    }
    return 0;
  }

  _setValue(attrName, value) {
    this.show.setProgrammerAttr(attrName, value);
  }

  render() {
    const tabs = FEATURE_ORDER.map((f) =>
      `<button class="enc-tab ${f === this.feature ? 'active' : ''}" data-feature="${f}">${f}</button>`).join('');

    const attrs = this._attrsForFeature();
    let encoders;
    if (!this.show.selection.length) {
      encoders = `<div class="empty-note">${bi('픽스처를 먼저 선택하세요', 'Select fixtures first')}</div>`;
    } else if (!attrs.length) {
      encoders = `<div class="empty-note">${bi('이 그룹에 조절할 항목이 없습니다', 'No attributes in this group')}</div>`;
    } else {
      encoders = attrs.map((a) => {
        const val = this._currentValue(a.name);
        const isColor = a.color;
        const swatch = isColor ? ` style="--enc-col:${this._colorFor(a.name, val)}"` : '';
        return `
          <div class="encoder ${isColor ? 'is-color' : ''}" data-attr="${a.name}"${swatch}>
            <div class="enc-label">${a.encoderLabel}</div>
            <div class="enc-knob" data-attr="${a.name}">
              <div class="enc-dot" style="transform:rotate(${this._dotDeg(a, val)}deg)"></div>
              <div class="enc-val">${this._fmt(a, val)}</div>
            </div>
            <div class="enc-btns">
              <button class="enc-up" data-attr="${a.name}">▲</button>
              <button class="enc-dn" data-attr="${a.name}">▼</button>
            </div>
          </div>`;
      }).join('');
    }

    this.el.innerHTML = `
      <div class="enc-tabs">${tabs}</div>
      <div class="enc-list">${encoders}</div>`;

    // 탭
    this.el.querySelectorAll('.enc-tab').forEach((b) => {
      b.onclick = () => { this.feature = b.dataset.feature; this.render(); };
    });
    // 버튼
    this.el.querySelectorAll('.enc-up').forEach((b) => b.onclick = () => this._nudge(b.dataset.attr, +1));
    this.el.querySelectorAll('.enc-dn').forEach((b) => b.onclick = () => this._nudge(b.dataset.attr, -1));
    // 드래그
    this.el.querySelectorAll('.enc-knob').forEach((k) => this._bindDrag(k));
  }

  _defOf(attrName) {
    const fx = this.show.getFixture(this.show.selection[0]);
    return fx ? getAttrDef(fx.type, attrName) : null;
  }

  _step(attrName) {
    const def = this._defOf(attrName);
    if (!def) return 1;
    return (def.max - def.min) > 50 ? 5 : 1; // 큰 범위(Pan 등)는 5단위
  }

  /** 무한회전 인코더: 선택된 각 픽스처의 현재값에 delta(어트리뷰트 단위)를 더한다. */
  _applyDelta(attrName, delta) {
    for (const id of this.show.selection) {
      const fx = this.show.getFixture(id);
      if (!fx) continue;
      const def = getAttrDef(fx.type, attrName);
      if (!def) continue;
      const base = this.show.getProgrammerValue(id, attrName)
        ?? this.values.get(id)?.[attrName]
        ?? def.home;
      this.show.setProgrammerAttr(attrName, Math.round((base + delta) * 10) / 10, [id]);
    }
  }

  _nudge(attrName, dir) {
    this._applyDelta(attrName, dir * this._step(attrName));
    this._refreshKnob(attrName);
  }

  _bindDrag(knob) {
    const attrName = knob.dataset.attr;
    let lastY = 0;
    const onMove = (e) => {
      const dy = lastY - e.clientY; // 위로 = 증가 (상대값)
      lastY = e.clientY;
      const def = this._defOf(attrName);
      const span = def ? (def.max - def.min) : 100;
      this._applyDelta(attrName, (dy / 120) * span); // 120px ≈ 풀레인지/회전
      this._refreshKnob(attrName);
    };
    const onUp = () => {
      this.dragging = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.render();
    };
    knob.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.dragging = true;
      lastY = e.clientY;
      this.show.pushUndo(); // 드래그 제스처 1회 = Undo 1단계
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  /** 드래그 중 값/인디케이터만 가볍게 갱신(전체 재렌더 없이). */
  _refreshKnob(attrName) {
    const enc = this.el.querySelector(`.encoder[data-attr="${attrName}"]`);
    if (!enc) return;
    const def = this._defOf(attrName);
    const val = this._currentValue(attrName);
    const valEl = enc.querySelector('.enc-val');
    const dot = enc.querySelector('.enc-dot');
    if (valEl) valEl.textContent = this._fmt(def, val);
    if (dot) dot.style.transform = `rotate(${this._dotDeg(def, val)}deg)`;
  }

  _dotDeg(def, val) {
    if (!def) return -135;
    const f = (val - def.min) / ((def.max - def.min) || 1);
    return -135 + Math.max(0, Math.min(1, f)) * 270; // -135°~+135°
  }

  _fmt(def, val) {
    if (!def) return Math.round(val);
    const unit = def.unit || '';
    if (def.name === 'Gobo') return `G${Math.round(val)}`;
    return `${Math.round(val)}${unit}`;
  }

  _colorFor(attrName, val) {
    // 색 인코더 스와치 (단일 채널 강도 표현)
    const c = Math.round(val * 2.55);
    if (attrName.endsWith('_R')) return `rgb(${c},0,0)`;
    if (attrName.endsWith('_G')) return `rgb(0,${c},0)`;
    if (attrName.endsWith('_B')) return `rgb(0,0,${c})`;
    return '#888';
  }
}
