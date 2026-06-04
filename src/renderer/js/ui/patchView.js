/**
 * patchView.js
 * 패치(Patch) 화면 — 픽스처 추가/삭제, DMX 주소 확인, 충돌 경고.
 *
 * MA3 객체구조에 맞춰 Fixture ID / Type / Universe / Address / Footprint 를 다룬다.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { FixtureLibrary } from '../engine/fixtureLibrary.js';
import { reflowPositions } from '../engine/layout.js';
import { parseDxf, guessType, guessTagRoles, makeAutoFit } from '../engine/dxf.js';
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
            <button id="p-dxf" class="primary">${bi('DXF 도면 가져오기', 'Import DXF drawing')}</button>
            <button id="p-import">${bi('CSV 가져오기', 'Import CSV')}</button>
            <button id="p-template">${bi('CSV 템플릿 받기', 'Download template')}</button>
            <input id="p-dxffile" type="file" accept=".dxf" hidden>
            <input id="p-file" type="file" accept=".csv,text/csv" hidden>
          </div>
          <p class="hint-line">
            ${bi('DXF: AutoCAD 도면(.dwg)은 캐드에서 <b>DXF로 내보내기</b>(SAVEAS→DXF 또는 DXFOUT) 후 올리면, 조명 블록의 위치·속성(채널/주소)을 읽어 자동 등록합니다.', 'DXF: export your AutoCAD .dwg as <b>DXF</b> (SAVEAS→DXF / DXFOUT), then upload — fixture blocks’ positions & attributes (channel/address) are auto-registered.')}<br>
            ${bi('CSV 열: fixtureId, type, universe, address, x, y(=트림높이), z, name. (type: par / mh / dimmer / strobe)', 'CSV columns: fixtureId, type, universe, address, x, y(=trim height), z, name.')}
          </p>
        </div>
        <div id="dxf-panel"></div>
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
    this.el.querySelector('#p-dxf').onclick = () => this.el.querySelector('#p-dxffile').click();
    this.el.querySelector('#p-dxffile').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => this._onDxf(reader.result);
      reader.readAsText(file);
      e.target.value = '';
    };
    // 매핑 패널을 다시 그렸을 때 복원
    if (this._dxf) this._renderDxfPanel();
  }

  // ── DXF 도면 가져오기 ───────────────────────────────
  _onDxf(text) {
    let parsed;
    try { parsed = parseDxf(text); } catch (err) { toast({ ko: 'DXF 파싱 실패', en: 'DXF parse failed' }, 'err'); return; }
    if (!parsed.inserts.length) {
      toast({ ko: '도면에서 블록(INSERT)을 찾지 못했습니다', en: 'No block inserts found in the drawing' }, 'err');
      return;
    }
    // 블록별 타입 추정 + 속성 역할 추정
    this._dxf = parsed;
    this._dxfMap = {};
    parsed.blocks.forEach((b) => { this._dxfMap[b.name] = guessType(b.name); });
    this._dxfRoles = guessTagRoles(parsed.tags);
    this._dxfTrim = 9;
    this._renderDxfPanel();
  }

  _renderDxfPanel() {
    const panel = this.el.querySelector('#dxf-panel');
    if (!panel || !this._dxf) return;
    const { blocks, tags, inserts } = this._dxf;
    const typeOpts = (sel) => [...Object.values(FixtureLibrary).map((t) => `<option value="${t.id}" ${sel === t.id ? 'selected' : ''}>${tt(t.name)}</option>`), `<option value="ignore" ${sel === 'ignore' ? 'selected' : ''}>${tt({ ko: '무시', en: 'ignore' })}</option>`].join('');
    const tagOpts = (sel) => [`<option value="">—</option>`, ...tags.map((t) => `<option value="${t}" ${sel === t ? 'selected' : ''}>${t}</option>`)].join('');

    const rows = blocks.map((b) => `
      <tr>
        <td>${b.name || '(unnamed)'}</td>
        <td>${b.count}</td>
        <td><select class="dxf-type" data-block="${b.name}">${typeOpts(this._dxfMap[b.name])}</select></td>
      </tr>`).join('');

    panel.innerHTML = `
      <div class="dxf-box">
        <h3>${bi('DXF 매핑', 'DXF mapping')} <small>${inserts.length} ${bi('블록 발견', 'inserts found')}</small></h3>
        <table class="patch-table dxf-table">
          <thead><tr><th>${bi('블록 이름', 'Block')}</th><th>${bi('개수', 'Count')}</th><th>${bi('→ 픽스처 타입', '→ Fixture type')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="dxf-roles">
          <label>${bi('채널/FID 속성', 'Channel/FID attr')}<select id="dxf-fid">${tagOpts(this._dxfRoles.fid)}</select></label>
          <label>${bi('주소 속성', 'Address attr')}<select id="dxf-addr">${tagOpts(this._dxfRoles.address)}</select></label>
          <label>${bi('유니버스 속성', 'Universe attr')}<select id="dxf-uni">${tagOpts(this._dxfRoles.universe)}</select></label>
          <label>${bi('트림 높이', 'Trim height')}<input id="dxf-trim" type="number" value="${this._dxfTrim}" min="0" max="30" step="0.5"></label>
        </div>
        <div class="dxf-actions">
          <button id="dxf-confirm" class="primary">${bi('등록', 'Register')}</button>
          <button id="dxf-cancel">${bi('취소', 'Cancel')}</button>
        </div>
        <p class="hint-line">${bi('속성이 없으면 채널/주소는 자동 배정되고, 좌표는 무대 크기에 맞춰 자동 배치됩니다.', 'If attributes are missing, channel/address are auto-assigned and coordinates are auto-fit to the stage.')}</p>
      </div>`;

    panel.querySelectorAll('.dxf-type').forEach((s) => s.onchange = () => { this._dxfMap[s.dataset.block] = s.value; });
    panel.querySelector('#dxf-fid').onchange = (e) => { this._dxfRoles.fid = e.target.value; };
    panel.querySelector('#dxf-addr').onchange = (e) => { this._dxfRoles.address = e.target.value; };
    panel.querySelector('#dxf-uni').onchange = (e) => { this._dxfRoles.universe = e.target.value; };
    panel.querySelector('#dxf-trim').onchange = (e) => { this._dxfTrim = parseFloat(e.target.value) || 9; };
    panel.querySelector('#dxf-confirm').onclick = () => this._confirmDxf();
    panel.querySelector('#dxf-cancel').onclick = () => { this._dxf = null; panel.innerHTML = ''; };
  }

  _confirmDxf() {
    const { inserts } = this._dxf;
    const roles = this._dxfRoles;
    const mapped = inserts.filter((ins) => this._dxfMap[ins.block] && this._dxfMap[ins.block] !== 'ignore');
    if (!mapped.length) { toast({ ko: '등록할 블록 타입을 지정하세요', en: 'Assign at least one block type' }, 'err'); return; }

    const fit = makeAutoFit(mapped.map((i) => ({ x: i.x, y: i.y })));
    const usedId = new Set([...this.show.fixtures.keys()]);
    let autoId = Math.max(0, ...usedId) + 1;
    const freshId = () => { while (usedId.has(autoId)) autoId++; return autoId++; };
    const nextFreeAddr = {}; // universe → 다음 자동 주소

    let added = 0;
    for (const ins of mapped) {
      const typeId = this._dxfMap[ins.block];
      const type = FixtureLibrary[typeId];
      // FID
      let fid = roles.fid ? parseInt(ins.attribs[roles.fid], 10) : NaN;
      if (Number.isNaN(fid) || usedId.has(fid)) fid = freshId();
      usedId.add(fid);
      // Universe
      let uni = roles.universe ? parseInt(ins.attribs[roles.universe], 10) : NaN;
      if (Number.isNaN(uni) || uni < 1) uni = 1;
      // Address
      let addr = roles.address ? parseInt(ins.attribs[roles.address], 10) : NaN;
      if (Number.isNaN(addr) || addr < 1 || this.show.addressConflicts(uni, addr, type.footprint)) {
        let start = nextFreeAddr[uni] || 1;
        while (start + type.footprint - 1 <= 512 && this.show.addressConflicts(uni, start, type.footprint)) start++;
        addr = start;
        nextFreeAddr[uni] = start + type.footprint;
      }
      const sp = fit({ x: ins.x, y: ins.y });
      this.show.patchFixture({ fixtureId: fid, type: typeId, universe: uni, address: addr, position: { x: sp.x, y: this._dxfTrim, z: sp.z }, name: `${ins.block} ${fid}` });
      added++;
    }
    this._dxf = null;
    this.el.querySelector('#dxf-panel').innerHTML = '';
    bus.emit(EVT.PATCH_CHANGED, {});
    bus.emit(EVT.OUTPUT_CHANGED, {});
    toast({ ko: `도면에서 ${added}개 조명 등록됨`, en: `Registered ${added} fixtures from drawing` });
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
