/**
 * osc.js (렌더러)
 * 메인 프로세스의 OSC(UDP) 수신을 받아 콘솔 조작으로 매핑.
 *
 * 지원 주소:
 *   /gm <f>                      그랜드마스터 (0..1 또는 0..100)
 *   /exec/<n>/fader <f>          익스큐터 n 페이더
 *   /exec/<n>/go                 익스큐터 n Go
 *   /exec/<n>/off                익스큐터 n Off
 *   /dimmer <f>                  선택 픽스처 디머
 *   /cmd <s>                     커맨드라인 실행
 *
 * 실제 OSC 컨트롤러(TouchOSC, Lemur, QLab 등)에서 보내 연습할 수 있다.
 */
import { executeCommand } from '../engine/commandLine.js';
import { bus, EVT } from '../engine/eventBus.js';

export class OscInput {
  constructor(show, onActivity) {
    this.show = show;
    this.onActivity = onActivity || (() => {});
    this.enabled = false;
    this.port = 8000;
    this._off = null;
  }

  get supported() { return !!(window.ma3 && window.ma3.startOsc); }

  async enable(port) {
    if (!this.supported) throw new Error('OSC bridge not available');
    this.port = port || this.port;
    const res = await window.ma3.startOsc(this.port);
    if (!res?.ok) throw new Error(res?.error || 'OSC start failed');
    this._off = window.ma3.onOsc((msg) => this._apply(msg));
    this.enabled = true;
    this.onActivity(`OSC listening on :${this.port}`);
  }

  async disable() {
    if (window.ma3?.stopOsc) await window.ma3.stopOsc();
    if (this._off) this._off();
    this.enabled = false;
    this.onActivity('OSC off');
  }

  _num(args, scale100 = true) {
    let v = (args && args.length) ? Number(args[0]) : 0;
    if (scale100 && v <= 1.0001) v *= 100; // 0..1 정규화 입력 허용
    return v;
  }

  _apply(msg) {
    const addr = msg.address || '';
    const args = msg.args || [];
    this.onActivity(`${addr} ${args.join(' ')}`);
    let m;
    if (addr === '/gm') { this.show.setGrandMaster(this._num(args)); return; }
    if (addr === '/dimmer') { for (const id of this.show.selection) this.show.setProgrammerAttr('Dimmer', this._num(args), [id]); return; }
    if (addr === '/cmd') { const c = String(args[0] ?? ''); if (c) { const r = executeCommand(this.show, c); bus.emit(EVT.COMMAND_EXECUTED, { command: c, result: r }); } return; }
    if ((m = addr.match(/^\/exec\/(\d+)\/fader$/))) { this.show.setFader(+m[1], this._num(args)); return; }
    if ((m = addr.match(/^\/exec\/(\d+)\/go$/))) { const no = +m[1]; if (!this.show.executors.get(no)) this.show.assignExecutor(no, this.show.selectedSequenceId); this.show.execGo(no); return; }
    if ((m = addr.match(/^\/exec\/(\d+)\/off$/))) { this.show.execOff(+m[1]); return; }
  }
}
