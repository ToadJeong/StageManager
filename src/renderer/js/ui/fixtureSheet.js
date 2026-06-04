/**
 * fixtureSheet.js
 * 픽스처 시트 — 각 픽스처의 현재 값을 타일로 보여준다.
 *
 * - Dimmer 값을 크게, 색 스와치와 Pan/Tilt 를 작게 표시.
 * - 값의 출처(source)에 따라 색을 다르게:
 *     programmer = 빨강(편집 중), cue = 초록(재생 중), home = 회색(기본).
 * - 타일 클릭 = 단일 선택, Ctrl/⌘+클릭 = 토글 추가.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { FixtureLibrary } from '../engine/fixtureLibrary.js';

export class FixtureSheet {
  constructor(show, el) {
    this.show = show;
    this.el = el;
    this.values = new Map();
    this.sources = new Map();

    el.addEventListener('click', (e) => {
      const tile = e.target.closest('.fx-tile');
      if (!tile) return;
      const id = parseInt(tile.dataset.id, 10);
      if (e.ctrlKey || e.metaKey) {
        if (this.show.selection.includes(id)) this.show.removeFromSelection([id]);
        else this.show.addToSelection([id]);
      } else {
        this.show.setSelection([id]);
      }
    });

    bus.on(EVT.SELECTION_CHANGED, () => this.render());
    bus.on(EVT.PATCH_CHANGED, () => this.render());
    bus.on(EVT.SHOW_LOADED, () => this.render());
  }

  update(values, sources) {
    this.values = values;
    this.sources = sources;
    this.render();
  }

  render() {
    const sel = new Set(this.show.selection);
    const tiles = [];
    const ids = [...this.show.fixtures.keys()].sort((a, b) => a - b);
    for (const id of ids) {
      const fx = this.show.fixtures.get(id);
      const type = FixtureLibrary[fx.type];
      const v = this.values.get(id) || {};
      const s = this.sources.get(id) || {};

      const dim = Math.round(v.Dimmer ?? 0);
      const dimSrc = s.Dimmer || 'home';

      const r = Math.round((v.ColorRGB_R ?? 100) * 2.55);
      const g = Math.round((v.ColorRGB_G ?? 100) * 2.55);
      const b = Math.round((v.ColorRGB_B ?? 100) * 2.55);
      const hasColor = type.attributes.some((a) => a.color);
      const swatch = hasColor
        ? `<span class="fx-swatch" style="background:rgb(${r},${g},${b})"></span>` : '';

      const pos = (v.Pan !== undefined || v.Tilt !== undefined)
        ? `<span class="fx-pt">P${Math.round(v.Pan ?? 0)} / T${Math.round(v.Tilt ?? 0)}</span>` : '';

      tiles.push(`
        <div class="fx-tile ${sel.has(id) ? 'selected' : ''}" data-id="${id}">
          <div class="fx-top"><span class="fx-id">${id}</span><span class="fx-type">${type.short}</span></div>
          <div class="fx-dim src-${dimSrc}">${dim}<small>%</small></div>
          <div class="fx-bottom">${swatch}${pos}</div>
        </div>`);
    }
    this.el.innerHTML = tiles.join('') ||
      `<div class="empty-note">패치된 픽스처가 없습니다 · No fixtures patched</div>`;
  }
}
