/**
 * tipsView.js
 * 오퍼레이터 팁 / 학습 자료 화면.
 */
import { TIP_SECTIONS } from '../data/tips.js';
import { bi } from '../i18n.js';

export class TipsView {
  constructor(el) { this.el = el; this.render(); }

  render() {
    const sections = TIP_SECTIONS.map((sec) => {
      if (sec.links) {
        const links = sec.links.map((l) =>
          `<li><a href="#" class="tip-link" data-url="${l.url}">${l.label}</a><span class="tip-url">${l.url}</span></li>`).join('');
        return `<section class="tip-sec"><h2>${bi(sec.title.ko, sec.title.en)}</h2><ul class="tip-links">${links}</ul></section>`;
      }
      const items = sec.items.map((it) => `
        <div class="tip-item">
          <div class="tip-title">${bi(it.title.ko, it.title.en)}</div>
          <div class="tip-body">${bi(it.body.ko, it.body.en)}</div>
          ${it.practice ? `<div class="tip-practice">▶ ${bi(it.practice.ko, it.practice.en)}</div>` : ''}
        </div>`).join('');
      return `<section class="tip-sec"><h2>${bi(sec.title.ko, sec.title.en)}</h2>${items}</section>`;
    }).join('');

    this.el.innerHTML = `<div class="tips-wrap">
      <p class="hint-line">${bi('실제 콘솔/매뉴얼과 함께 보며 연습하세요. 각 항목의 ▶ 는 이 시뮬레이터에서 직접 해볼 수 있는 연습입니다.', 'Practise alongside a real console/manual. ▶ marks things you can try right here in the simulator.')}</p>
      ${sections}</div>`;

    this.el.querySelectorAll('.tip-link').forEach((a) => a.onclick = (e) => {
      e.preventDefault();
      const url = a.dataset.url;
      if (window.ma3?.openExternal) window.ma3.openExternal(url);
      else window.open(url, '_blank');
    });
  }
}
