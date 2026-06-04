/**
 * timecode.js
 * 타임코드(Timecode) 재생 엔진.
 *
 * 시간(초) 축 위에 이벤트를 배치하고, 재생하면 그 시각에 익스큐터의 Go/Off 를 자동 실행한다.
 * 실제 콘솔의 SMPTE 타임코드 동기 재생을 단순화한 모델(내부 클럭 기준).
 *
 * 이벤트는 show.timecodeEvents 에 저장(쇼파일 영속화)되고,
 * 재생 상태(playing/position)는 이 인스턴스가 보유한다.
 */
import { bus, EVT } from './eventBus.js';

let _eid = 1;

export class Timecode {
  constructor(show) {
    this.show = show;
    this.playing = false;
    this.position = 0; // 초
    this._lastNow = 0;
  }

  get events() {
    return this.show.timecodeEvents;
  }
  get duration() {
    return this.show.timecodeDuration;
  }
  set duration(v) {
    this.show.timecodeDuration = Math.max(1, v);
    bus.emit(EVT.TC_CHANGED, {});
  }

  addEvent(time, buttonNo, action = 'go') {
    this.events.push({ id: _eid++, time: Math.max(0, time), buttonNo, action });
    this.events.sort((a, b) => a.time - b.time);
    bus.emit(EVT.TC_CHANGED, {});
  }

  removeEvent(id) {
    const i = this.events.findIndex((e) => e.id === id);
    if (i >= 0) this.events.splice(i, 1);
    bus.emit(EVT.TC_CHANGED, {});
  }

  clearEvents() {
    this.show.timecodeEvents = [];
    bus.emit(EVT.TC_CHANGED, {});
  }

  play(now) {
    if (this.playing) return;
    this.playing = true;
    this._lastNow = now ?? performance.now();
    if (this.position >= this.duration) this.position = 0;
    bus.emit(EVT.TC_CHANGED, {});
  }

  pause() {
    this.playing = false;
    bus.emit(EVT.TC_CHANGED, {});
  }

  stop() {
    this.playing = false;
    this.position = 0;
    bus.emit(EVT.TC_CHANGED, {});
    bus.emit(EVT.TC_TICK, { position: 0 });
  }

  goto(t) {
    this.position = Math.max(0, Math.min(this.duration, t));
    bus.emit(EVT.TC_TICK, { position: this.position });
  }

  /** 매 프레임 호출. now = performance.now(). */
  update(now) {
    if (!this.playing) return;
    const dt = (now - this._lastNow) / 1000;
    this._lastNow = now;
    const prev = this.position;
    this.position += dt;

    // (prev, position] 구간에 들어온 이벤트 실행
    for (const ev of this.events) {
      if (ev.time > prev && ev.time <= this.position) this._fire(ev);
    }

    if (this.position >= this.duration) {
      this.position = this.duration;
      this.playing = false;
      bus.emit(EVT.TC_CHANGED, {});
    }
    bus.emit(EVT.TC_TICK, { position: this.position });
  }

  _fire(ev) {
    if (ev.action === 'go') this.show.execGo(ev.buttonNo);
    else if (ev.action === 'goback') this.show.execGoBack(ev.buttonNo);
    else if (ev.action === 'off') this.show.execOff(ev.buttonNo);
  }
}

/** mm:ss.cc 포맷. */
export function fmtTime(sec) {
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const c = Math.floor((sec * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}
