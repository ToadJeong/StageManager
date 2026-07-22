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
    /** @type {HTMLAudioElement|null} 동기 재생할 음악 (있으면 위치 기준이 됨) */
    this.audio = null;
    this.audioName = '';
  }

  /** 음악 설정. url=objectURL, name=파일명. */
  setAudio(url, name) {
    if (this.audio) { try { this.audio.pause(); } catch { /* */ } }
    this.audio = new Audio(url);
    this.audioName = name || '';
    this.audio.addEventListener('loadedmetadata', () => {
      if (isFinite(this.audio.duration) && this.audio.duration > 0) {
        this.show.timecodeDuration = Math.ceil(this.audio.duration);
      }
      bus.emit(EVT.TC_CHANGED, {});
    });
    this.audio.addEventListener('ended', () => { this.playing = false; bus.emit(EVT.TC_CHANGED, {}); });
    bus.emit(EVT.TC_CHANGED, {});
  }

  clearAudio() {
    if (this.audio) { try { this.audio.pause(); } catch { /* */ } }
    this.audio = null; this.audioName = '';
    bus.emit(EVT.TC_CHANGED, {});
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
    if (this.audio) {
      this.audio.currentTime = Math.min(this.position, this.audio.duration || this.position);
      this.audio.play().catch(() => { /* 사용자 제스처 필요 시 무시 */ });
    }
    bus.emit(EVT.TC_CHANGED, {});
  }

  pause() {
    this.playing = false;
    if (this.audio) this.audio.pause();
    bus.emit(EVT.TC_CHANGED, {});
  }

  stop() {
    this.playing = false;
    this.position = 0;
    if (this.audio) { this.audio.pause(); try { this.audio.currentTime = 0; } catch { /* */ } }
    bus.emit(EVT.TC_CHANGED, {});
    bus.emit(EVT.TC_TICK, { position: 0 });
  }

  goto(t) {
    this.position = Math.max(0, Math.min(this.duration, t));
    if (this.audio) { try { this.audio.currentTime = this.position; } catch { /* */ } }
    bus.emit(EVT.TC_TICK, { position: this.position });
  }

  /** 매 프레임 호출. now = performance.now(). */
  update(now) {
    if (!this.playing) return;
    const prev = this.position;
    // 음악이 있으면 음악의 재생 위치를 기준으로 동기 (메모리 ↔ 음악 일치)
    if (this.audio && !this.audio.paused) {
      this.position = this.audio.currentTime;
    } else {
      const dt = (now - this._lastNow) / 1000;
      this.position += dt;
    }
    this._lastNow = now;

    // (prev, position] 구간에 들어온 이벤트 실행
    for (const ev of this.events) {
      if (ev.time > prev && ev.time <= this.position) this._fire(ev);
    }

    if (this.position >= this.duration && !(this.audio && !this.audio.paused)) {
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
