/**
 * macrosView.js
 * 매크로(Macro) — 커맨드라인 명령을 녹화해 한 번에 재생.
 *
 * - 빈 슬롯 클릭 = 그 슬롯에 녹화 시작(● REC). 이후 Live/Console 에서 명령을 실행.
 *   다시 그 슬롯(또는 [녹화 정지])을 누르면 저장.
 * - 채워진 슬롯 클릭 = 재생(녹화한 명령을 순서대로 실행).
 * - ✕ = 삭제.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { executeCommand } from '../engine/commandLine.js';
import { bi, toast } from '../i18n.js';

const SLOTS = 12;

export class MacrosView {
  constructor(show, el) {
    this.show = show;
    this.el = el;
    [EVT.MACRO_CHANGED, EVT.SHOW_LOADED].forEach((e) => bus.on(e, () => this.render()));
    this.render();
  }

  render() {
    const rec = this.show.recording;
    const recNo = this.show.recordingNo;
    const slots = [];
    for (let no = 1; no <= SLOTS; no++) {
      const m = this.show.macros.get(no);
      const isRec = rec && recNo === no;
      if (m) {
        slots.push(`<div class="mc-slot filled" data-no="${no}">
            <button class="mc-del" data-no="${no}">✕</button>
            <span class="mc-no">${no}</span><span class="mc-name">${m.name}</span>
            <span class="mc-cnt">${m.commands.length} cmd</span></div>`);
      } else {
        slots.push(`<div class="mc-slot empty ${isRec ? 'rec' : ''}" data-no="${no}">
            <span class="mc-no">${no}</span>${isRec ? '<span class="mc-recdot">● REC</span>' : ''}</div>`);
      }
    }
    this.el.innerHTML = `<div class="macros-wrap">
      <h2>${bi('매크로', 'Macros')}</h2>
      <p class="hint-line">${bi('빈 슬롯 클릭=녹화 시작 → Live/Console 에서 명령 실행 → 같은 슬롯(또는 정지)으로 저장. 채워진 슬롯 클릭=재생. 커맨드: Macro 1', 'Click empty=start recording → run commands in Live/Console → click the same slot (or Stop) to save. Click filled=run. Command: Macro 1')}</p>
      ${rec ? `<div class="mc-recbar">${bi('녹화 중', 'Recording')}: Macro ${recNo} — <button id="mc-stop">${bi('녹화 정지·저장', 'Stop & save')}</button></div>` : ''}
      <div class="mc-grid">${slots.join('')}</div>
    </div>`;

    const stop = this.el.querySelector('#mc-stop');
    if (stop) stop.onclick = () => { const r = this.show.stopMacroRecord(); toast({ ko: `Macro ${r.no} 저장 (${r.count} 명령)`, en: `Saved Macro ${r.no} (${r.count} cmds)` }); };

    this.el.querySelectorAll('.mc-del').forEach((b) => b.onclick = (e) => { e.stopPropagation(); this.show.deleteMacro(parseInt(b.dataset.no, 10)); });
    this.el.querySelectorAll('.mc-slot').forEach((s) => s.onclick = () => {
      const no = parseInt(s.dataset.no, 10);
      if (s.classList.contains('filled')) {
        if (this.show.recording) { toast({ ko: '녹화 중에는 재생 불가', en: 'Stop recording first' }, 'err'); return; }
        this.show.runMacro(no, (c) => executeCommand(this.show, c));
        toast({ ko: `Macro ${no} 실행`, en: `Ran Macro ${no}` });
      } else if (this.show.recording && this.show.recordingNo === no) {
        const r = this.show.stopMacroRecord();
        toast({ ko: `Macro ${r.no} 저장 (${r.count} 명령)`, en: `Saved Macro ${r.no} (${r.count} cmds)` });
      } else if (this.show.recording) {
        toast({ ko: `이미 Macro ${this.show.recordingNo} 녹화 중`, en: `Already recording Macro ${this.show.recordingNo}` }, 'err');
      } else {
        this.show.startMacroRecord(no);
        toast({ ko: `Macro ${no} 녹화 시작 — Live/Console 에서 명령을 실행하세요`, en: `Recording Macro ${no} — run commands in Live/Console` });
      }
    });
  }
}
