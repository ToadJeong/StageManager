/**
 * patchView.js
 * 패치(Patch) 화면 — 픽스처 추가/삭제, DMX 주소 확인, 충돌 경고.
 *
 * MA3 객체구조에 맞춰 Fixture ID / Type / Universe / Address / Footprint 를 다룬다.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { FixtureLibrary } from '../engine/fixtureLibrary.js';
import { reflowPositions } from '../engine/layout.js';
import { bi, tt, toast } from '../i18n.js';

export class PatchView {
  constructor(show, el) {
    this.show = show;
    this.el = el;
    bus.on(EVT.PATCH_CHANGED, () => this.render());
    bus.on(EVT.SHOW_LOADED, () => this.render());
  }

  _nextFreeAddress(universe, footprint) {
    // universe 안에서 footprint 가 들어갈 가장 낮은 빈 주소
    for (let addr = 1; addr + footprint - 1 <= 512; addr++) {
      if (!this.show.addressConflicts(universe, addr, footprint)) return addr;
    }
    return 1;
  }

  render() {
    const typeOpts = Object.values(FixtureLibrary).map((t) =>
      `<option value="${t.id}">${tt(t.name)} (${t.footprint}ch)</option>`).join('');

    const rows = [...this.show.fixtures.values()]
      .sort((a, b) => a.fixtureId - b.fixtureId)
      .map((fx) => {
        const t = FixtureLibrary[fx.type];
        const conflict = this.show.addressConflicts(fx.universe, fx.address, t.footprint, fx.fixtureId);
        const range = `${fx.address}–${fx.address + t.footprint - 1}`;
        return `
          <tr class="${conflict ? 'conflict' : ''}">
            <td>${fx.fixtureId}</td>
            <td>${fx.name}</td>
            <td>${t.short}</td>
            <td>${fx.universe}</td>
            <td>${range}${conflict ? ` ⚠︎(↔${conflict})` : ''}</td>
            <td><button class="unpatch" data-id="${fx.fixtureId}">✕</button></td>
          </tr>`;
      }).join('');

    this.el.innerHTML = `
      <div class="patch-form">
        <h2>${bi('패치 / Patch')}</h2>
        <div class="patch-controls">
          <label>${bi('타입', 'Type')}<select id="p-type">${typeOpts}</select></label>
          <label>${bi('수량', 'Qty')}<input id="p-qty" type="number" min="1" max="64" value="4"></label>
          <label>${bi('유니버스', 'Universe')}<input id="p-uni" type="number" min="1" max="8" value="1"></label>
          <label>${bi('시작 주소', 'Start addr')}<input id="p-addr" type="number" min="1" max="512" placeholder="auto"></label>
          <button id="p-add" class="primary">${bi('추가', 'Add')}</button>
          <button id="p-demo">${bi('데모 리셋', 'Demo reset')}</button>
        </div>
        <p class="hint-line">${bi('주소를 비우면 빈 자리에 자동 배치됩니다.', 'Leave address empty to auto-assign.')}</p>
      </div>
      <table class="patch-table">
        <thead><tr>
          <th>FID</th><th>${bi('이름', 'Name')}</th><th>${bi('타입', 'Type')}</th>
          <th>Uni</th><th>${bi('주소(Address)', 'Address')}</th><th></th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="empty-note">${bi('픽스처 없음', 'No fixtures')}</td></tr>`}</tbody>
      </table>`;

    this.el.querySelector('#p-add').onclick = () => this._add();
    this.el.querySelector('#p-demo').onclick = () => {
      import('../engine/layout.js').then((m) => { m.buildDemoShow(this.show); bus.emit(EVT.PATCH_CHANGED, {}); bus.emit(EVT.OUTPUT_CHANGED, {}); });
    };
    this.el.querySelectorAll('.unpatch').forEach((b) =>
      b.onclick = () => this.show.unpatchFixture(parseInt(b.dataset.id, 10)));
  }

  _add() {
    const typeId = this.el.querySelector('#p-type').value;
    const qty = Math.max(1, parseInt(this.el.querySelector('#p-qty').value, 10) || 1);
    const uni = Math.max(1, parseInt(this.el.querySelector('#p-uni').value, 10) || 1);
    const addrInput = this.el.querySelector('#p-addr').value;
    const type = FixtureLibrary[typeId];

    let addr = addrInput ? parseInt(addrInput, 10) : this._nextFreeAddress(uni, type.footprint);
    let nextId = Math.max(0, ...this.show.fixtures.keys()) + 1;

    for (let i = 0; i < qty; i++) {
      if (addr + type.footprint - 1 > 512) { toast({ ko: '유니버스 채널 초과', en: 'Universe overflow' }, 'err'); break; }
      this.show.patchFixture({ fixtureId: nextId++, type: typeId, universe: uni, address: addr });
      addr += type.footprint;
    }
    reflowPositions(this.show);
    bus.emit(EVT.PATCH_CHANGED, {});
    bus.emit(EVT.OUTPUT_CHANGED, {});
    toast({ ko: `${qty}개 패치됨`, en: `Patched ${qty}` });
  }
}
