/**
 * fxView.js
 * 이펙트(Phaser) 화면 — 선택 픽스처에 움직이는 효과를 건다.
 *
 * 효과: Dimmer Chase(밝기 체이스) · RGB Rainbow(무지개) · Pan/Tilt Circle(원형 무빙).
 * Rate(BPM)·Size 로 속도·크기 조절. Store Cue 시 큐에 함께 저장되어 재생된다.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { bi, toast } from '../i18n.js';

const KINDS = [
  { kind: 'dimmerChase', label: { ko: '디머 체이스', en: 'Dimmer Chase' } },
  { kind: 'rainbow', label: { ko: 'RGB 무지개', en: 'RGB Rainbow' } },
  { kind: 'circle', label: { ko: 'Pan/Tilt 원형', en: 'Pan/Tilt Circle' } },
];

export class FxView {
  constructor(show, el) {
    this.show = show;
    this.el = el;
    [EVT.EXEC_CHANGED, EVT.SHOW_LOADED, EVT.SELECTION_CHANGED].forEach((e) => bus.on(e, () => this.render()));
    this.render();
  }

  render() {
    const running = this.show.effects.map((e) =>
      `<div class="fx-run"><span>${e.kind} · ${e.fixtureIds.length} fx</span><button class="fx-rm" data-id="${e.id}">✕</button></div>`).join('')
      || `<div class="empty-note">${bi('실행 중인 이펙트 없음', 'No effects running')}</div>`;

    const btns = KINDS.map((k) =>
      `<button class="fx-add" data-kind="${k.kind}">${bi(k.label.ko, k.label.en)}</button>`).join('');

    this.el.innerHTML = `<div class="fx-wrap">
      <h2>${bi('이펙트 (Phaser)', 'Effects (Phaser)')}</h2>
      <p class="hint-line">${bi('선택한 픽스처에 효과를 겁니다. Rate=속도(BPM), Size=크기. Store Cue 하면 큐에 함께 저장되어 재생됩니다.', 'Applies to the selected fixtures. Rate=speed(BPM), Size=amount. Store Cue captures the effect for playback.')}</p>
      <div class="fx-btns">${btns}<button class="fx-stop">${bi('전체 정지', 'Stop all')}</button></div>
      <div class="fx-sliders">
        <label>Rate (BPM) <input id="fx-rate" type="range" min="10" max="240" value="${this.show.fxRateBPM}"><span id="fx-rate-v">${this.show.fxRateBPM}</span></label>
        <label>Size <input id="fx-size" type="range" min="0" max="100" value="${this.show.fxSize}"><span id="fx-size-v">${this.show.fxSize}</span></label>
      </div>
      <h3 class="fx-run-h">${bi('실행 중', 'Running')}</h3>
      <div class="fx-runs">${running}</div>
    </div>`;

    this.el.querySelectorAll('.fx-add').forEach((b) => b.onclick = () => {
      const r = this.show.addEffect(b.dataset.kind);
      if (r.empty) toast({ ko: '먼저 픽스처를 선택하세요', en: 'Select fixtures first' }, 'err');
    });
    this.el.querySelector('.fx-stop').onclick = () => this.show.stopAllEffects();
    this.el.querySelectorAll('.fx-rm').forEach((b) => b.onclick = () => this.show.removeEffect(parseInt(b.dataset.id, 10)));
    const rate = this.el.querySelector('#fx-rate');
    rate.oninput = () => { this.show.setFxRate(parseInt(rate.value, 10)); this.el.querySelector('#fx-rate-v').textContent = rate.value; };
    const size = this.el.querySelector('#fx-size');
    size.oninput = () => { this.show.setFxSize(parseInt(size.value, 10)); this.el.querySelector('#fx-size-v').textContent = size.value; };
  }
}
