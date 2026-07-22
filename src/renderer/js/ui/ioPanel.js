/**
 * ioPanel.js
 * 콘솔 화면의 MIDI/OSC 입력 제어 + 활동 로그.
 */
import { bi, toast } from '../i18n.js';

export class IOPanel {
  constructor(el, midi, osc) {
    this.el = el;
    this.midi = midi;
    this.osc = osc;
    this.log = [];
    midi.onActivity = (s) => this._act('MIDI', s);
    osc.onActivity = (s) => this._act('OSC', s);
    this.render();
  }

  _act(kind, s) {
    this.log.unshift(`${kind}: ${s}`);
    if (this.log.length > 6) this.log.pop();
    const l = this.el.querySelector('#io-log');
    if (l) l.innerHTML = this.log.map((x) => `<div>${x}</div>`).join('');
  }

  render() {
    this.el.innerHTML = `
      <div class="io-row">
        <button id="io-midi" class="${this.midi.enabled ? 'on' : ''}">${this.midi.enabled ? 'MIDI ON' : (bi('MIDI 켜기', 'Enable MIDI'))}</button>
        <span class="io-hint">${bi('CC1–15→페이더, CC16→GM, Note36+→Go', 'CC1–15→faders, CC16→GM, Note36+→Go')}</span>
      </div>
      <div class="io-row">
        <button id="io-osc" class="${this.osc.enabled ? 'on' : ''}">${this.osc.enabled ? 'OSC ON' : (bi('OSC 켜기', 'Enable OSC'))}</button>
        <input id="io-port" type="number" min="1" max="65535" value="${this.osc.port}" ${this.osc.enabled ? 'disabled' : ''}>
        <span class="io-hint">/gm /exec/&lt;n&gt;/fader|go|off /cmd</span>
      </div>
      <div id="io-log" class="io-log"></div>`;

    this.el.querySelector('#io-midi').onclick = async () => {
      try {
        if (this.midi.enabled) this.midi.disable(); else await this.midi.enable();
      } catch (e) { toast({ ko: 'MIDI 사용 불가: ' + e.message, en: 'MIDI unavailable: ' + e.message }, 'err'); }
      this.render();
    };
    this.el.querySelector('#io-osc').onclick = async () => {
      try {
        if (this.osc.enabled) await this.osc.disable();
        else await this.osc.enable(parseInt(this.el.querySelector('#io-port').value, 10) || 8000);
      } catch (e) { toast({ ko: 'OSC 사용 불가: ' + e.message, en: 'OSC unavailable: ' + e.message }, 'err'); }
      this.render();
    };
  }
}
