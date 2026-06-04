/**
 * glossaryQuiz.js
 * 용어집/치트시트 뷰 + 퀴즈 뷰.
 */
import { GLOSSARY, CHEATSHEET } from '../data/glossary.js';
import { QUIZZES } from '../data/quiz.js';
import { bi, tt } from '../i18n.js';

export class GlossaryView {
  constructor(el) { this.el = el; this.render(); }
  render() {
    const terms = GLOSSARY.map((g) =>
      `<div class="gl-item"><div class="gl-term">${g.term}</div>
       <div class="gl-def">${bi(g.ko, g.en)}</div></div>`).join('');
    const sheet = CHEATSHEET.map((c) =>
      `<tr><td><code>${c.cmd}</code></td><td>${bi(c.desc.ko, c.desc.en)}</td></tr>`).join('');
    this.el.innerHTML = `
      <div class="gl-wrap">
        <section>
          <h2>${bi('커맨드 치트시트', 'Command Cheatsheet')}</h2>
          <table class="cheat-table"><tbody>${sheet}</tbody></table>
        </section>
        <section>
          <h2>${bi('용어집', 'Glossary')}</h2>
          <div class="gl-list">${terms}</div>
        </section>
      </div>`;
  }
}

export class QuizView {
  constructor(show, el) { this.show = show; this.el = el; this.render(); }

  render() {
    const items = QUIZZES.map((q, i) => {
      if (q.type === 'mc') {
        const choices = q.choices.map((c, ci) =>
          `<button class="quiz-choice" data-q="${i}" data-c="${ci}">${bi(c.ko, c.en)}</button>`).join('');
        return `<div class="quiz-item" data-q="${i}">
            <div class="quiz-q">Q${i + 1}. ${bi(q.q.ko, q.q.en)}</div>
            <div class="quiz-choices">${choices}</div>
            <div class="quiz-result"></div>
          </div>`;
      }
      // task
      return `<div class="quiz-item task" data-q="${i}">
          <div class="quiz-q">Q${i + 1}. ${bi(q.q.ko, q.q.en)}</div>
          <button class="quiz-check" data-q="${i}">${bi('채점하기 (Live 화면에서 수행 후)', 'Check (do it in Live view)')}</button>
          <div class="quiz-result"></div>
        </div>`;
    }).join('');

    this.el.innerHTML = `<div class="quiz-wrap">
      <h2>${bi('연습 문제 / Quiz', 'Quiz')}</h2>
      <p class="hint-line">${bi('객관식은 보기를 누르고, 실습 과제는 Live 화면에서 수행한 뒤 [채점하기]를 누르세요.', 'Click a choice for MC; for tasks, perform them in Live then press Check.')}</p>
      ${items}</div>`;

    this.el.querySelectorAll('.quiz-choice').forEach((b) => b.onclick = () => {
      const qi = +b.dataset.q, ci = +b.dataset.c;
      const q = QUIZZES[qi];
      const item = this.el.querySelector(`.quiz-item[data-q="${qi}"]`);
      item.querySelectorAll('.quiz-choice').forEach((x) => x.classList.remove('correct', 'wrong'));
      const ok = ci === q.answer;
      b.classList.add(ok ? 'correct' : 'wrong');
      if (!ok) item.querySelector(`.quiz-choice[data-c="${q.answer}"]`).classList.add('correct');
      item.querySelector('.quiz-result').textContent = ok ? tt({ ko: '정답! ✓', en: 'Correct! ✓' }) : tt({ ko: '오답 ✕', en: 'Incorrect ✕' });
      item.querySelector('.quiz-result').className = 'quiz-result ' + (ok ? 'ok' : 'err');
    });

    this.el.querySelectorAll('.quiz-check').forEach((b) => b.onclick = () => {
      const qi = +b.dataset.q;
      const q = QUIZZES[qi];
      const ok = !!q.check(this.show);
      const res = this.el.querySelector(`.quiz-item[data-q="${qi}"] .quiz-result`);
      res.textContent = ok ? tt({ ko: '통과! ✓', en: 'Pass! ✓' }) : tt({ ko: '아직 조건을 만족하지 않았어요.', en: 'Conditions not met yet.' });
      res.className = 'quiz-result ' + (ok ? 'ok' : 'err');
    });
  }
}
