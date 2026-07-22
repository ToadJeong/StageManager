/**
 * midi.js
 * Web MIDI 입력 → 콘솔 조작 매핑.
 *
 * 기본 매핑:
 *   CC 1..15  → 익스큐터 201..215 페이더
 *   CC 16     → 그랜드마스터
 *   Note 36..50 (on) → 해당 익스큐터 Go (201..215)
 *   Note 52..66 (on) → 해당 익스큐터 Off
 *
 * 실제 MIDI 컨트롤러(페이더/패드)를 연결해 물리 조작으로 연습할 수 있다.
 */
export class MidiInput {
  constructor(show, onActivity) {
    this.show = show;
    this.onActivity = onActivity || (() => {});
    this.enabled = false;
    this.access = null;
  }

  get supported() { return typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess; }

  async enable() {
    if (!this.supported) throw new Error('Web MIDI not supported');
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this._attach();
    this.access.onstatechange = () => this._attach();
    this.enabled = true;
    this.onActivity(`MIDI on — ${this.inputs().join(', ') || 'no devices'}`);
  }

  disable() {
    if (this.access) for (const i of this.access.inputs.values()) i.onmidimessage = null;
    this.enabled = false;
    this.onActivity('MIDI off');
  }

  inputs() { return this.access ? [...this.access.inputs.values()].map((i) => i.name) : []; }

  _attach() {
    if (!this.access) return;
    for (const input of this.access.inputs.values()) input.onmidimessage = (e) => this._onMsg(e.data);
  }

  /** 테스트/외부 호출용: [status,d1,d2] 처리. */
  _onMsg(data) {
    const status = data[0], d1 = data[1], d2 = data[2];
    const type = status & 0xf0;
    if (type === 0xB0) { this._cc(d1, d2); this.onActivity(`CC ${d1} = ${d2}`); }
    else if (type === 0x90 && d2 > 0) { this._note(d1); this.onActivity(`Note ${d1} on`); }
  }

  _ensureExec(no) {
    if (!this.show.executors.get(no)) this.show.assignExecutor(no, this.show.selectedSequenceId);
  }

  _cc(cc, val) {
    const v = Math.round((val / 127) * 100);
    if (cc >= 1 && cc <= 15) { const no = 200 + cc; this._ensureExec(no); this.show.setFader(no, v); }
    else if (cc === 16) { this.show.setGrandMaster(v); }
  }

  _note(note) {
    if (note >= 36 && note <= 50) { const no = 201 + (note - 36); this._ensureExec(no); this.show.execGo(no); }
    else if (note >= 52 && note <= 66) { this.show.execOff(201 + (note - 52)); }
  }
}
