/**
 * executorBar.js
 * 익스큐터 바 — 시퀀스를 페이더+버튼으로 재생.
 *
 * 각 익스큐터: 세로 페이더(0~100), Go/Back/Off 버튼, 현재 큐 표시.
 * 비어있는 슬롯은 "현재 시퀀스 할당" 버튼을 제공.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { bi, tt } from '../i18n.js';

// 표시할 익스큐터 버튼 번호 (MA3 의 메인 페이지 익스큐터 번호대)
const SLOTS = [201, 202, 203, 204, 205, 206];

export class ExecutorBar {
  constructor(show, el) {
    this.show = show;
    this.el = el;
    [EVT.EXEC_CHANGED, EVT.CUE_STORED, EVT.CUE_FIRED, EVT.SHOW_LOADED].forEach((e) =>
      bus.on(e, () => this.render()));
  }

  render() {
    const cells = SLOTS.map((no) => {
      const exec = this.show.executors.get(no);
      if (!exec) {
        return `
          <div class="exec empty">
            <div class="exec-fader-area"><div class="exec-empty-label">${no}</div></div>
            <button class="exec-assign" data-no="${no}">${bi('할당', 'Assign')}</button>
          </div>`;
      }
      const seq = this.show.sequences.get(exec.sequenceId);
      const cueLabel = (() => {
        if (!exec.on || exec.cueIndex < 0) return '— OFF';
        const c = seq?.cues[exec.cueIndex];
        return c ? `Cue ${c.no}` : '—';
      })();
      const cueCount = seq?.cues.length ?? 0;
      return `
        <div class="exec ${exec.on ? 'on' : ''}">
          <div class="exec-head">${no}</div>
          <div class="exec-seq">${seq ? tt({ ko: `시퀀스 ${seq.id}`, en: `Seq ${seq.id}` }) : ''}<br><small>${cueCount} cue</small></div>
          <div class="exec-fader-area">
            <input type="range" class="exec-fader" min="0" max="100" value="${exec.fader}" data-no="${no}" orient="vertical">
            <div class="exec-fader-val">${exec.fader}</div>
          </div>
          <div class="exec-cue ${exec.on ? 'live' : ''}">${cueLabel}</div>
          <div class="exec-btns">
            <button class="exec-go" data-no="${no}">Go</button>
            <button class="exec-back" data-no="${no}">◀</button>
            <button class="exec-off" data-no="${no}">Off</button>
          </div>
        </div>`;
    }).join('');

    this.el.innerHTML = cells;

    this.el.querySelectorAll('.exec-assign').forEach((b) => b.onclick = () => {
      this.show.assignExecutor(parseInt(b.dataset.no, 10), this.show.selectedSequenceId);
    });
    this.el.querySelectorAll('.exec-go').forEach((b) => b.onclick = () => this.show.execGo(+b.dataset.no));
    this.el.querySelectorAll('.exec-back').forEach((b) => b.onclick = () => this.show.execGoBack(+b.dataset.no));
    this.el.querySelectorAll('.exec-off').forEach((b) => b.onclick = () => this.show.execOff(+b.dataset.no));
    this.el.querySelectorAll('.exec-fader').forEach((f) => {
      f.oninput = () => {
        this.show.setFader(+f.dataset.no, parseInt(f.value, 10));
        const valEl = f.parentElement.querySelector('.exec-fader-val');
        if (valEl) valEl.textContent = f.value;
      };
    });
  }
}
