/**
 * tutorial.js
 * 단계별 인터랙티브 튜토리얼 컨트롤러.
 *
 * - LESSONS 를 패널에 렌더링.
 * - 엔진 이벤트를 구독해 현재 task 단계의 check() 를 재평가.
 * - 완료되면 ✓ 표시 + [다음] 활성화(자동 진행 옵션).
 */
import { bus, EVT } from '../engine/eventBus.js';
import { LESSONS } from './lessons.js';
import { bi, tt } from '../i18n.js';

export class Tutorial {
  constructor(show, panelEl) {
    this.show = show;
    this.el = panelEl;
    this.li = 0; // lesson index
    this.si = 0; // step index
    this.ctx = { lastCommand: '' };
    this.stepDone = false;

    // 진행 상황 복원
    try {
      const saved = JSON.parse(localStorage.getItem('ma3sim.tut') || 'null');
      if (saved) { this.li = saved.li || 0; this.si = saved.si || 0; }
    } catch { /* ignore */ }

    // 이벤트 구독 → 현재 단계 재평가
    const recheck = () => this._recheck();
    bus.on(EVT.COMMAND_EXECUTED, (p) => { this.ctx.lastCommand = p?.command || ''; recheck(); });
    [EVT.PROGRAMMER_CHANGED, EVT.SELECTION_CHANGED, EVT.GROUP_CHANGED, EVT.CUE_STORED, EVT.EXEC_CHANGED, EVT.PATCH_CHANGED]
      .forEach((e) => bus.on(e, recheck));
  }

  get lesson() { return LESSONS[this.li]; }
  get step() { return this.lesson.steps[this.si]; }

  _save() {
    localStorage.setItem('ma3sim.tut', JSON.stringify({ li: this.li, si: this.si }));
  }

  _recheck() {
    const step = this.step;
    if (!step || step.type !== 'task' || this.stepDone) return;
    try {
      if (step.check && step.check(this.show, this.ctx)) {
        this.stepDone = true;
        this.render();
        // 짧은 지연 후 자동 진행
        setTimeout(() => { if (this.stepDone) this.next(); }, 900);
      }
    } catch (err) {
      console.error('[tutorial] check error', err);
    }
  }

  gotoLesson(i) { this.li = i; this.si = 0; this.stepDone = false; this._save(); this.render(); }

  next() {
    const lesson = this.lesson;
    if (this.si < lesson.steps.length - 1) {
      this.si++;
    } else if (this.li < LESSONS.length - 1) {
      this.li++; this.si = 0;
    }
    this.stepDone = false;
    this._save();
    this.render();
  }

  prev() {
    if (this.si > 0) this.si--;
    else if (this.li > 0) { this.li--; this.si = this.lesson.steps.length - 1; }
    this.stepDone = false;
    this._save();
    this.render();
  }

  render() {
    const lesson = this.lesson;
    const step = this.step;
    const isTask = step.type === 'task';
    const done = this.stepDone;

    // 레슨 선택 드롭다운
    const lessonOpts = LESSONS.map((l, i) =>
      `<option value="${i}" ${i === this.li ? 'selected' : ''}>${tt(l.title)}</option>`).join('');

    const bodyHtml = `${bi(step.body.ko, step.body.en)}`
      .replace(/\n/g, '<br>');

    const hintHtml = step.hint
      ? `<details class="tut-hint"><summary>${bi('힌트 보기', 'Show hint')}</summary><code>${typeof step.hint === 'string' ? step.hint : tt(step.hint)}</code></details>`
      : '';

    const statusHtml = isTask
      ? (done
        ? `<div class="tut-status ok">${bi('✓ 완료! 자동으로 넘어갑니다…', '✓ Done! Advancing…')}</div>`
        : `<div class="tut-status wait">${bi('⏳ 과제를 수행하세요', '⏳ Complete the task')}</div>`)
      : `<div class="tut-status info">${bi('ℹ︎ 읽고 [다음] 을 누르세요', 'ℹ︎ Read, then press Next')}</div>`;

    this.el.innerHTML = `
      <div class="tut-head">
        <strong>${bi('튜토리얼', 'Tutorial')}</strong>
        <select id="tut-lesson">${lessonOpts}</select>
      </div>
      <div class="tut-progress">${bi('단계', 'Step')} ${this.si + 1} / ${lesson.steps.length}</div>
      <h3 class="tut-title">${bi(step.title.ko, step.title.en)}</h3>
      <div class="tut-body">${bodyHtml}</div>
      ${hintHtml}
      ${statusHtml}
      <div class="tut-nav">
        <button id="tut-prev">${bi('◀ 이전', '◀ Prev')}</button>
        <button id="tut-next" class="${isTask && !done ? 'ghost' : 'primary'}">${bi('다음 ▶', 'Next ▶')}</button>
      </div>
    `;

    this.el.querySelector('#tut-lesson').onchange = (e) => this.gotoLesson(parseInt(e.target.value, 10));
    this.el.querySelector('#tut-prev').onclick = () => this.prev();
    this.el.querySelector('#tut-next').onclick = () => this.next();
  }
}
