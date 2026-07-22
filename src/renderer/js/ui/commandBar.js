/**
 * commandBar.js
 * 커맨드라인 + 가상 하드웨어 키패드.
 *
 * - 화면 키 또는 물리 키보드로 명령 문자열을 만든다.
 * - [Please]/Enter 로 executeCommand 실행.
 * - [Clear]: 커맨드라인에 글자가 있으면 라인만 비우고, 비어있으면 프로그래머 Clear.
 */
import { executeCommand } from '../engine/commandLine.js';
import { bus, EVT } from '../engine/eventBus.js';
import { buildKeypad } from './keypad.js';
import { bi, tt, toast } from '../i18n.js';

export class CommandBar {
  constructor(show, els) {
    this.show = show;
    this.input = els.line;
    this.feedback = els.feedback;
    this.historyEl = els.history;
    this.history = [];

    this._buildKeys(els.keys);
    this._bindInput();
  }

  _buildKeys(container) {
    buildKeypad(container, (label) => this._pressKey(label));
  }

  _bindInput() {
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.execute(); }
    });
    // 포커스 유지 도우미: 라이브 뷰에서 클릭 시 입력으로
    this.input.setAttribute('placeholder', 'Fixture 1 Thru 10 At Full …');
  }

  _pressKey(label) {
    if (label === 'Please') { this.execute(); return; }
    if (label === 'Clear') { this.clearKey(); return; }
    // 키워드는 앞뒤 공백, 숫자/연산자는 그대로
    const isWord = /^[A-Za-z]/.test(label);
    const token = isWord ? ` ${label} ` : label;
    this.insert(token);
  }

  insert(text) {
    const el = this.input;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = (el.value.slice(0, start) + text + el.value.slice(end)).replace(/\s{2,}/g, ' ').replace(/^\s/, '');
    el.focus();
    const pos = el.value.length;
    el.setSelectionRange(pos, pos);
    bus.emit(EVT.COMMAND_LINE_CHANGED, { value: el.value });
  }

  clearKey() {
    if (this.input.value.trim()) {
      this.input.value = '';
      bus.emit(EVT.COMMAND_LINE_CHANGED, { value: '' });
    } else {
      // 라인이 비어있으면 프로그래머 Clear
      this._run('Clear');
    }
    this.input.focus();
  }

  execute() {
    const cmd = this.input.value.trim();
    if (!cmd) return;
    this._run(cmd);
    this.input.value = '';
    this.input.focus();
  }

  _run(cmd) {
    const result = executeCommand(this.show, cmd);
    bus.emit(EVT.COMMAND_EXECUTED, { command: cmd, result });
    this._showFeedback(cmd, result);
  }

  _showFeedback(cmd, result) {
    this.history.unshift({ cmd, result });
    if (this.history.length > 30) this.history.pop();
    if (this.feedback) {
      this.feedback.textContent = tt(result.message);
      this.feedback.className = 'cmd-feedback ' + (result.ok ? 'ok' : 'err');
    }
    if (!result.ok) toast(result.message, 'err');
    this._renderHistory();
  }

  _renderHistory() {
    if (!this.historyEl) return;
    this.historyEl.innerHTML = this.history.map((h) =>
      `<div class="hist-row ${h.result.ok ? 'ok' : 'err'}"><code>${h.cmd}</code><span>${tt(h.result.message)}</span></div>`
    ).join('');
  }
}
