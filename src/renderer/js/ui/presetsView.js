/**
 * presetsView.js
 * 프리셋 풀(Preset Pools) — Feature 별 프리셋 저장/호출.
 *
 * - 빈 슬롯 클릭  = 현재 프로그래머의 해당 Feature 값을 그 슬롯에 저장(Store)
 * - 채워진 슬롯 클릭 = 선택된 픽스처에 적용(Recall)
 * - 슬롯의 ✕ = 삭제
 */
import { bus, EVT } from '../engine/eventBus.js';
import { FEATURE_ORDER, resolveColor } from '../engine/fixtureLibrary.js';
import { bi, toast } from '../i18n.js';

const SLOTS = 12;

export class PresetsView {
  constructor(show, el) {
    this.show = show;
    this.el = el;
    [EVT.PRESET_CHANGED, EVT.SHOW_LOADED].forEach((e) => bus.on(e, () => this.render()));
    this.render();
  }

  render() {
    const pools = FEATURE_ORDER.map((type) => {
      const pool = this.show.presets.get(type);
      const slots = [];
      for (let no = 1; no <= SLOTS; no++) {
        const p = pool && pool.get(no);
        if (p) {
          let sw = '';
          if (type === 'Color' && p.generic) {
            const c = resolveColor(null, p.generic);
            sw = `<span class="pr-sw" style="background:rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})"></span>`;
          }
          slots.push(`<div class="pr-slot filled" data-type="${type}" data-no="${no}">
              <button class="pr-del" data-type="${type}" data-no="${no}">✕</button>
              ${sw}<span class="pr-no">${no}</span><span class="pr-name">${p.name}</span></div>`);
        } else {
          slots.push(`<div class="pr-slot empty" data-type="${type}" data-no="${no}"><span class="pr-no">${no}</span></div>`);
        }
      }
      return `<div class="pr-pool">
          <div class="pr-pool-title">${type}</div>
          <div class="pr-grid">${slots.join('')}</div>
        </div>`;
    }).join('');

    this.el.innerHTML = `<div class="presets-wrap">
      <h2>${bi('프리셋 풀', 'Preset Pools')}</h2>
      <p class="hint-line">${bi('빈 슬롯 클릭=현재 프로그래머의 해당 항목 저장(Store), 채워진 슬롯 클릭=선택 픽스처에 적용(Recall). 커맨드: Store Preset Color 1 / Preset Color 1', 'Click empty=Store from programmer; click filled=Recall onto selection. Command: Store Preset Color 1 / Preset Color 1')}</p>
      ${pools}</div>`;

    this.el.querySelectorAll('.pr-del').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      this.show.deletePreset(b.dataset.type, parseInt(b.dataset.no, 10));
    });
    this.el.querySelectorAll('.pr-slot').forEach((s) => s.onclick = () => {
      const type = s.dataset.type, no = parseInt(s.dataset.no, 10);
      if (s.classList.contains('filled')) {
        if (!this.show.selection.length) { toast({ ko: '먼저 픽스처를 선택하세요', en: 'Select fixtures first' }, 'err'); return; }
        const r = this.show.recallPreset(type, no);
        toast(r.ok ? { ko: `${type} Preset ${no} 적용`, en: `Recalled ${type} Preset ${no}` } : { ko: '적용 실패', en: 'Recall failed' }, r.ok ? 'info' : 'err');
      } else {
        const r = this.show.storePreset(type, no);
        toast(r.ok ? { ko: `${type} Preset ${no} 저장`, en: `Stored ${type} Preset ${no}` }
          : { ko: `프로그래머에 ${type} 값이 없습니다`, en: `No ${type} values in programmer` }, r.ok ? 'info' : 'err');
      }
    });
  }
}
