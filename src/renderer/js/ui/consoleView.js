/**
 * consoleView.js
 * grandMA3 풀사이즈 콘솔 본체를 본뜬 조작 패널.
 *
 * 구성: 좌/우 스크린(정보) · 인코더 5개(무한회전, EncoderBar 재사용) · 레벨휠 ·
 *       X-키(매크로) · 15개 플레이백 페이더(Go/Flash/Off) · 그랜드마스터 + Blackout ·
 *       커맨드 키패드 + 커맨드라인.
 * 모든 조작은 동일한 Show 엔진을 호출한다.
 *
 * 성능: 골격은 1회만 생성하고, 이벤트 시 동적 텍스트/값만 갱신한다.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { executeCommand } from '../engine/commandLine.js';
import { buildKeypad } from './keypad.js';
import { EncoderBar } from './encoderBar.js';
import { getAttrDef } from '../engine/fixtureLibrary.js';
import { bi, tt, toast } from '../i18n.js';

const PLAYBACKS = Array.from({ length: 15 }, (_, i) => 201 + i);

export class ConsoleView {
  constructor(show, el) {
    this.show = show;
    this.el = el;
    this._blackoutPrev = null;
    this._build();

    // 인코더(무한회전) 재사용
    this.encoder = new EncoderBar(show, this.el.querySelector('#con-encoders'));
    this.encoder.render();

    const refresh = () => { if (this._visible()) { this._updateScreens(); this._updateFaders(); } };
    [EVT.EXEC_CHANGED, EVT.CUE_FIRED, EVT.CUE_STORED, EVT.SELECTION_CHANGED,
      EVT.PROGRAMMER_CHANGED, EVT.SHOW_LOADED, EVT.COMMAND_EXECUTED].forEach((e) => bus.on(e, refresh));
  }

  _visible() { return this.el.classList.contains('active') || this.el.offsetParent !== null; }

  /** 탭 진입 시 강제 갱신. */
  refresh() { this._updateScreens(); this._updateFaders(); this.encoder.render(); }

  /** app 의 renderFrame 에서 출력값 전달(인코더/스크린 표시용). */
  update(values) { this.encoder.update(values); this._values = values; }

  _build() {
    this.el.innerHTML = `
      <div class="console-face">
        <div class="con-screens">
          <div class="con-screen">
            <div class="con-screen-title">COMMAND / 커맨드</div>
            <div class="con-cmdline"><span class="cmd-prompt">CMD&gt;</span>
              <input id="con-cmd" autocomplete="off" spellcheck="false" placeholder="Fixture 1 Thru 10 At Full"></div>
            <div id="con-info" class="con-info"></div>
          </div>
          <div class="con-screen">
            <div class="con-screen-title">PLAYBACK / 재생 · MASTER</div>
            <div id="con-pbinfo" class="con-info"></div>
          </div>
          <div class="con-screen con-io-screen">
            <div class="con-screen-title">MIDI / OSC INPUT</div>
            <div id="con-io" class="con-info"></div>
          </div>
        </div>

        <div class="con-mid">
          <div class="con-encoder-area">
            <div class="con-block-label">ENCODERS <small>무한회전 · 선택 픽스처</small></div>
            <div id="con-encoders" class="con-encoders"></div>
          </div>
          <div class="con-wheel-area">
            <div class="con-block-label">LEVEL WHEEL</div>
            <div id="con-wheel" class="con-wheel"><div class="con-wheel-grip"></div></div>
            <div class="con-wheel-hint">${bi('드래그=선택 디머', 'drag = selected dimmer')}</div>
          </div>
        </div>

        <div class="con-xkeys" id="con-xkeys">
          <button data-x="clear">Clear</button>
          <button data-x="highlight">Highlight</button>
          <button data-x="home">Home</button>
          <button data-x="offall">Off All</button>
          <button data-x="storecue">Store Cue+</button>
        </div>

        <div class="con-playbacks" id="con-playbacks"></div>

        <div class="con-bottom">
          <div class="con-master">
            <div class="con-block-label">GRAND MASTER</div>
            <input type="range" id="con-gm" class="con-gm-fader" min="0" max="100" value="100" orient="vertical">
            <div class="con-gm-val" id="con-gm-val">100</div>
            <button id="con-blackout" class="con-blackout">BLACK OUT</button>
          </div>
          <div class="con-keypad">
            <div class="con-block-label">COMMAND SECTION</div>
            <div id="con-keys"></div>
          </div>
        </div>
      </div>`;

    // 플레이백 스트립 생성
    const pb = this.el.querySelector('#con-playbacks');
    pb.innerHTML = PLAYBACKS.map((no) => `
      <div class="con-pb" data-no="${no}">
        <div class="con-pb-head">${no}</div>
        <div class="con-pb-cue" data-no="${no}">—</div>
        <input type="range" class="con-pb-fader" data-no="${no}" min="0" max="100" value="100" orient="vertical">
        <button class="con-pb-flash" data-no="${no}">Flash</button>
        <button class="con-pb-go" data-no="${no}">Go</button>
        <button class="con-pb-off" data-no="${no}">Off</button>
      </div>`).join('');

    // 키패드
    buildKeypad(this.el.querySelector('#con-keys'), (label) => this._key(label));

    this._bind();
    this._updateScreens();
    this._updateFaders();
  }

  _bind() {
    // 커맨드라인
    const cmd = this.el.querySelector('#con-cmd');
    cmd.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this._runCmd(); } });

    // X-키
    this.el.querySelector('#con-xkeys').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      this._xkey(b.dataset.x);
    };

    // 플레이백
    const pb = this.el.querySelector('#con-playbacks');
    pb.addEventListener('input', (e) => {
      const f = e.target.closest('.con-pb-fader'); if (!f) return;
      this.show.setFader(+f.dataset.no, parseInt(f.value, 10));
    });
    pb.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const no = +b.dataset.no;
      if (b.classList.contains('con-pb-go')) this.show.execGo(no);
      else if (b.classList.contains('con-pb-off')) this.show.execOff(no);
    });
    // Flash (누르는 동안 100%)
    pb.querySelectorAll('.con-pb-flash').forEach((b) => {
      const no = +b.dataset.no;
      let prev = null;
      const down = () => { const ex = this.show.executors.get(no); prev = ex ? ex.fader : 100; if (!ex) this.show.assignExecutor(no, this.show.selectedSequenceId); this.show.execGo(no); this.show.setFader(no, 100); };
      const up = () => { if (prev != null) this.show.setFader(no, prev); prev = null; };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); });
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
    });

    // 그랜드마스터
    const gm = this.el.querySelector('#con-gm');
    gm.addEventListener('input', () => this.show.setGrandMaster(parseInt(gm.value, 10)));
    this.el.querySelector('#con-blackout').onclick = () => this._blackout();

    // 레벨휠
    this._bindWheel(this.el.querySelector('#con-wheel'));
  }

  _bindWheel(wheel) {
    let lastY = 0; let dragging = false;
    const grip = wheel.querySelector('.con-wheel-grip');
    let rot = 0;
    const move = (e) => {
      if (!dragging) return;
      const dy = lastY - e.clientY; lastY = e.clientY;
      rot += dy; grip.style.transform = `rotate(${rot}deg)`;
      // 선택 픽스처 디머 상대 조절
      for (const id of this.show.selection) {
        const base = this.show.getProgrammerValue(id, 'Dimmer') ?? this._values?.get(id)?.Dimmer ?? 0;
        this.show.setProgrammerAttr('Dimmer', base + dy * 0.6, [id]);
      }
    };
    const up = () => { dragging = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    wheel.addEventListener('pointerdown', (e) => { e.preventDefault(); dragging = true; lastY = e.clientY; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); });
  }

  // 커맨드 키패드 입력
  _key(label) {
    const cmd = this.el.querySelector('#con-cmd');
    if (label === 'Please') { this._runCmd(); return; }
    if (label === 'Clear') { if (cmd.value.trim()) cmd.value = ''; else executeCommand(this.show, 'Clear'), bus.emit(EVT.COMMAND_EXECUTED, { command: 'Clear' }); cmd.focus(); return; }
    const isWord = /^[A-Za-z]/.test(label);
    cmd.value = (cmd.value + (isWord ? ` ${label} ` : label)).replace(/\s{2,}/g, ' ').replace(/^\s/, '');
    cmd.focus();
  }

  _runCmd() {
    const cmd = this.el.querySelector('#con-cmd');
    const c = cmd.value.trim(); if (!c) return;
    const r = executeCommand(this.show, c);
    bus.emit(EVT.COMMAND_EXECUTED, { command: c, result: r });
    if (!r.ok) toast(r.message, 'err');
    cmd.value = ''; cmd.focus();
  }

  _xkey(which) {
    switch (which) {
      case 'clear': executeCommand(this.show, 'Clear'); bus.emit(EVT.COMMAND_EXECUTED, { command: 'Clear' }); break;
      case 'highlight':
        for (const id of this.show.selection) if (getAttrDef(this.show.getFixture(id).type, 'Dimmer')) this.show.setProgrammerAttr('Dimmer', 100, [id]);
        break;
      case 'home': executeCommand(this.show, 'Home'); bus.emit(EVT.COMMAND_EXECUTED, { command: 'Home' }); break;
      case 'offall': for (const no of this.show.executors.keys()) this.show.execOff(no); break;
      case 'storecue': {
        const seq = this.show.sequences.get(this.show.selectedSequenceId);
        const next = seq && seq.cues.length ? Math.max(...seq.cues.map((c) => c.no)) + 1 : 1;
        executeCommand(this.show, `Store Cue ${next}`); bus.emit(EVT.COMMAND_EXECUTED, { command: `Store Cue ${next}` });
        break;
      }
    }
  }

  _blackout() {
    if (this.show.grandMaster > 0) { this._blackoutPrev = this.show.grandMaster; this.show.setGrandMaster(0); }
    else { this.show.setGrandMaster(this._blackoutPrev ?? 100); this._blackoutPrev = null; }
  }

  _updateScreens() {
    const info = this.el.querySelector('#con-info');
    const sel = this.show.selection;
    let progCount = 0; for (const m of this.show.programmer.values()) if (Object.keys(m).length) progCount++;
    if (info) info.innerHTML =
      `${bi('선택', 'Selected')}: <b>${sel.length}</b> &nbsp; ${bi('프로그래머', 'Programmer')}: <b>${progCount}</b><br>` +
      `${sel.length ? 'Fx ' + sel.slice(0, 12).join(',') + (sel.length > 12 ? '…' : '') : tt({ ko: '선택 없음', en: 'nothing selected' })}`;

    const pbinfo = this.el.querySelector('#con-pbinfo');
    if (pbinfo) {
      const live = [...this.show.executors.values()].filter((e) => e.on).map((e) => `Ex${e.buttonNo}`).join(' ') || tt({ ko: '재생 중 없음', en: 'none running' });
      pbinfo.innerHTML = `${bi('그랜드마스터', 'Grand Master')}: <b>${Math.round(this.show.grandMaster)}%</b><br>${bi('재생 중', 'Running')}: ${live}`;
    }
    const gm = this.el.querySelector('#con-gm'); const gmv = this.el.querySelector('#con-gm-val');
    if (gm) gm.value = this.show.grandMaster;
    if (gmv) gmv.textContent = Math.round(this.show.grandMaster);
    const bo = this.el.querySelector('#con-blackout');
    if (bo) bo.classList.toggle('active', this.show.grandMaster === 0);
  }

  _updateFaders() {
    for (const no of PLAYBACKS) {
      const ex = this.show.executors.get(no);
      const strip = this.el.querySelector(`.con-pb[data-no="${no}"]`);
      if (!strip) continue;
      strip.classList.toggle('assigned', !!ex);
      strip.classList.toggle('on', !!(ex && ex.on));
      const fader = strip.querySelector('.con-pb-fader');
      const cue = strip.querySelector('.con-pb-cue');
      if (ex) {
        if (document.activeElement !== fader) fader.value = ex.fader;
        const seq = this.show.sequences.get(ex.sequenceId);
        cue.textContent = ex.on && ex.cueIndex >= 0 && seq?.cues[ex.cueIndex] ? `Q${seq.cues[ex.cueIndex].no}` : (seq ? `S${seq.id}` : '—');
      } else {
        cue.textContent = '—';
      }
    }
  }
}
