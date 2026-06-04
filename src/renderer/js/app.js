/**
 * app.js
 * 애플리케이션 부트스트랩 — 엔진 + UI + 3D + 튜토리얼을 연결한다.
 */
import { Show } from './engine/show.js';
import { computeOutput } from './engine/output.js';
import { buildDemoShow, reflowPositions } from './engine/layout.js';
import { bus, EVT } from './engine/eventBus.js';
import { i18n, toast } from './i18n.js';

import { Stage3D } from './visualizer/stage3d.js';
import { CommandBar } from './ui/commandBar.js';
import { FixtureSheet } from './ui/fixtureSheet.js';
import { EncoderBar } from './ui/encoderBar.js';
import { ExecutorBar } from './ui/executorBar.js';
import { PatchView } from './ui/patchView.js';
import { GlossaryView, QuizView } from './ui/glossaryQuiz.js';
import { Tutorial } from './tutorial/tutorial.js';

const $ = (sel) => document.querySelector(sel);

function boot() {
  i18n.init();

  const show = new Show();
  buildDemoShow(show);
  window.__show = show; // 디버그용

  // ── 3D 비주얼라이저
  const stage = new Stage3D($('#stage3d'));
  stage.syncFixtures(show);

  // ── UI 컴포넌트
  const sheet = new FixtureSheet(show, $('#fixtureSheet'));
  const encoder = new EncoderBar(show, $('#encoderBar'));
  const execBar = new ExecutorBar(show, $('#executorBar'));
  const cmdBar = new CommandBar(show, {
    line: $('#cmdline'),
    keys: $('#hardwareKeys'),
    feedback: $('#cmdFeedback'),
    history: $('#cmdHistory'),
  });
  const patch = new PatchView(show, $('#view-patch'));
  const glossary = new GlossaryView($('#view-glossary'));
  const quiz = new QuizView(show, $('#view-quiz'));
  const tutorial = new Tutorial(show, $('#tutorialPanel'));

  // ── 출력 계산 → 시트/인코더/3D 반영 (마이크로 디바운스)
  // setTimeout(0) 으로 같은 틱의 연속 이벤트를 한 번에 묶는다.
  // (rAF 는 창이 숨겨지면 호출되지 않아 데이터 갱신엔 부적합)
  let pending = false;
  function refreshOutput() {
    if (pending) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      const out = computeOutput(show);
      sheet.update(out.values, out.sources);
      encoder.update(out.values);
      stage.update(show, out.values);
    }, 0);
  }
  bus.on(EVT.OUTPUT_CHANGED, refreshOutput);
  bus.on(EVT.PROGRAMMER_CHANGED, refreshOutput);
  bus.on(EVT.EXEC_CHANGED, refreshOutput);
  bus.on(EVT.CUE_FIRED, refreshOutput);
  bus.on(EVT.PATCH_CHANGED, () => { stage.syncFixtures(show); refreshOutput(); });
  bus.on(EVT.SHOW_LOADED, () => { reflowPositions(show); stage.syncFixtures(show); refreshOutput(); });

  // 초기 렌더
  sheet.render();
  encoder.render();
  execBar.render();
  patch.render();
  tutorial.render();
  refreshOutput();

  // ── 뷰 전환
  // 'tutorial' 은 별도 화면이 아니라 Live 화면 + 우측 튜토리얼 패널을 켜는 모드.
  const sections = ['live', 'patch', 'glossary', 'quiz'];
  function setView(name) {
    const sectionName = name === 'tutorial' ? 'live' : name;
    sections.forEach((v) => {
      const sec = $(`#view-${v}`);
      if (sec) sec.classList.toggle('active', v === sectionName);
    });
    document.querySelectorAll('.view-tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.view === name));
    // 튜토리얼 패널은 Live/Tutorial 에서 노출 (열리면 작업영역을 줄여 자리 확보)
    const tutOpen = name === 'live' || name === 'tutorial';
    $('#tutorialPanel').classList.toggle('visible', tutOpen);
    $('#app').classList.toggle('tut-open', tutOpen);
    if (sectionName === 'live') setTimeout(() => stage.resize(), 30);
    localStorage.setItem('ma3sim.view', name);
  }
  document.querySelectorAll('.view-tab').forEach((t) =>
    t.onclick = () => setView(t.dataset.view));
  setView(localStorage.getItem('ma3sim.view') || 'live');

  // ── 언어 토글
  $('#langToggle').onclick = () => {
    const order = ['both', 'ko', 'en'];
    const next = order[(order.indexOf(i18n.lang) + 1) % order.length];
    i18n.setLang(next);
    $('#langToggle').textContent = next === 'both' ? '한/EN' : next.toUpperCase();
  };
  $('#langToggle').textContent = i18n.lang === 'both' ? '한/EN' : i18n.lang.toUpperCase();

  // ── 쇼파일 New / Save / Load
  $('#btnNew').onclick = () => {
    if (!confirm('새 쇼를 시작할까요? 현재 작업은 사라집니다. / Start a new show? Current work is lost.')) return;
    buildDemoShow(show);
    bus.emit(EVT.SHOW_LOADED, {});
    toast({ ko: '새 데모 쇼 로드', en: 'New demo show loaded' });
  };

  $('#btnSave').onclick = async () => {
    const data = JSON.stringify(show.toJSON(), null, 2);
    if (window.ma3?.saveShow) {
      const res = await window.ma3.saveShow(data);
      if (res?.ok) toast({ ko: `저장됨: ${res.path}`, en: `Saved: ${res.path}` });
    } else {
      // 브라우저 폴백: 다운로드
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ma3-show.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  $('#btnLoad').onclick = async () => {
    if (window.ma3?.loadShow) {
      const res = await window.ma3.loadShow();
      if (res?.ok) { try { show.loadJSON(JSON.parse(res.data)); toast({ ko: '불러옴', en: 'Loaded' }); } catch { toast({ ko: '파일 오류', en: 'Invalid file' }, 'err'); } }
    } else {
      $('#fileInput').click();
    }
  };
  $('#fileInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { show.loadJSON(JSON.parse(reader.result)); toast({ ko: '불러옴', en: 'Loaded' }); } catch { toast({ ko: '파일 오류', en: 'Invalid file' }, 'err'); } };
    reader.readAsText(file);
  };

  // ── 창 크기 변경 시 3D 리사이즈
  window.addEventListener('resize', () => stage.resize());
  setTimeout(() => stage.resize(), 50);

  // 키보드: Live 화면에서 입력창 밖이어도 타이핑하면 커맨드라인으로
  document.addEventListener('keydown', (e) => {
    if ($('#view-live').classList.contains('active') &&
        document.activeElement !== $('#cmdline') &&
        !/input|select|textarea/i.test(document.activeElement?.tagName || '') &&
        /^[a-zA-Z0-9 ]$/.test(e.key)) {
      $('#cmdline').focus();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
