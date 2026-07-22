# 🎛️ MA3 Simulator — grandMA3 학습 시뮬레이터

무대감독·조명 입문자를 위한 **grandMA3 조명 콘솔 학습 시뮬레이터**입니다.
실제 콘솔 없이도 **패치 → 프로그래밍 → 큐 → 재생**으로 이어지는 핵심 워크플로우를
커맨드라인·인코더·익스큐터·**3D 무대 비주얼라이저**로 직접 연습할 수 있습니다.

> A desktop learning simulator for the grandMA3 lighting console. Practice the core
> workflow (Patch → Program → Cue → Playback) with a command line, encoders,
> executors and a live 3D stage — no hardware required. UI is **Korean/English bilingual**.

---

## ✨ 주요 기능 / Features

- **MA3 스타일 커맨드라인** — `Fixture 1 Thru 10 At Full`, `Store Cue 1`, `Go` 등
- **가상 하드웨어 키패드** — Fixture / Group / At / Store / Please(Enter) …
- **패치(Patch)** — Fixture ID · Universe · Address · Footprint, 주소 충돌 경고
- **프로그래밍** — Encoder Bar 로 Dimmer / Position(Pan·Tilt) / Color(RGB) / Beam / Gobo 조절
- **그룹 / 큐 / 시퀀스 / 익스큐터** — 장면 저장과 페이더·Go/Off 재생
- **3D 무대 비주얼라이저** — Three.js. 빔·색·무빙·줌이 실시간 반영, 드래그 회전 / 휠 줌
- **단계별 인터랙티브 튜토리얼** — 과제를 수행하면 자동으로 다음 단계로
- **용어집 / 치트시트 / 퀴즈** — 무대감독으로서 조명팀과 소통할 핵심 용어
- **쇼파일 저장 / 불러오기** — 작업한 패치·큐를 JSON 으로 보관
- **MA3 객체구조 모방** — Fixture → Attribute → DMX(Universe/Address) 변환

지원 픽스처: **LED PAR(RGB) · Moving Head Spot · Generic Dimmer · Strobe**

---

## 🚀 실행 방법 / Getting Started

> Node.js 18+ 와 npm 이 필요합니다. (개발/테스트는 Windows 기준)

```bash
# 1) 의존성 설치
npm install

# 2) 실행
npm start
```

개발 모드(개발자도구 자동 오픈):

```bash
npm run dev
```

Three.js 는 `src/renderer/vendor/` 에 동봉되어 있어 오프라인에서도 3D 가 동작합니다.
(`npm install` 은 Electron 실행에 필요합니다.)

---

## ⌨️ 커맨드 치트시트 / Command Cheatsheet

| 명령 (Command) | 설명 (Description) |
|---|---|
| `Fixture 1 Thru 10` | 1~10번 픽스처 선택 / Select fixtures 1–10 |
| `1 + 3 + 5` | 1, 3, 5번만 선택(암묵적 Fixture) / Select 1, 3, 5 |
| `Fixture 1 Thru 10 - 4` | 1~10 중 4번 제외 / 1–10 except 4 |
| `At Full` · `At 50` · `At Out` | 디머 100% / 50% / 0% |
| `Store Group 1` · `Group 1` | 그룹 저장 / 호출 |
| `Store Cue 1` | 프로그래머를 큐 1로 저장 |
| `Go Executor 201` · `Off Executor 201` | 익스큐터 재생 / 정지 |
| `Clear` | 프로그래머 비우기 |
| `Home` | 선택 픽스처를 기본값으로 |

`Please` 키(또는 **Enter**)로 명령을 실행합니다. 앱 안의 **Glossary** 탭에 더 많은 용어가 있습니다.

---

## 🧭 화면 구성 / Layout

```
┌───────────── 커맨드라인 (Command line) ─────────────┐
│ Fixture Sheet │      3D Stage       │  Encoder Bar  │   (+ 튜토리얼 패널)
│ (값 표)       │  (무대 비주얼라이저) │  (어트리뷰트) │
├───────────────┴─────────────────────┴───────────────┤
│      Executors (페이더+Go/Off)   │   Command Keys     │
└──────────────────────────────────────────────────────┘
```

- **Live** : 실시간 프로그래밍 + 재생
- **Patch** : 픽스처 추가/삭제, DMX 주소
- **Tutorial** : 단계별 가이드(우측 패널)
- **Glossary** : 용어집 + 치트시트
- **Quiz** : 객관식 + 실습 과제 자동 채점

---

## 🗂️ 프로젝트 구조 / Project Structure

```
src/
├─ main/                 Electron 메인 프로세스
│  ├─ main.js            윈도우 + 쇼파일 저장/불러오기 IPC
│  └─ preload.cjs        contextBridge (window.ma3)
└─ renderer/
   ├─ index.html
   ├─ styles/main.css    MA3 다크 콘솔 테마
   ├─ vendor/            three.js (동봉)
   └─ js/
      ├─ app.js          부트스트랩(엔진+UI+3D+튜토리얼 연결)
      ├─ i18n.js         한/영 병기
      ├─ engine/         도메인 로직 (DOM 비의존, Node 로 테스트 가능)
      │  ├─ show.js          중앙 상태(패치/선택/프로그래머/큐/익스큐터)
      │  ├─ fixtureLibrary.js 픽스처 타입 + DMX 변환
      │  ├─ commandLine.js   MA3 커맨드 파서
      │  ├─ output.js        출력값 계산(Programmer/Cue/Home, HTP/LTP) + DMX
      │  ├─ layout.js        3D 자동 배치 + 데모 쇼
      │  └─ eventBus.js      pub/sub
      ├─ visualizer/stage3d.js   Three.js 3D 무대
      ├─ ui/             커맨드바·시트·인코더·익스큐터·패치·퀴즈
      ├─ tutorial/       단계별 레슨 + 컨트롤러
      └─ data/           용어집·퀴즈 데이터
```

---

## 🛣️ 로드맵 / Roadmap

이번은 **MVP(1단계)** 입니다. 다음 확장 예정:

- ⏱️ **타임코드(Timecode)** — 시간 기준으로 Go 자동 실행, 음악/영상 동기화
- 🎚️ **익스큐터 페이지 / 더 많은 페이더**, 큐 페이드 타임 보간
- 🎨 **프리셋(Preset)** 풀, 팬(Fan) 기능
- 🧱 더 정밀한 3D(볼류메트릭 빔, 고보 투사)

---

## 📝 비고 / Notes

학습용 시뮬레이터로, 실제 grandMA3 의 모든 기능·문법을 구현하지는 않습니다.
핵심 개념과 워크플로우 학습에 초점을 맞췄습니다. 실제 콘솔/onPC 와 함께 쓰면 가장 좋습니다.

MIT License.
