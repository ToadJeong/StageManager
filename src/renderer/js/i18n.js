/**
 * i18n.js
 * 한/영 병기(bilingual) 표시 유틸리티.
 *
 * - bi(ko, en): 한국어/영어를 함께 담은 HTML 조각을 만든다.
 *   CSS 의 root 클래스(lang-both / lang-ko / lang-en)로 표시를 전환한다.
 * - tt({ko,en}): 현재 언어에 맞는 평문 문자열을 돌려준다 (토스트/피드백용).
 * - toast(): 화면 하단에 잠깐 뜨는 알림.
 */
import { bus, EVT } from './engine/eventBus.js';

export const i18n = {
  lang: 'both', // 'both' | 'ko' | 'en'
  setLang(l) {
    this.lang = l;
    document.documentElement.classList.remove('lang-both', 'lang-ko', 'lang-en');
    document.documentElement.classList.add('lang-' + l);
    localStorage.setItem('ma3sim.lang', l);
  },
  init() {
    const saved = localStorage.getItem('ma3sim.lang') || 'both';
    this.setLang(saved);
  },
};

/** 한/영 병기 HTML 조각. */
export function bi(ko, en) {
  return `<span class="ko">${ko}</span><span class="en">${en}</span>`;
}

/** 현재 언어 기준 평문. lang==='both' 면 "ko / en". */
export function tt(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (i18n.lang === 'ko') return obj.ko;
  if (i18n.lang === 'en') return obj.en;
  return `${obj.ko} / ${obj.en}`;
}

let toastTimer = null;
/** 하단 토스트 알림. msg 는 {ko,en} 또는 문자열. */
export function toast(msg, kind = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = tt(msg);
  el.className = `show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = '';
  }, 2600);
}

// 엔진에서 올라오는 알림을 토스트로.
bus.on(EVT.NOTICE, (p) => toast(p.message, p.kind || 'info'));
