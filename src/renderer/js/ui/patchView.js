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

        <div class="patch-import">
          <h3>${bi('라이트 도면 / 패치 리스트 가져오기', 'Import light plot / patch list')}</h3>
          <div class="patch-controls">
            <button id="p-import" class="primary">${bi('CSV 가져오기', 'Import CSV')}</button>
            <button id="p-template">${bi('CSV 템플릿 받기', 'Download template')}</button>
            <input id="p-file" type="file" accept=".csv,text/csv" hidden>
          </div>
          <p class="hint-line">
            ${bi('CSV 열: fixtureId, type, universe, address, x, y(=트림높이), z, name. (type: par / mh / dimmer / strobe)', 'CSV columns: fixtureId, type, universe, address, x, y(=trim height), z, name. (type: par / mh / dimmer / strobe)')}<br>
            ${bi('※ Vectorworks 등에서 패치/인스트루먼트 스케줄을 CSV(Excel)로 내보내 올리면 조명이 자동 등록됩니다. PDF·이미지 도면은 자동 인식되지 않으니 CSV 로 내보내 주세요.', '※ Export your patch / instrument schedule from Vectorworks as CSV and upload it to auto-register fixtures. PDF/image plots can’t be auto-read — export to CSV.')}
          </p>
        </div>
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

    this.el.querySelector('#p-import').onclick = () => this.el.querySelector('#p-file').click();
    this.el.querySelector('#p-template').onclick = () => this._downloadTemplate();
    this.el.querySelector('#p-file').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => this._importCSV(reader.result);
      reader.readAsText(file);
      e.target.value = '';
    };
  }

  // type 별칭 → 라이브러리 키
  _resolveType(raw) {
    const k = String(raw || '').trim().toLowerCase().replace(/[\s_-]/g, '');
    const map = {
      par: 'ledPar', ledpar: 'ledPar', led: 'ledPar', rgb: 'ledPar',
      mh: 'movingHead', moving: 'movingHead', movinghead: 'movingHead', spot: 'movingHead', mover: 'movingHead',
      dim: 'dimmer', dimmer: 'dimmer', conventional: 'dimmer', generic: 'dimmer',
      strobe: 'strobe', blinder: 'strobe', strob: 'strobe',
    };
    if (FixtureLibrary[raw]) return raw; // 정확한 키
    return map[k] || null;
  }

  _importCSV(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { toast({ ko: '빈 파일', en: 'Empty file' }, 'err'); return; }
    // 헤더 파싱
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = (name) => header.indexOf(name);
    const col = { id: idx('fixtureid'), type: idx('type'), uni: idx('universe'), addr: idx('address'), x: idx('x'), y: idx('y'), z: idx('z'), name: idx('name') };
    if (col.type < 0) { toast({ ko: 'CSV에 type 열이 필요합니다', en: 'CSV needs a "type" column' }, 'err'); return; }

    let added = 0, skipped = 0, hasPos = false;
    let nextId = Math.max(0, ...this.show.fixtures.keys()) + 1;
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim());
      const typeId = this._resolveType(cells[col.type]);
      if (!typeId) { skipped++; continue; }
      const type = FixtureLibrary[typeId];
      const fixtureId = col.id >= 0 && cells[col.id] ? parseInt(cells[col.id], 10) : nextId++;
      const universe = col.uni >= 0 && cells[col.uni] ? parseInt(cells[col.uni], 10) : 1;
      let address = col.addr >= 0 && cells[col.addr] ? parseInt(cells[col.addr], 10) : this._nextFreeAddress(universe, type.footprint);
      const opts = { fixtureId, type: typeId, universe, address, name: col.name >= 0 ? (cells[col.name] || undefined) : undefined };
      const hx = col.x >= 0 && cells[col.x] !== '' && cells[col.x] !== undefined;
      const hy = col.y >= 0 && cells[col.y] !== '' && cells[col.y] !== undefined;
      const hz = col.z >= 0 && cells[col.z] !== '' && cells[col.z] !== undefined;
      if (hx || hy || hz) {
        hasPos = true;
        opts.position = { x: hx ? parseFloat(cells[col.x]) : 0, y: hy ? parseFloat(cells[col.y]) : 9, z: hz ? parseFloat(cells[col.z]) : 0 };
      }
      this.show.patchFixture(opts);
      nextId = Math.max(nextId, fixtureId + 1);
      added++;
    }
    if (!hasPos) reflowPositions(this.show); // 위치(트림높이) 미지정 시 자동 배치
    bus.emit(EVT.PATCH_CHANGED, {});
    bus.emit(EVT.OUTPUT_CHANGED, {});
    toast({ ko: `${added}개 등록${skipped ? `, ${skipped}개 건너뜀` : ''}`, en: `Registered ${added}${skipped ? `, skipped ${skipped}` : ''}` });
  }

  _downloadTemplate() {
    const tmpl = [
      'fixtureId,type,universe,address,x,y,z,name',
      '1,par,1,1,-9,9,3,FOH PAR 1',
      '2,par,1,5,-7,9,3,FOH PAR 2',
      '11,mh,1,101,-6,10,-5,Mover SL',
      '12,mh,1,109,6,10,-5,Mover SR',
      '21,strobe,1,201,0,11,-6,Strobe C',
    ].join('\n');
    const blob = new Blob([tmpl], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ma3-patch-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
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
