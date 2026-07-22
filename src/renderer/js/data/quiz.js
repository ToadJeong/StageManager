/**
 * quiz.js
 * 연습 문제/퀴즈 데이터.
 * 두 종류:
 *  - 'mc'    객관식 (지식 확인)
 *  - 'task'  실습 과제 (시뮬레이터 상태를 검사해 자동 채점)
 *
 * task 의 check(show, output) 는 조건 충족 시 true.
 */

export const QUIZZES = [
  {
    type: 'mc',
    q: { ko: '프로그래머(Programmer)에 대한 설명으로 옳은 것은?', en: 'Which statement about the Programmer is correct?' },
    choices: [
      { ko: '지금 편집 중인 라이브 값이며, 가장 우선해서 출력된다', en: 'It holds live edited values and outputs at highest priority' },
      { ko: '한 번 저장하면 지울 수 없다', en: 'Once stored it cannot be cleared' },
      { ko: 'DMX 주소를 자동으로 바꿔준다', en: 'It automatically changes DMX addresses' },
      { ko: '익스큐터에서만 사용한다', en: 'It is only used inside executors' },
    ],
    answer: 0,
  },
  {
    type: 'mc',
    q: { ko: '"At Out" 은 디머를 몇 %로 만드나?', en: 'What does "At Out" set the dimmer to?' },
    choices: [
      { ko: '100%', en: '100%' },
      { ko: '50%', en: '50%' },
      { ko: '0%', en: '0%' },
      { ko: '직전 값 유지', en: 'Keeps previous value' },
    ],
    answer: 2,
  },
  {
    type: 'mc',
    q: { ko: 'Dimmer 가 따르는 병합 규칙은?', en: 'Which merge rule do dimmers follow?' },
    choices: [
      { ko: 'LTP (마지막 우선)', en: 'LTP (latest takes precedence)' },
      { ko: 'HTP (가장 밝은 값 우선)', en: 'HTP (highest takes precedence)' },
      { ko: '평균값', en: 'Average' },
      { ko: '항상 0', en: 'Always 0' },
    ],
    answer: 1,
  },
  {
    type: 'mc',
    q: { ko: '여러 큐가 순서대로 들어있는 리스트를 무엇이라 하나?', en: 'What is an ordered list of cues called?' },
    choices: [
      { ko: 'Group', en: 'Group' },
      { ko: 'Preset', en: 'Preset' },
      { ko: 'Sequence', en: 'Sequence' },
      { ko: 'Universe', en: 'Universe' },
    ],
    answer: 2,
  },
  {
    type: 'task',
    q: { ko: '실습: 1번부터 5번 픽스처를 디머 100%로 만드세요. (예: Fixture 1 Thru 5 At Full)', en: 'Task: Set fixtures 1–5 to 100% dimmer. (e.g. Fixture 1 Thru 5 At Full)' },
    check: (show) => [1, 2, 3, 4, 5].every((id) => show.getProgrammerValue(id, 'Dimmer') === 100),
  },
  {
    type: 'task',
    q: { ko: '실습: 11~14번(무빙)을 적색(R100 G0 B0)으로 만드세요.', en: 'Task: Make fixtures 11–14 (movers) red (R100 G0 B0).' },
    check: (show) => [11, 12, 13, 14].every((id) => {
      const f = show.getFixture(id);
      if (!f) return false;
      return show.getProgrammerValue(id, 'ColorRGB_R') === 100 &&
        show.getProgrammerValue(id, 'ColorRGB_G') === 0 &&
        show.getProgrammerValue(id, 'ColorRGB_B') === 0;
    }),
  },
  {
    type: 'task',
    q: { ko: '실습: 아무 장면이나 만든 뒤 Cue 1 로 저장하세요. (Store Cue 1)', en: 'Task: Build any look and store it as Cue 1. (Store Cue 1)' },
    check: (show) => {
      const seq = show.sequences.get(show.selectedSequenceId);
      return !!(seq && seq.cues.find((c) => c.no === 1));
    },
  },
];
