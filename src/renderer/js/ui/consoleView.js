/**
 * consoleView.js
 * grandMA3 풀사이즈 콘솔을 최대한 닮게 만든 조작 패널 (MA3 다크/블루 테마).
 *
 * 레이아웃(실물 기준):
 *   상단      대형 멀티터치 스크린 3개 (Fixture/Cue/Master·IO 정보)
 *   중앙 좌측 익스큐터 버튼 그리드 + 15 플레이백 페이더 + A/B·Grand 100mm 페이더 + 마스터 Go
 *   중앙 우측 커맨드 섹션: 듀얼 인코더(EncoderBar) + 레벨휠 + MA3 키 매트릭스(실제 키 명칭)
 *
 * 학습 시뮬레이터라 모든 키의 실기능까지는 아니며, 엔진이 지원하는 키는 실제로 동작하고
 * 미구현 키는 외형만 동일하게 두고 안내를 띄운다.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { executeCommand } from '../engine/commandLine.js';
import { EncoderBar } from './encoderBar.js';
import { getAttrDef } from '../engine/fixtureLibrary.js';
import { bi, tt, toast } from '../i18n.js';

const PLAYBACKS = Array.from({ length: 15 }, (_, i) => 201 + i);

// MA3 커맨드 섹션 기능/오브젝트 키 (4열). [label, kind, action]
//  kind: data(파랑) fn(회색) transport special num op
//  action: ins=커맨드라인 삽입 / run / clear / go / goback / off / highlight / home / na(미구현)
const FN_KEYS = [
  ['Setup', 'fn', 'na'], ['Backup', 'fn', 'na'], ['Menu', 'fn', 'na'], ['Esc', 'fn', 'na'],
  ['Store', 'data', 'ins'], ['Update', 'fn', 'update'], ['Edit', 'special', 'blind'], ['Delete', 'data', 'ins'],
  ['Copy', 'fn', 'ins'], ['Move', 'fn', 'ins'], ['Label', 'fn', 'na'], ['Oops', 'special', 'oops'],
  ['Fixture', 'data', 'ins'], ['Group', 'data', 'ins'], ['Sequ', 'data', 'ins'], ['Preset', 'data', 'ins'],
  ['Cue', 'data', 'ins'], ['Exec', 'data', 'ins'], ['Page', 'data', 'ins'], ['Macro', 'data', 'ins'],
  ['Goto', 'transport', 'ins'], ['Select', 'fn', 'na'], ['Align', 'fn', 'na'], ['Time', 'fn', 'na'],
  ['Highlight', 'special', 'highlight'], ['Solo', 'special', 'na'], ['Home', 'special', 'home'], ['Off', 'transport', 'off'],
];

// 숫자/연산 블록 (4열)
const NUM_KEYS = [
  ['7', 'num', 'ins'], ['8', 'num', 'ins'], ['9', 'num', 'ins'], ['Thru', 'op', 'ins'],
  ['4', 'num', 'ins'], ['5', 'num', 'ins'], ['6', 'num', 'ins'], ['Full', 'op', 'ins'],
  ['1', 'num', 'ins'], ['2', 'num', 'ins'], ['3', 'num', 'ins'], ['At', 'op', 'ins'],
  ['.', 'num', 'ins'], ['0', 'num', 'ins'], ['+', 'op', 'ins'], ['-', 'op', 'ins'],
  ['Clear', 'clear', 'clear'], ['/', 'op', 'ins'], ['Please', 'please wide', 'run'],
];

export class ConsoleView {
  constructor(show, el) {
    this.show = show;
    this.el = el;
    this._blackoutPrev = null;
    this._build();

    this.encoder = new EncoderBar(show, this.el.querySelector('#con-encoders'));
    this.encoder.render();

    const refresh = () => { if (this._visible()) { this._updateScreens(); this._updateFaders(); } };
    [EVT.EXEC_CHANGED, EVT.CUE_FIRED, EVT.CUE_STORED, EVT.SELECTION_CHANGED,
      EVT.PROGRAMMER_CHANGED, EVT.SHOW_LOADED, EVT.COMMAND_EXECUTED].forEach((e) => bus.on(e, refresh));
  }

  _visible() { return this.el.classList.contains('active') || this.el.offsetParent !== null; }
  refresh() { this._updateScreens(); this._updateFaders(); this.encoder.render(); }
  update(values) { this.encoder.update(values); this._values = values; }

  _build() {
    const execBtns = PLAYBACKS.map((no) => `<button class="ma3-execbtn" data-no="${no}">${no}</button>`).join('');
    const faders = PLAYBACKS.map((no) => `
      <div class="con-pb" data-no="${no}">
        <input type="range" class="con-pb-fader" data-no="${no}" min="0" max="100" value="100" orient="vertical">
        <div class="con-pb-cue" data-no="${no}">—</div>
        <button class="con-pb-flash" data-no="${no}">▣</button>
      </div>`).join('');
    const fnKeys = FN_KEYS.map(([l, k, a]) => `<button class="ma3-key ${k}" data-act="${a}" data-label="${l}">${l}</button>`).join('');
    const numKeys = NUM_KEYS.map(([l, k, a]) => `<button class="ma3-key ${k}" data-act="${a}" data-label="${l}">${l}</button>`).join('');

    this.el.innerHTML = `
      <div class="console-face ma3">
        <!-- 상단 대형 스크린 3개 -->
        <div class="ma3-monitors">
          <div class="ma3-mon">
            <div class="ma3-mon-bar">1 — Fixtures / Command</div>
            <div class="ma3-cmdline"><span class="cmd-prompt">[Fixture]&gt;</span>
              <input id="con-cmd" autocomplete="off" spellcheck="false" placeholder="Fixture 1 Thru 10 At Full"></div>
            <div id="con-info" class="ma3-mon-body"></div>
          </div>
          <div class="ma3-mon">
            <div class="ma3-mon-bar">2 — Sequences / Playback</div>
            <div id="con-pbinfo" class="ma3-mon-body"></div>
          </div>
          <div class="ma3-mon">
            <div class="ma3-mon-bar">3 — Master / MIDI · OSC</div>
            <div id="con-io" class="ma3-mon-body"></div>
          </div>
        </div>

        <div class="ma3-lower">
          <!-- 좌: 플레이백 -->
          <div class="ma3-playback-area">
            <div class="ma3-letterbox">PLAYBACK
              <span class="ma3-page"><button id="con-pageprev">◀</button><b id="con-pageno">PAGE 1</b><button id="con-pagenext">▶</button></span>
            </div>
            <div class="ma3-seqchips" id="con-seqchips" title="시퀀스를 익스큐터로 드래그해 할당"></div>
            <div class="ma3-execrow" id="con-execrow">${execBtns}</div>
            <div class="ma3-faderwrap">
              <div class="con-playbacks" id="con-playbacks">${faders}</div>
              <div class="ma3-masterfaders">
                <div class="ma3-bigfader">
                  <div class="ma3-bf-label">GRAND</div>
                  <input type="range" id="con-gm" class="con-gm-fader" min="0" max="100" value="100" orient="vertical">
                  <div class="con-gm-val" id="con-gm-val">100</div>
                </div>
                <div class="ma3-bigfader">
                  <div class="ma3-bf-label">B</div>
                  <input type="range" id="con-bfader" class="con-gm-fader" min="0" max="100" value="100" orient="vertical">
                </div>
                <div class="ma3-master-go">
                  <button id="con-mgo" class="mgo">Go+</button>
                  <button id="con-mpause" class="mpause">||</button>
                  <button id="con-mback" class="mback">Go-</button>
                  <button id="con-blackout" class="con-blackout">BO</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 우: 커맨드 섹션 -->
          <div class="ma3-command">
            <div class="ma3-encoder-screen">ENCODERS</div>
            <div id="con-encoders" class="con-encoders"></div>
            <div class="ma3-wheels">
              <div class="con-wheel" id="con-wheel" title="Level Wheel"><div class="con-wheel-grip"></div></div>
              <div class="con-wheel deco" title="Jog"><div class="con-wheel-grip"></div></div>
            </div>
            <div class="ma3-keys">
              <div class="ma3-fnkeys">${fnKeys}</div>
              <div class="ma3-numkeys">${numKeys}</div>
            </div>
          </div>
        </div>
      </div>`;

    this._bind();
    this._updateScreens();
    this._updateFaders();
  }

  _bind() {
    const cmd = this.el.querySelector('#con-cmd');
    cmd.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this._runCmd(); } });

    // MA3 키 매트릭스
    this.el.querySelectorAll('.ma3-key').forEach((b) =>
      b.onclick = () => this._onKey(b.dataset.label, b.dataset.act));

    // 익스큐터 버튼(그리드) — 토글 Go/Off
    this.el.querySelector('#con-execrow').onclick = (e) => {
      const b = e.target.closest('.ma3-execbtn'); if (!b) return;
      const no = +b.dataset.no;
      const ex = this.show.executors.get(no);
      if (ex && ex.on) this.show.execOff(no);
      else { if (!ex) this.show.assignExecutor(no, this.show.selectedSequenceId); this.show.execGo(no); }
    };

    // 플레이백 페이더 + Flash
    const pb = this.el.querySelector('#con-playbacks');
    pb.addEventListener('input', (e) => {
      const f = e.target.closest('.con-pb-fader'); if (!f) return;
      this.show.setFader(+f.dataset.no, parseInt(f.value, 10));
    });
    pb.querySelectorAll('.con-pb-flash').forEach((b) => {
      const no = +b.dataset.no; let prev = null;
      const down = () => { const ex = this.show.executors.get(no); prev = ex ? ex.fader : 100; if (!ex) this.show.assignExecutor(no, this.show.selectedSequenceId); this.show.execGo(no); this.show.setFader(no, 100); };
      const up = () => { if (prev != null) this.show.setFader(no, prev); prev = null; };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); });
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up);
    });

    // 마스터 페이더/버튼
    const gm = this.el.querySelector('#con-gm');
    gm.addEventListener('input', () => this.show.setGrandMaster(parseInt(gm.value, 10)));
    this.el.querySelector('#con-blackout').onclick = () => this._blackout();
    const lowest = () => [...this.show.executors.keys()].sort((a, b) => a - b)[0];
    this.el.querySelector('#con-mgo').onclick = () => { const n = lowest(); if (n != null) this.show.execGo(n); };
    this.el.querySelector('#con-mback').onclick = () => { const n = lowest(); if (n != null) this.show.execGoBack(n); };
    this.el.querySelector('#con-mpause').onclick = () => toast({ ko: 'Pause: 학습 버전 미구현', en: 'Pause: not in this build' });

    // 페이지 전환
    this.el.querySelector('#con-pageprev').onclick = () => this.show.pagePrev();
    this.el.querySelector('#con-pagenext').onclick = () => this.show.pageNext();

    // 시퀀스 → 익스큐터 드래그&드롭 할당
    const chips = this.el.querySelector('#con-seqchips');
    chips.addEventListener('dragstart', (e) => {
      const c = e.target.closest('.seq-chip'); if (!c) return;
      e.dataTransfer.setData('text/seq', c.dataset.seq);
      e.dataTransfer.effectAllowed = 'copy';
    });
    const dropAssign = (e, noAttrEl) => {
      e.preventDefault();
      const seqId = parseInt(e.dataTransfer.getData('text/seq'), 10);
      const no = parseInt(noAttrEl.dataset.no, 10);
      if (!Number.isNaN(seqId) && !Number.isNaN(no)) {
        this.show.assignExecutor(no, seqId);
        toast({ ko: `Executor ${no} ← Seq ${seqId}`, en: `Executor ${no} ← Seq ${seqId}` });
      }
    };
    const wireDrop = (container, sel) => {
      container.addEventListener('dragover', (e) => { if (e.target.closest(sel)) e.preventDefault(); });
      container.addEventListener('drop', (e) => { const t = e.target.closest(sel); if (t) dropAssign(e, t); });
    };
    wireDrop(this.el.querySelector('#con-execrow'), '.ma3-execbtn');
    wireDrop(this.el.querySelector('#con-playbacks'), '.con-pb');

    this._bindWheel(this.el.querySelector('#con-wheel'));
  }

  _renderSeqChips() {
    const el = this.el.querySelector('#con-seqchips');
    if (!el) return;
    const seqs = [...this.show.sequences.values()].sort((a, b) => a.id - b.id);
    el.innerHTML = (seqs.length ? seqs : []).map((s) =>
      `<span class="seq-chip" draggable="true" data-seq="${s.id}">Seq ${s.id} · ${s.cues.length}q</span>`).join('')
      || `<span class="seq-chip-empty">${bi('시퀀스 없음 (Store Cue 로 생성)', 'no sequences (Store a cue)')}</span>`;
  }

  _bindWheel(wheel) {
    let lastY = 0, dragging = false, rot = 0;
    const grip = wheel.querySelector('.con-wheel-grip');
    const move = (e) => {
      if (!dragging) return;
      const dy = lastY - e.clientY; lastY = e.clientY;
      rot += dy; grip.style.transform = `rotate(${rot}deg)`;
      for (const id of this.show.selection) {
        const base = this.show.getProgrammerValue(id, 'Dimmer') ?? this._values?.get(id)?.Dimmer ?? 0;
        this.show.setProgrammerAttr('Dimmer', base + dy * 0.6, [id]);
      }
    };
    const up = () => { dragging = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    wheel.addEventListener('pointerdown', (e) => { e.preventDefault(); dragging = true; lastY = e.clientY; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); });
  }

  _onKey(label, act) {
    const cmd = this.el.querySelector('#con-cmd');
    switch (act) {
      case 'ins': {
        const isWord = /^[A-Za-z]/.test(label);
        cmd.value = (cmd.value + (isWord ? ` ${label} ` : label)).replace(/\s{2,}/g, ' ').replace(/^\s/, '');
        cmd.focus();
        break;
      }
      case 'run': this._runCmd(); break;
      case 'clear':
        if (cmd.value.trim()) cmd.value = '';
        else { executeCommand(this.show, 'Clear'); bus.emit(EVT.COMMAND_EXECUTED, { command: 'Clear' }); }
        cmd.focus(); break;
      case 'go': { const r = executeCommand(this.show, 'Go'); bus.emit(EVT.COMMAND_EXECUTED, { command: 'Go', result: r }); break; }
      case 'goback': { const r = executeCommand(this.show, 'GoBack'); bus.emit(EVT.COMMAND_EXECUTED, { command: 'GoBack', result: r }); break; }
      case 'off': { const r = executeCommand(this.show, 'Off'); bus.emit(EVT.COMMAND_EXECUTED, { command: 'Off', result: r }); break; }
      case 'home': { executeCommand(this.show, 'Home'); bus.emit(EVT.COMMAND_EXECUTED, { command: 'Home' }); break; }
      case 'highlight':
        for (const id of this.show.selection) if (getAttrDef(this.show.getFixture(id).type, 'Dimmer')) this.show.setProgrammerAttr('Dimmer', 100, [id]);
        break;
      case 'oops':
        toast(this.show.undo() ? { ko: 'Oops — 되돌림', en: 'Oops — undone' } : { ko: '되돌릴 동작 없음', en: 'Nothing to undo' });
        break;
      case 'blind':
        this.show.setBlind(!this.show.blind);
        toast(this.show.blind ? { ko: 'Blind ON — 편집이 라이브에 반영 안 됨', en: 'Blind ON — edits do not affect live' } : { ko: 'Blind OFF', en: 'Blind OFF' });
        break;
      case 'update': {
        const r = this.show.updateActiveCue();
        toast(r.ok ? { ko: `Cue ${r.cueNo} 업데이트됨`, en: `Updated Cue ${r.cueNo}` }
          : r.empty ? { ko: '프로그래머가 비어있음', en: 'Programmer empty' }
            : { ko: '업데이트할 큐 없음', en: 'No cue to update' }, r.ok ? 'info' : 'err');
        break;
      }
      case 'na':
        toast({ ko: `[${label}] 키 — 이 학습 버전에선 미구현 (개념은 Tips/Glossary 참고)`, en: `[${label}] — not implemented in this learning build (see Tips/Glossary)` });
        break;
    }
  }

  _runCmd() {
    const cmd = this.el.querySelector('#con-cmd');
    const c = cmd.value.trim(); if (!c) return;
    const r = executeCommand(this.show, c);
    bus.emit(EVT.COMMAND_EXECUTED, { command: c, result: r });
    if (!r.ok) toast(r.message, 'err');
    cmd.value = ''; cmd.focus();
  }

  _blackout() {
    if (this.show.grandMaster > 0) { this._blackoutPrev = this.show.grandMaster; this.show.setGrandMaster(0); }
    else { this.show.setGrandMaster(this._blackoutPrev ?? 100); this._blackoutPrev = null; }
  }

  _updateScreens() {
    const info = this.el.querySelector('#con-info');
    const sel = this.show.selection;
    let progCount = 0; for (const m of this.show.programmer.values()) if (Object.keys(m).length) progCount++;
    const editKey = this.el.querySelector('.ma3-key[data-label="Edit"]');
    if (editKey) editKey.classList.toggle('active', this.show.blind);
    const blindBadge = this.show.blind ? `<span class="con-blind">BLIND</span> ` : '';
    if (info) info.innerHTML =
      blindBadge + `${bi('선택', 'Sel')}: <b>${sel.length}</b> &nbsp; ${bi('프로그래머', 'Prog')}: <b>${progCount}</b><br>` +
      `${sel.length ? 'Fx ' + sel.slice(0, 14).join(',') + (sel.length > 14 ? '…' : '') : tt({ ko: '선택 없음', en: 'nothing selected' })}`;

    const pbinfo = this.el.querySelector('#con-pbinfo');
    if (pbinfo) {
      const seq = this.show.sequences.get(this.show.selectedSequenceId);
      // 이 시퀀스를 재생 중인 익스큐터의 활성 큐 인덱스
      let activeIdx = -1;
      for (const ex of this.show.executors.values()) {
        if (ex.on && ex.sequenceId === this.show.selectedSequenceId && ex.cueIndex >= 0) { activeIdx = ex.cueIndex; break; }
      }
      const head = `${bi('시퀀스', 'Sequence')} ${this.show.selectedSequenceId}`;
      let rows;
      if (!seq || !seq.cues.length) rows = `<div class="seq-empty">${tt({ ko: '큐 없음 — Store Cue 1', en: 'no cues — Store Cue 1' })}</div>`;
      else rows = seq.cues.map((c, i) =>
        `<div class="seq-cue ${i === activeIdx ? 'active' : ''}"><span>Q${c.no}</span><span class="seq-name">${c.name || ''}</span><span class="seq-fade">${c.fade ?? 3}s</span></div>`).join('');
      pbinfo.innerHTML = `<div class="seq-head">${head}</div><div class="seq-list">${rows}</div>`;
    }
    const gm = this.el.querySelector('#con-gm'); const gmv = this.el.querySelector('#con-gm-val');
    if (gm && document.activeElement !== gm) gm.value = this.show.grandMaster;
    if (gmv) gmv.textContent = Math.round(this.show.grandMaster);
    const bo = this.el.querySelector('#con-blackout');
    if (bo) bo.classList.toggle('active', this.show.grandMaster === 0);
  }

  _updateFaders() {
    this._renderSeqChips();
    const pageEl = this.el.querySelector('#con-pageno');
    if (pageEl) pageEl.textContent = `PAGE ${this.show.currentPage}`;
    for (const no of PLAYBACKS) {
      const ex = this.show.executors.get(no);
      const strip = this.el.querySelector(`.con-pb[data-no="${no}"]`);
      const btn = this.el.querySelector(`.ma3-execbtn[data-no="${no}"]`);
      if (btn) { btn.classList.toggle('assigned', !!ex); btn.classList.toggle('on', !!(ex && ex.on)); }
      if (!strip) continue;
      strip.classList.toggle('assigned', !!ex);
      strip.classList.toggle('on', !!(ex && ex.on));
      const fader = strip.querySelector('.con-pb-fader');
      const cue = strip.querySelector('.con-pb-cue');
      if (ex) {
        if (document.activeElement !== fader) fader.value = ex.fader;
        const seq = this.show.sequences.get(ex.sequenceId);
        cue.textContent = ex.on && ex.cueIndex >= 0 && seq?.cues[ex.cueIndex] ? `Q${seq.cues[ex.cueIndex].no}` : (seq ? `S${seq.id}` : '—');
      } else cue.textContent = '—';
    }
  }
}
