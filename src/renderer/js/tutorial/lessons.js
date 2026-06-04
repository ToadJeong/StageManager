/**
 * lessons.js
 * 단계별 인터랙티브 튜토리얼 데이터.
 *
 * 각 step:
 *   - type: 'info'  설명만 보고 [다음] 으로 진행
 *           'task'  check(show, ctx) 가 true 가 되면 자동 통과
 *   - title/body: 한/영 텍스트
 *   - hint: 막혔을 때 보여줄 힌트 (커맨드 예시)
 *   - check(show, ctx): 과제 완료 판정. ctx.lastCommand = 마지막 실행 명령
 *   - highlight: 강조할 UI 요소 selector (선택)
 */

function sel(show) { return show.selection.slice().sort((a, b) => a - b); }
function eqSet(a, b) { const A = new Set(a); return b.length === A.size && b.every((x) => A.has(x)); }

export const LESSONS = [
  {
    id: 'intro',
    title: { ko: '0. MA3 콘솔 둘러보기', en: '0. Meet the MA3 Console' },
    steps: [
      {
        type: 'info',
        title: { ko: '환영합니다 👋', en: 'Welcome 👋' },
        body: {
          ko: '이 시뮬레이터는 grandMA3 조명 콘솔의 핵심 흐름을 연습하는 학습 도구입니다.\n\n화면 구성:\n· 상단 = 커맨드라인(명령어 입력)\n· 왼쪽 = Fixture Sheet(픽스처 값 표)\n· 가운데 = 3D 무대 비주얼라이저\n· 오른쪽 = Encoder Bar(어트리뷰트 조절)\n· 하단 = Executor 페이더 + 하드웨어 키',
          en: 'This simulator teaches the core workflow of a grandMA3 console.\n\nLayout:\n· Top = Command line\n· Left = Fixture Sheet (value table)\n· Center = 3D stage visualizer\n· Right = Encoder Bar (attributes)\n· Bottom = Executor faders + hardware keys',
        },
      },
      {
        type: 'info',
        title: { ko: 'MA3 의 사고방식', en: 'The MA3 mindset' },
        body: {
          ko: 'MA3 는 "무엇을(Object) → 어떻게(Function) → 얼마나(Value)" 순서로 말을 겁니다.\n예) Fixture 1 Thru 10  At  Full\n     (무엇을)            (어떻게)(얼마나)\n\n명령은 [Please](=Enter)로 실행합니다.',
          en: 'MA3 speaks as "Object → Function → Value".\ne.g.  Fixture 1 Thru 10  At  Full\n      (object)           (fn)(value)\n\nExecute a command with [Please] (= Enter).',
        },
      },
    ],
  },

  {
    id: 'selection',
    title: { ko: '1. 선택과 디머 (Selection & Dimmer)', en: '1. Selection & Dimmer' },
    steps: [
      {
        type: 'task',
        title: { ko: '1~5번 픽스처 선택하기', en: 'Select fixtures 1–5' },
        body: {
          ko: '커맨드라인에 다음을 입력하고 Please 를 누르세요:\n\n  Fixture 1 Thru 5\n\n(하단 키패드의 버튼을 눌러도 되고, 키보드로 직접 타이핑해도 됩니다.)',
          en: 'Type this on the command line and press Please:\n\n  Fixture 1 Thru 5\n\n(Use the on-screen keys or your keyboard.)',
        },
        hint: 'Fixture 1 Thru 5',
        check: (show) => eqSet(sel(show), [1, 2, 3, 4, 5]),
      },
      {
        type: 'task',
        title: { ko: '100% 로 켜기', en: 'Bring them to 100%' },
        body: {
          ko: '선택된 픽스처를 풀로 켭니다:\n\n  At Full\n\n3D 무대에서 불이 켜지는지 확인하세요.',
          en: 'Set the selected fixtures to full:\n\n  At Full\n\nWatch the 3D stage light up.',
        },
        hint: 'At Full',
        check: (show) => [1, 2, 3, 4, 5].every((id) => show.getProgrammerValue(id, 'Dimmer') === 100),
      },
      {
        type: 'task',
        title: { ko: '절반으로 줄이기', en: 'Dim to half' },
        body: { ko: '같은 선택을 50% 로:\n\n  At 50', en: 'Same selection to 50%:\n\n  At 50' },
        hint: 'At 50',
        check: (show) => [1, 2, 3, 4, 5].every((id) => show.getProgrammerValue(id, 'Dimmer') === 50),
      },
      {
        type: 'task',
        title: { ko: '프로그래머 비우기', en: 'Clear the programmer' },
        body: {
          ko: '편집 내용을 비우려면:\n\n  Clear\n\n무대가 다시 어두워집니다. (실제 MA3 는 Clear 를 3번 누릅니다.)',
          en: 'To empty your edits:\n\n  Clear\n\nThe stage goes dark again. (On real MA3 you press Clear three times.)',
        },
        hint: 'Clear',
        check: (show) => !show.hasProgrammerValues(),
      },
    ],
  },

  {
    id: 'attributes',
    title: { ko: '2. 색·무빙 (Encoders)', en: '2. Color & Movement (Encoders)' },
    steps: [
      {
        type: 'task',
        title: { ko: '무빙 라이트 선택', en: 'Select the movers' },
        body: { ko: '무빙헤드 11~14번을 선택:\n\n  Fixture 11 Thru 14', en: 'Select moving heads 11–14:\n\n  Fixture 11 Thru 14' },
        hint: 'Fixture 11 Thru 14',
        check: (show) => eqSet(sel(show), [11, 12, 13, 14]),
      },
      {
        type: 'task',
        title: { ko: '풀로 켜기', en: 'Open the dimmer' },
        body: { ko: '빔이 보이도록 디머를 올립니다:\n\n  At Full', en: 'Raise the dimmer so beams appear:\n\n  At Full' },
        hint: 'At Full',
        check: (show) => [11, 12, 13, 14].every((id) => show.getProgrammerValue(id, 'Dimmer') === 100),
      },
      {
        type: 'task',
        title: { ko: '빨간색으로 만들기', en: 'Make them red' },
        body: {
          ko: '오른쪽 Encoder Bar 에서 [Color] 탭을 누르고, Green·Blue 인코더를 0 으로 내리세요. (Red 는 100 유지)\n\n인코더는 드래그하거나, 위/아래 화살표 버튼으로 조절합니다.',
          en: 'On the Encoder Bar (right), open the [Color] tab and turn Green & Blue down to 0 (keep Red at 100).\n\nDrag the encoders or use the up/down arrows.',
        },
        hint: { ko: 'Color 탭 → Green 0, Blue 0', en: 'Color tab → Green 0, Blue 0' },
        check: (show) => [11, 12, 13, 14].every((id) =>
          show.getProgrammerValue(id, 'ColorRGB_G') === 0 && show.getProgrammerValue(id, 'ColorRGB_B') === 0),
      },
      {
        type: 'task',
        title: { ko: '빔 움직이기 (Pan/Tilt)', en: 'Move the beams (Pan/Tilt)' },
        body: {
          ko: 'Encoder Bar 의 [Position] 탭에서 Pan 또는 Tilt 인코더를 움직여 빔을 무대 위로 흩어보세요. 3D 에서 빔이 움직입니다.',
          en: 'In the [Position] tab, move the Pan or Tilt encoder to spread the beams across the stage. Watch them move in 3D.',
        },
        hint: { ko: 'Position 탭 → Pan/Tilt 조절', en: 'Position tab → adjust Pan/Tilt' },
        check: (show) => [11, 12, 13, 14].some((id) => {
          const p = show.getProgrammerValue(id, 'Pan');
          const t = show.getProgrammerValue(id, 'Tilt');
          return (p !== undefined && p !== 0) || (t !== undefined && t !== 0);
        }),
      },
    ],
  },

  {
    id: 'groups-cues',
    title: { ko: '3. 그룹과 큐 (Group & Cue)', en: '3. Groups & Cues' },
    steps: [
      {
        type: 'task',
        title: { ko: '그룹 저장', en: 'Store a group' },
        body: {
          ko: '자주 쓰는 묶음을 저장해두면 편합니다.\n1~10번을 선택하고 그룹 1로 저장:\n\n  Fixture 1 Thru 10\n  Store Group 1',
          en: 'Save sets you use often.\nSelect 1–10 and store as Group 1:\n\n  Fixture 1 Thru 10\n  Store Group 1',
        },
        hint: 'Store Group 1',
        check: (show) => show.groups.has(1),
      },
      {
        type: 'task',
        title: { ko: '장면 만들고 큐 저장', en: 'Build a look, store a cue' },
        body: {
          ko: '아무 픽스처나 켜서 장면을 만든 뒤 큐 1로 저장하세요:\n\n  (예) Group 1  At Full\n  Store Cue 1\n\n큐는 "그 순간"을 통째로 저장합니다.',
          en: 'Build any look, then store it as Cue 1:\n\n  e.g.  Group 1  At Full\n  Store Cue 1\n\nA cue stores the whole moment.',
        },
        hint: 'Store Cue 1',
        check: (show) => { const s = show.sequences.get(show.selectedSequenceId); return !!(s && s.cues.find((c) => c.no === 1)); },
      },
      {
        type: 'task',
        title: { ko: '두 번째 큐', en: 'A second cue' },
        body: {
          ko: '다른 장면을 만들어 Cue 2 로 저장하세요. (색이나 디머를 바꿔보세요)\n\n  Store Cue 2',
          en: 'Make a different look and store it as Cue 2 (change color or dimmer).\n\n  Store Cue 2',
        },
        hint: 'Store Cue 2',
        check: (show) => { const s = show.sequences.get(show.selectedSequenceId); return !!(s && s.cues.find((c) => c.no === 2)); },
      },
    ],
  },

  {
    id: 'executor',
    title: { ko: '4. 익스큐터 재생 (Playback)', en: '4. Executor Playback' },
    steps: [
      {
        type: 'info',
        title: { ko: '익스큐터란?', en: 'What is an executor?' },
        body: {
          ko: '시퀀스(큐 묶음)를 페이더+버튼에 올려 재생하는 슬롯입니다.\n하단의 Executor 201 에 Sequence 1 이 이미 올라가 있습니다.\nClear 로 프로그래머를 비우면 재생 결과가 더 잘 보입니다.',
          en: 'A slot that puts a sequence on a fader+button for playback.\nExecutor 201 below already holds Sequence 1.\nClear the programmer to see playback more clearly.',
        },
        hint: 'Clear',
      },
      {
        type: 'task',
        title: { ko: 'GO!', en: 'GO!' },
        body: {
          ko: '하단 Executor 201 의 [Go] 버튼을 누르거나, 커맨드라인에 Go 를 입력하세요.\n첫 번째 큐가 재생됩니다.',
          en: 'Press [Go] on Executor 201, or type Go on the command line.\nThe first cue plays.',
        },
        hint: 'Go Executor 201',
        check: (show) => { const e = show.executors.get(201); return !!(e && e.on); },
      },
      {
        type: 'task',
        title: { ko: '페이더 내려보기', en: 'Pull the fader down' },
        body: {
          ko: 'Executor 201 의 페이더를 50% 이하로 내려보세요. 큐의 디머가 함께 줄어듭니다(페이더 = 마스터).',
          en: 'Drag Executor 201’s fader below 50%. The cue’s dimmers scale down (the fader is a master).',
        },
        hint: { ko: '페이더를 아래로 드래그', en: 'Drag the fader down' },
        check: (show) => { const e = show.executors.get(201); return !!(e && e.fader <= 50); },
      },
      {
        type: 'info',
        title: { ko: '한 사이클 완성!', en: 'One full cycle!' },
        body: {
          ko: '훌륭합니다! 패치 → 프로그래밍 → 큐 → 재생의 한 사이클을 익혔습니다.\n\n이제 마지막으로 타임코드(Timecode)를 배워봅시다.',
          en: 'Great! You’ve completed one full cycle: Patch → Program → Cue → Playback.\n\nFinally, let’s learn Timecode.',
        },
      },
    ],
  },

  {
    id: 'timecode',
    title: { ko: '5. 타임코드 (Timecode)', en: '5. Timecode' },
    steps: [
      {
        type: 'info',
        title: { ko: '타임코드란?', en: 'What is Timecode?' },
        body: {
          ko: '타임코드는 "몇 초에 어떤 Go 를 실행할지"를 시간 축에 미리 적어두고 자동으로 재생하는 기능입니다.\n음악·영상과 정확히 맞춘 쇼(콘서트, 뮤지컬)에서 핵심적으로 쓰입니다.\n\n상단 [Timecode] 탭으로 이동하세요.',
          en: 'Timecode plays a pre-written list of "fire this Go at this second" automatically.\nIt’s essential for shows tightly synced to music/video (concerts, musicals).\n\nGo to the [Timecode] tab at the top.',
        },
      },
      {
        type: 'task',
        title: { ko: '큐 2개 이상 준비', en: 'Have at least 2 cues' },
        body: {
          ko: '타임코드가 넘길 큐가 필요합니다. 큐가 2개 미만이면 Live 로 돌아가 Store Cue 1, Store Cue 2 로 만들어 주세요.\n(앞 레슨에서 이미 만들었다면 통과됩니다.)',
          en: 'Timecode needs cues to step through. If you have fewer than 2, go back to Live and Store Cue 1 and Cue 2.\n(If you made them earlier, this passes already.)',
        },
        hint: 'Store Cue 1 / Store Cue 2',
        check: (show) => { const s = show.sequences.get(show.selectedSequenceId); return !!(s && s.cues.length >= 2); },
      },
      {
        type: 'task',
        title: { ko: '예제 타임코드 만들기', en: 'Create example timecode' },
        body: {
          ko: 'Timecode 탭에서 [예제 채우기 / Load example] 버튼을 누르세요.\n큐 개수만큼 Go 이벤트가 시간 축에 자동 배치됩니다.',
          en: 'On the Timecode tab press [Load example].\nGo events are placed on the timeline, one per cue.',
        },
        hint: { ko: '예제 채우기 버튼', en: 'Load example button' },
        check: (show) => (show.timecodeEvents || []).length >= 2,
      },
      {
        type: 'task',
        title: { ko: '▶ 재생!', en: '▶ Play!' },
        body: {
          ko: '▶ 버튼을 눌러 타임코드를 재생하세요. 재생 위치가 지나가며 큐가 자동으로 바뀌는 것을 보세요.\n(Live 탭에서 3D 무대를 함께 보면 더 좋습니다.)',
          en: 'Press ▶ to play. Watch the playhead trigger cues automatically.\n(Open the Live tab to watch the 3D stage at the same time.)',
        },
        hint: { ko: '▶ (재생) 버튼', en: '▶ (play) button' },
        check: (show, ctx) => !!(ctx.timecode && ctx.timecode.playing),
      },
      {
        type: 'info',
        title: { ko: '수료를 축하합니다 🎉', en: 'Congratulations 🎉' },
        body: {
          ko: '패치 → 프로그래밍 → 큐 → 익스큐터 재생 → 타임코드까지 핵심 워크플로우를 모두 익혔습니다!\n\n· 큐는 이제 fade 시간 동안 부드럽게 크로스페이드됩니다.\n· [Glossary] 용어집과 [Quiz] 로 복습하세요.\n· 쇼파일은 상단 Save 로 저장할 수 있습니다.\n\n무대감독으로서 조명팀과 소통할 기본기가 갖춰졌습니다. 화이팅!',
          en: 'You’ve learned the whole core workflow: Patch → Program → Cue → Executor playback → Timecode!\n\n· Cues now crossfade smoothly over their fade time.\n· Review with the Glossary and Quiz.\n· Save your show with the Save button.\n\nYou now have the fundamentals to communicate with the lighting team. Good luck!',
        },
      },
    ],
  },
];
