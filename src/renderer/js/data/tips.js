/**
 * tips.js
 * 오퍼레이터 팁 / 학습 자료 데이터.
 *
 * MA3 풀사이즈 콘솔 개요, 핵심 오퍼레이팅 개념·팁, Vectorworks(프리비즈) 연동,
 * 현장·지역별 관행, 추천 학습 자료 링크를 정리한다.
 * 각 항목의 practice 는 "이 시뮬레이터에서 직접 해볼 것" 안내.
 *
 * 내용은 공개 자료(MA Lighting, Vectorworks, MxU, 포럼 등)와 일반적인 현장 관행을
 * 학습용으로 정리한 것이며, 실제 콘솔/매뉴얼을 함께 보는 것을 권장한다.
 */

export const TIP_SECTIONS = [
  {
    id: 'console',
    title: { ko: 'MA3 풀사이즈 콘솔 개요', en: 'grandMA3 full-size — overview' },
    items: [
      { title: { ko: '엄청난 파라미터/플레이백', en: 'Massive parameters & playbacks' },
        body: { ko: '풀사이즈는 기본 20,480 컨트롤 파라미터, 120개 물리 플레이백 + 16개 X-키. 현존 MA 시리즈 중 가장 유연한 플레이백 플랫폼.', en: 'Full-size ships with 20,480 parameters, 120 physical playbacks + 16 X-keys — the most flexible MA playback platform.' } },
      { title: { ko: '모터라이즈드 페이더 · 듀얼 인코더', en: 'Motorized faders · dual encoders' },
        body: { ko: '색이 바뀌는 라이트파이프가 달린 모터 페이더(60mm 30개 + A/B 100mm 2개), RGB 백라이트 인코더 71개와 듀얼 인코더로 빠른 어트리뷰트 제어.', en: 'Motorized faders with colour light-pipe (30×60mm + 2×100mm A/B), 71 RGB-backlit encoders and dual encoders for fast attribute control.' },
        practice: { ko: '이 시뮬레이터: 하단 Executor 페이더와 우측 Encoder Bar 가 이 구역을 본떴습니다.', en: 'In this sim: the Executor faders and Encoder Bar mirror these sections.' } },
      { title: { ko: '커맨드 섹션이 핵심', en: 'The command section is central' },
        body: { ko: 'MA 의 정체성은 키패드 기반 커맨드라인. "무엇을(Object) → 어떻게(Function) → 얼마나(Value)" 어순으로 빠르게 입력.', en: 'MA’s identity is the keypad command line — "Object → Function → Value" entered fast.' },
        practice: { ko: '이 시뮬레이터: 상단 커맨드라인 + 가상 키패드로 그대로 연습.', en: 'In this sim: practise on the top command line + virtual keypad.' } },
      { title: { ko: 'onPC 로 먼저 연습', en: 'Practise on onPC first' },
        body: { ko: '실물 콘솔이 없으면 grandMA3 onPC(무료) + 커맨드윙/페이더윙으로 동일 소프트웨어를 학습할 수 있습니다.', en: 'No hardware? Learn the same software with free grandMA3 onPC (+ command/fader wings).' } },
    ],
  },

  {
    id: 'onpc',
    title: { ko: 'grandMA3 onPC 로 실전 1:1 연습', en: 'Practise 1:1 with grandMA3 onPC' },
    items: [
      { title: { ko: 'onPC = 실제 콘솔과 동일한 소프트웨어', en: 'onPC = the same software as the real console' },
        body: { ko: '이 시뮬레이터는 한국어 개념 학습용이고, 실제 화면·기능·문법·쇼파일이 100% 똑같은 1:1 연습은 MA Lighting 공식 무료 프로그램 grandMA3 onPC 로 합니다. 콘솔과 동일한 엔진이라 onPC 에서 만든 쇼를 실물 콘솔에 그대로 올릴 수 있습니다.', en: 'This simulator is for learning concepts in Korean; for a true 1:1 (identical screens/features/syntax/showfile) practise with MA Lighting’s free grandMA3 onPC — the very same engine as the console.' } },
      { title: { ko: '설치', en: 'Install' },
        body: { ko: 'malighting.com 다운로드 페이지에서 grandMA3 onPC(Windows/macOS)를 받아 설치합니다. 콘솔과 같은 버전을 쓰는 것이 좋습니다.', en: 'Download grandMA3 onPC (Windows/macOS) from malighting.com and install. Prefer the same version as your console.' } },
      { title: { ko: '추천 학습 순서', en: 'Recommended order' },
        body: { ko: '① 이 시뮬레이터로 패치→프로그래밍→큐→재생→타임코드 개념을 한국어로 익히기 → ② onPC 에서 동일 흐름을 영어 UI로 반복 → ③ 커맨드윙/페이더윙 또는 MIDI로 하드웨어 감각 더하기.', en: '① Learn patch→program→cue→playback→timecode here in Korean → ② repeat the same flow in onPC’s English UI → ③ add hardware feel with a command/fader wing or MIDI.' },
        practice: { ko: '여기서 익힌 "Fixture 1 Thru 10 At Full / Store Cue 1 / Go" 를 onPC 커맨드라인에 그대로 쳐보세요 — 동일하게 동작합니다.', en: 'Type the same "Fixture 1 Thru 10 At Full / Store Cue 1 / Go" into onPC — it behaves identically.' } },
      { title: { ko: '무료 비주얼라이저로 프리비즈', en: 'Previz with a free visualizer' },
        body: { ko: 'onPC + MA 3D(내장) 또는 Vision/Capture 데모로 빔을 보며 연습. 이 시뮬레이터의 3D 는 가벼운 미리보기 역할.', en: 'Use onPC + built-in MA 3D, or a Vision/Capture demo, to see beams. This sim’s 3D is a lightweight preview.' } },
    ],
  },

  {
    id: 'operating',
    title: { ko: '핵심 오퍼레이팅 팁', en: 'Core operating tips' },
    items: [
      { title: { ko: '프리셋으로 쌓고 큐로 저장', en: 'Build from presets, store into cues' },
        body: { ko: '디머·색·포지션·줌을 프리셋으로 만들어 두고 조합해 룩을 만든 뒤 Store Cue. 프리셋을 바꾸면 그 프리셋을 쓴 모든 큐가 함께 갱신됩니다(유지보수 핵심).', en: 'Make dimmer/color/position/zoom presets, combine into a look, then Store Cue. Edit a preset and every cue using it updates — key for maintainability.' },
        practice: { ko: '이 시뮬레이터: Live 에서 룩 구성 → Store Cue 1.', en: 'In this sim: build a look in Live → Store Cue 1.' } },
      { title: { ko: '큐 이름을 의미있게', en: 'Name cues meaningfully' },
        body: { ko: '"Cue 17" 보다 "Verse 1 BLUE" 처럼. 공연 중 빠른 점프와 협업에 큰 차이.', en: 'Prefer "Verse 1 BLUE" over "Cue 17" — huge for fast jumps and teamwork.' } },
      { title: { ko: 'Phaser = 움직이는 프리셋', en: 'Phasers = dynamic presets' },
        body: { ko: 'MA3 의 이펙트는 Phaser. 값이 2스텝 이상이면 모션(예: Red→Blue, 또는 포지션 원). 멈추려면 같은 어트리뷰트의 정적 프리셋이나 "stomp" 로 덮어씁니다.', en: 'MA3 effects are Phasers. Two+ steps = motion (Red→Blue, or a position circle). Stop them with a static preset of the same attribute, or a "stomp".' } },
      { title: { ko: 'MIB (Move In Black)', en: 'MIB — Move In Black' },
        body: { ko: '무빙이 0% 일 때 미리 다음 큐의 포지션/색으로 준비시켜, 무대에서 보이는 이동·색변화를 숨깁니다.', en: 'Pre-positions movers while at 0% so the audience never sees them swing or shift colour.' } },
      { title: { ko: 'MATricks 로 분산/대칭', en: 'MATricks for spread/symmetry' },
        body: { ko: '선택한 픽스처에 윙(좌우대칭)·오프셋·간격을 적용해 체이스·팬아웃을 손쉽게.', en: 'Apply wings, offsets and spacing to a selection for instant chases and fan-outs.' } },
      { title: { ko: 'Tracking & Tracking Sheet', en: 'Tracking & the Tracking Sheet' },
        body: { ko: 'MA 는 트래킹 콘솔: 값이 다음 큐로 "이어집니다". 트래킹 시트로 어떤 값이 활성/이어짐/덮어쓰기인지 확인하세요.', en: 'MA tracks: values carry forward to later cues. Use the Tracking Sheet to see active/tracked/blocked values.' } },
      { title: { ko: 'Clear ×3 · Oops · Blind · Highlight', en: 'Clear ×3 · Oops · Blind · Highlight' },
        body: { ko: 'Clear 세 번으로 단계적 비우기, Oops=실행취소, Blind=출력에 영향 없이 편집, Highlight=선택만 밝혀 패치/포커스 확인.', en: 'Clear thrice to empty in steps, Oops = undo, Blind = edit without affecting output, Highlight = light only the selection to check patch/focus.' },
        practice: { ko: '이 시뮬레이터: Clear 는 1회로 단순화되어 있습니다(개념 동일).', en: 'In this sim: Clear is simplified to one press (same concept).' } },
      { title: { ko: '항상 저장 + USB 백업', en: 'Always Save + USB backup' },
        body: { ko: '쇼파일은 자주 Save, 공연 전 USB 백업. 종료는 반드시 정상 Shutdown(전원 강제 차단 금지).', en: 'Save often, back up to USB before the show. Always shut down cleanly (never kill power).' },
        practice: { ko: '이 시뮬레이터: 상단 Save 로 쇼파일(JSON) 저장.', en: 'In this sim: use the top Save to export the show (JSON).' } },
      { title: { ko: '타임코드 동기', en: 'Timecode sync' },
        body: { ko: '음악/영상에 큐를 정확히 맞춰야 하는 쇼는 타임코드로 Go 를 자동 실행. 리허설로 타이밍을 다듬습니다.', en: 'For shows locked to music/video, fire cues via timecode and refine timing in rehearsal.' },
        practice: { ko: '이 시뮬레이터: Timecode 탭에서 음악을 올리고 ▶ 로 메모리와 동기 확인.', en: 'In this sim: load music on the Timecode tab and press ▶ to verify sync.' } },
    ],
  },

  {
    id: 'vectorworks',
    title: { ko: 'Vectorworks / 프리비즈 연동', en: 'Vectorworks / previz pipeline' },
    items: [
      { title: { ko: 'Spotlight 에서 도면 + 패치', en: 'Design + patch in Spotlight' },
        body: { ko: 'Vectorworks Spotlight 는 기구·트러스 라이브러리와 DMX 패치로 라이트 도면을 작성하는 표준 CAD.', en: 'Vectorworks Spotlight is the standard CAD: instrument/truss libraries + DMX patch to draw the plot.' } },
      { title: { ko: 'GDTF = 기구 정의, MVR = 리그 교환', en: 'GDTF = fixture def, MVR = rig exchange' },
        body: { ko: 'GDTF 는 한 기구의 모든 정보(채널/모드/3D)를 담는 표준 파일. MVR 은 도면 전체(기구+위치+GDTF)를 묶어 콘솔/프리비즈/동료에게 그대로 전달.', en: 'GDTF describes a fixture (channels/modes/3D). MVR packages the whole design (fixtures+positions+GDTFs) to hand off to a console/previz/colleague.' },
        practice: { ko: '이 시뮬레이터: Patch 탭에서 MVR/DXF 가져오기로 도면→패치 자동 등록.', en: 'In this sim: Patch tab → Import MVR/DXF to auto-register the plot.' } },
      { title: { ko: 'Vision 등으로 프리비즈', en: 'Previz with Vision etc.' },
        body: { ko: 'Vision(무료 프리비즈)이나 다른 비주얼라이저로 룩을 잡고 큐를 만든 뒤, grandMA3·MagicQ·Avolites·EOS 등 콘솔로 넘깁니다.', en: 'Set looks and cue in Vision (free previz) or another visualizer, then hand off to grandMA3/MagicQ/Avolites/EOS.' },
        practice: { ko: '이 시뮬레이터: 3D 화면이 간이 프리비즈 역할 — 무대 모형(OBJ/glTF)도 불러올 수 있습니다.', en: 'In this sim: the 3D view is a light previz — you can even load a stage model (OBJ/glTF).' } },
    ],
  },

  {
    id: 'regional',
    title: { ko: '현장·지역별 관행', en: 'Field & regional conventions' },
    items: [
      { title: { ko: '극장: 미국은 ETC EOS 강세', en: 'Theatre: ETC EOS dominates the US' },
        body: { ko: '미국 연극/뮤지컬 극장은 ETC EOS 가 사실상 표준(정교한 큐 타이밍·색 도구·매직시트). 한국·유럽 극장도 EOS 가 많습니다.', en: 'US drama/musical houses run ETC EOS as the de-facto standard (precise cue timing, color tools, Magic Sheets). Many KR/EU theatres too.' } },
      { title: { ko: '콘서트·투어·유럽: grandMA 강세', en: 'Concert/touring/Europe: grandMA' },
        body: { ko: '대형 콘서트·페스티벌·방송·투어에서는 grandMA 가 사실상 표준. 유연성과 대규모 파라미터가 강점(대신 학습곡선이 가파름).', en: 'Big concerts/festivals/broadcast/touring lean grandMA — flexible and huge parameter counts (with a steep learning curve).' } },
      { title: { ko: '버스킹 vs 프리프로그램', en: 'Busking vs pre-programmed' },
        body: { ko: '뮤지컬/연극은 큐를 사전 프로그래밍해 Go 로 진행(GO 콜은 무대감독). 콘서트/클럽은 즉흥 "버스킹"(익스큐터·페이더·이펙트를 실시간 조합)이 흔합니다.', en: 'Theatre is pre-programmed and run on Go (the SM calls GO). Concerts/clubs often "busk" live (mixing executors, faders, effects on the fly).' },
        practice: { ko: '이 시뮬레이터: 두 방식 모두 연습 — 큐를 Go 로 진행하거나 페이더로 실시간 조합.', en: 'In this sim: try both — run cues on Go, or mix live with faders.' } },
      { title: { ko: '무대감독과의 협업(중요)', en: 'Working with the SM (important)' },
        body: { ko: '무대감독은 인터컴으로 "Standby LX 17 … LX 17 GO" 식으로 큐를 콜합니다. 오퍼레이터는 큐 번호·이름을 명확히 라벨링하고, 콜과 콘솔이 1:1로 맞도록 합니다.', en: 'The stage manager calls cues over comms ("Standby LX 17 … LX 17 GO"). Operators label cue numbers/names clearly so the call maps 1:1 to the console.' } },
      { title: { ko: '셋업 순서·안전', en: 'Setup order & safety' },
        body: { ko: '전원→데이터 순서로 연결, DMX 라인 끝 터미네이션, 트러스 트림/세이프티 케이블 확인, 패치표를 출력해 비치. 본 쇼 전 풀 패치 체크(RDM/하이라이트).', en: 'Power before data, terminate DMX lines, check truss trim/safety cables, print a patch sheet. Full patch check before the show (RDM/Highlight).' } },
    ],
  },

  {
    id: 'resources',
    title: { ko: '추천 학습 자료 (링크)', en: 'Recommended resources (links)' },
    links: [
      { label: 'grandMA3 onPC 다운로드 (무료, 실전 1:1)', url: 'https://www.malighting.com/download/' },
      { label: 'grandMA3 제품/사양 (MA Lighting)', url: 'https://www.malighting.com/grandma3/' },
      { label: 'grandMA3 풀사이즈 사양', url: 'https://www.malighting.com/product/grandma3-full-size-4010500/' },
      { label: 'grandMA3 도움말 — Phasers', url: 'https://help.malighting.com/grandMA3/2.0/HTML/phaser.html' },
      { label: 'MA Lighting 공식 포럼', url: 'https://forum.malighting.com/' },
      { label: 'MxU — grandMA3 레슨(큐/페이저)', url: 'https://app.getmxu.com/' },
      { label: 'Vectorworks Spotlight', url: 'https://www.vectorworks.net/en-US/spotlight' },
      { label: 'Vectorworks — GDTF & MVR', url: 'https://www.vectorworks.net/en-US/newsroom/key-features-gdtf-mvr' },
      { label: 'GDTF / MVR 표준 허브', url: 'https://www.gdtf.eu/' },
    ],
  },
];
