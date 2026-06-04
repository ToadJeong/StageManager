/**
 * eventBus.js
 * 아주 단순한 발행/구독(pub-sub) 이벤트 버스.
 * 엔진(데이터)과 UI/튜토리얼이 직접 의존하지 않고 이벤트로 통신한다.
 *
 * A tiny pub/sub event bus so the engine, UI and tutorial layers stay decoupled.
 */
class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /** 이벤트 구독 / subscribe. 반환값을 호출하면 구독 해제. */
  on(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    const set = this._listeners.get(type);
    if (set) set.delete(handler);
  }

  /** 이벤트 발행 / emit. */
  emit(type, payload) {
    const set = this._listeners.get(type);
    if (set) {
      // 복사본을 돌려 핸들러 내부에서의 구독 변경에 안전하게 한다.
      for (const handler of [...set]) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[eventBus] handler error for "${type}":`, err);
        }
      }
    }
  }
}

// 앱 전역에서 공유하는 단일 인스턴스.
export const bus = new EventBus();

// 이벤트 이름 상수 (오타 방지).
export const EVT = {
  SELECTION_CHANGED: 'selectionChanged',
  PROGRAMMER_CHANGED: 'programmerChanged',
  PATCH_CHANGED: 'patchChanged',
  CUE_STORED: 'cueStored',
  CUE_FIRED: 'cueFired',
  EXEC_CHANGED: 'execChanged',
  OUTPUT_CHANGED: 'outputChanged',
  COMMAND_EXECUTED: 'commandExecuted',
  COMMAND_LINE_CHANGED: 'commandLineChanged',
  SHOW_LOADED: 'showLoaded',
  GROUP_CHANGED: 'groupChanged',
  TC_TICK: 'tcTick',         // 타임코드 재생 위치 갱신(매 프레임)
  TC_CHANGED: 'tcChanged',   // 타임코드 이벤트 목록/재생상태 변경
  NOTICE: 'notice', // 사용자에게 보여줄 짧은 메시지
};
