/**
 * glossary.js
 * MA3 / 조명 용어집 + 커맨드 치트시트.
 * 무대감독으로서 조명팀과 소통할 때 필요한 핵심 용어 위주.
 */

export const GLOSSARY = [
  { term: 'Fixture', ko: '조명기구(픽스처). 콘솔이 제어하는 개별 조명. 고유한 Fixture ID 로 호출.', en: 'An individual controllable luminaire. Addressed by a unique Fixture ID.' },
  { term: 'Patch', ko: '픽스처를 콘솔에 등록하고 DMX 주소(Universe/Address)를 할당하는 작업. 모든 프로그래밍의 시작.', en: 'Registering fixtures and assigning DMX addresses (Universe/Address). The first step of any show.' },
  { term: 'DMX / Universe', ko: 'DMX512: 한 라인에 512개 채널. 한 묶음(512채널)을 1 Universe 라 부른다.', en: 'DMX512 carries 512 channels per line; one such line is a "Universe".' },
  { term: 'Address', ko: '픽스처가 Universe 안에서 차지하는 시작 채널 번호. Footprint 만큼 채널을 점유.', en: 'The start channel a fixture occupies within a universe; it spans its footprint.' },
  { term: 'Attribute', ko: 'Dimmer/Pan/Tilt/Color 등 픽스처가 가진 개별 제어 파라미터.', en: 'An individual controllable parameter such as Dimmer, Pan, Tilt, Color.' },
  { term: 'Feature / Preset Type', ko: '어트리뷰트의 묶음(Dimmer, Position, Color, Gobo, Beam). 인코더 바가 이 단위로 전환된다.', en: 'A grouping of attributes (Dimmer, Position, Color, Gobo, Beam) the encoder bar switches between.' },
  { term: 'Programmer', ko: '지금 손으로 편집 중인 라이브 값들. 가장 우선해서 출력되며, Store 의 대상이 된다.', en: 'The live values you are currently editing. Highest priority output and the source for Store.' },
  { term: 'Clear', ko: '프로그래머를 비우는 것. MA3 는 Clear 를 세 번 눌러 단계적으로 비운다(여기선 1회로 단순화).', en: 'Empties the programmer. On real MA3 you press Clear up to three times (simplified to once here).' },
  { term: 'Group', ko: '자주 함께 부르는 픽스처들의 묶음. Store Group 으로 저장, Group n 으로 호출.', en: 'A saved set of fixtures. Store with "Store Group n", recall with "Group n".' },
  { term: 'Cue', ko: '프로그래머의 한 순간을 저장한 장면(Look). Go 로 재생.', en: 'A stored look (snapshot). Played back with Go.' },
  { term: 'Sequence', ko: 'Cue 들이 순서대로 들어있는 리스트. 공연의 흐름.', en: 'An ordered list of cues — the flow of the show.' },
  { term: 'Executor', ko: '시퀀스를 페이더/버튼에 할당한 재생 슬롯. Go/Off 와 페이더로 조작.', en: 'A playback slot binding a sequence to a fader/button, driven by Go/Off and the fader.' },
  { term: 'Fader', ko: '익스큐터의 출력 레벨(주로 Dimmer 마스터)을 조절하는 슬라이더.', en: 'A slider controlling an executor’s level (usually a dimmer master).' },
  { term: 'HTP / LTP', ko: 'HTP=가장 밝은 값 우선(Dimmer), LTP=마지막 명령 우선(Position/Color 등).', en: 'HTP = highest takes precedence (dimmers); LTP = latest takes precedence (position/color).' },
  { term: 'Go / Off', ko: 'Go=다음 큐로 진행/재생, Off=해당 익스큐터 정지·해제.', en: 'Go advances/plays the next cue; Off stops and releases the executor.' },
  { term: 'Store / Merge', ko: 'Store=현재 프로그래머를 큐로 저장. Merge=기존 큐에 더해 합치기.', en: 'Store saves the programmer into a cue; Merge adds to an existing cue.' },
  { term: 'Timecode', ko: '시간 기준(SMPTE 등)으로 큐를 자동 실행하는 기능. 음악/영상과 동기화에 사용.', en: 'Triggers cues automatically against a time reference (e.g. SMPTE) to sync with music/video.' },
  { term: 'At', ko: '값 지정 키워드. "At 100"은 디머 100%, "At Full"도 100%, "At Out"은 0%.', en: 'The value keyword. "At 100" sets 100% dimmer, "At Full" = 100%, "At Out" = 0%.' },
  { term: 'Thru / + / -', ko: '범위/추가/제외. "1 Thru 10", "1 + 5", "1 Thru 10 - 4".', en: 'Range/add/subtract. "1 Thru 10", "1 + 5", "1 Thru 10 - 4".' },
  { term: 'Please (Enter)', ko: 'MA3 의 실행(Enter) 키. 커맨드라인을 확정 실행한다.', en: 'MA3’s execute (Enter) key; confirms and runs the command line.' },
];

export const CHEATSHEET = [
  { cmd: 'Fixture 1 Thru 10', desc: { ko: '1~10번 픽스처 선택', en: 'Select fixtures 1–10' } },
  { cmd: '1 + 3 + 5', desc: { ko: '1, 3, 5번만 선택(암묵적 Fixture)', en: 'Select 1, 3, 5 (implicit Fixture)' } },
  { cmd: 'Fixture 1 Thru 10 - 4', desc: { ko: '1~10 중 4번 제외', en: '1–10 except 4' } },
  { cmd: 'At Full', desc: { ko: '디머 100%', en: 'Dimmer 100%' } },
  { cmd: 'At 50', desc: { ko: '디머 50%', en: 'Dimmer 50%' } },
  { cmd: 'At Out', desc: { ko: '디머 0%', en: 'Dimmer 0%' } },
  { cmd: 'Store Group 1', desc: { ko: '선택을 그룹 1로 저장', en: 'Save selection as Group 1' } },
  { cmd: 'Group 1', desc: { ko: '그룹 1 호출', en: 'Recall Group 1' } },
  { cmd: 'Store Cue 1', desc: { ko: '프로그래머를 큐 1로 저장', en: 'Store programmer to Cue 1' } },
  { cmd: 'Go Executor 201', desc: { ko: '익스큐터 201 다음 큐 재생', en: 'Fire next cue on Exec 201' } },
  { cmd: 'Off Executor 201', desc: { ko: '익스큐터 201 정지', en: 'Stop Exec 201' } },
  { cmd: 'Clear', desc: { ko: '프로그래머 비우기', en: 'Clear the programmer' } },
  { cmd: 'Home', desc: { ko: '선택 픽스처를 기본값으로', en: 'Set selection to home values' } },
];
