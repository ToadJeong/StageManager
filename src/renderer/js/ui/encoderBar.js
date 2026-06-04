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

  _step(attrName) {
    const fx = this.show.getFixture(this.show.selection[0]);
    const def = fx ? getAttrDef(fx.type, attrName) : null;
    if (!def) return 1;
    const span = def.max - def.min;
    return span > 50 ? 5 : 1; // 큰 범위(Pan 등)는 5단위
  }

  _nudge(attrName, dir) {
    const cur = this._currentValue(attrName);
    this._setValue(attrName, cur + dir * this._step(attrName));
  }

  _bindDrag(knob) {
    const attrName = knob.dataset.attr;
    let startY = 0, startVal = 0;
    const onMove = (e) => {
      const dy = startY - e.clientY;
      const fx = this.show.getFixture(this.show.selection[0]);
      const def = fx ? getAttrDef(fx.type, attrName) : null;
      const span = def ? (def.max - def.min) : 100;
      const newVal = startVal + (dy / 140) * span; // 140px 드래그 = 풀 레인지
      this._setValue(attrName, Math.round(newVal * 10) / 10);
      knob.querySelector('.enc-val').textContent = this._fmt(def, this._currentValue(attrName));
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
      startY = e.clientY;
      startVal = this._currentValue(attrName);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
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
