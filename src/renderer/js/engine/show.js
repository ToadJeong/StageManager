/**
 * show.js
 * 쇼(Show)의 중앙 상태 모델 + 조작 API.
 *
 * grandMA3 의 핵심 객체 구조를 단순화해 보유한다:
 *   - Patch:      Fixture( fixtureId, type, universe, address, position )
 *   - Programmer: 현재 편집 중인 라이브 값 (선택 + 값)
 *   - Group:      픽스처 묶음
 *   - Sequence:   Cue 들의 목록
 *   - Cue:        프로그래머 스냅샷
 *   - Executor:   Sequence 를 페이더/버튼에 할당해 재생
 *
 * 모든 변경은 eventBus 로 통지되어 UI / 3D / 튜토리얼이 반응한다.
 */
import { bus, EVT } from './eventBus.js';
import { FixtureLibrary, getAttrDef } from './fixtureLibrary.js';
import { execContribution } from './output.js';

const _now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class Show {
  constructor() {
    this.reset();
  }

  reset() {
    /** @type {Map<number, Fixture>} fixtureId → Fixture */
    this.fixtures = new Map();
    /** 현재 선택된 fixtureId 배열 (순서 유지) */
    this.selection = [];
    /**
     * 프로그래머: fixtureId → { attrName: value }
     * 여기에 들어있는 값만 "active"(라이브로 출력 + 저장 대상).
     */
    this.programmer = new Map();
    /** @type {Map<number, {id:number,name:string,fixtureIds:number[]}>} */
    this.groups = new Map();
    /** @type {Map<number, Sequence>} */
    this.sequences = new Map();
    /** @type {Map<number, Executor>} 버튼번호 → Executor */
    this.executors = new Map();
    /** 현재 Store 대상 시퀀스 (기본 1) */
    this.selectedSequenceId = 1;
    /** 타임코드 이벤트 목록 (영속화 대상): {id,time,buttonNo,action} */
    this.timecodeEvents = [];
    this.timecodeDuration = 20;
    /** 그랜드마스터 0~100 (전체 디머 출력 마스터) */
    this.grandMaster = 100;
    this._nextFixtureId = 1;
  }

  /** 그랜드마스터 설정(전체 디머 스케일). */
  setGrandMaster(v) {
    this.grandMaster = Math.max(0, Math.min(100, v));
    bus.emit(EVT.EXEC_CHANGED, { grandMaster: true });
    this._emitOutput();
  }

  // ──────────────────────────────────────────────────────────
  // 패치 (Patch)
  // ──────────────────────────────────────────────────────────

  /**
   * 픽스처 추가.
   * @param {Object} opts
   * @param {number} [opts.fixtureId]
   * @param {string} opts.type           FixtureLibrary 키
   * @param {number} opts.universe
   * @param {number} opts.address
   * @param {string} [opts.name]
   * @param {{x:number,y:number,z:number}} [opts.position]
   */
  patchFixture(opts) {
    const type = FixtureLibrary[opts.type];
    if (!type) throw new Error(`Unknown fixture type: ${opts.type}`);
    const fixtureId = opts.fixtureId ?? this._nextFixtureId;
    this._nextFixtureId = Math.max(this._nextFixtureId, fixtureId + 1);

    const fixture = {
      fixtureId,
      type: opts.type,
      name: opts.name || `${type.short} ${fixtureId}`,
      universe: opts.universe ?? 1,
      address: opts.address ?? 1,
      position: opts.position || { x: 0, y: 5, z: 0 },
    };
    this.fixtures.set(fixtureId, fixture);
    bus.emit(EVT.PATCH_CHANGED, { fixtureId });
    return fixture;
  }

  unpatchFixture(fixtureId) {
    this.fixtures.delete(fixtureId);
    this.programmer.delete(fixtureId);
    this.selection = this.selection.filter((id) => id !== fixtureId);
    bus.emit(EVT.PATCH_CHANGED, { fixtureId });
  }

  getFixture(id) {
    return this.fixtures.get(id);
  }

  /** universe/address 충돌(겹침) 검사 — 패치 뷰에서 경고용. */
  addressConflicts(universe, address, footprint, ignoreFixtureId = null) {
    const start = address;
    const end = address + footprint - 1;
    for (const f of this.fixtures.values()) {
      if (f.fixtureId === ignoreFixtureId) continue;
      if (f.universe !== universe) continue;
      const fType = FixtureLibrary[f.type];
      const fStart = f.address;
      const fEnd = f.address + fType.footprint - 1;
      if (start <= fEnd && end >= fStart) return f.fixtureId;
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────
  // 선택 (Selection)
  // ──────────────────────────────────────────────────────────

  setSelection(ids) {
    // 존재하는 픽스처만, 중복 제거
    const seen = new Set();
    this.selection = ids.filter((id) => {
      if (!this.fixtures.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    bus.emit(EVT.SELECTION_CHANGED, { selection: this.selection });
  }

  addToSelection(ids) {
    this.setSelection([...this.selection, ...ids]);
  }

  removeFromSelection(ids) {
    const rem = new Set(ids);
    this.setSelection(this.selection.filter((id) => !rem.has(id)));
  }

  clearSelection() {
    this.setSelection([]);
  }

  // ──────────────────────────────────────────────────────────
  // 프로그래머 (Programmer)
  // ──────────────────────────────────────────────────────────

  /** 선택된 픽스처들의 어트리뷰트 값을 프로그래머에 기록. */
  setProgrammerAttr(attrName, value, ids = this.selection) {
    for (const id of ids) {
      const fx = this.fixtures.get(id);
      if (!fx) continue;
      const def = getAttrDef(fx.type, attrName);
      if (!def) continue; // 이 픽스처 타입엔 없는 어트리뷰트
      const clamped = Math.max(def.min, Math.min(def.max, value));
      if (!this.programmer.has(id)) this.programmer.set(id, {});
      this.programmer.get(id)[attrName] = clamped;
    }
    bus.emit(EVT.PROGRAMMER_CHANGED, { attrName });
    this._emitOutput();
  }

  /** "At" 명령 — 선택 픽스처의 Dimmer 설정 (퍼센트). */
  setDimmer(value, ids = this.selection) {
    this.setProgrammerAttr('Dimmer', value, ids);
  }

  /** 프로그래머의 한 픽스처/어트리뷰트의 현재 값 (없으면 undefined). */
  getProgrammerValue(fixtureId, attrName) {
    const m = this.programmer.get(fixtureId);
    return m ? m[attrName] : undefined;
  }

  /** Clear — 프로그래머 비우기. MA3 의 Clear Clear Clear 를 단순화. */
  clearProgrammer() {
    this.programmer.clear();
    bus.emit(EVT.PROGRAMMER_CHANGED, { cleared: true });
    this._emitOutput();
  }

  /** 프로그래머에 값이 있는지 */
  hasProgrammerValues() {
    for (const m of this.programmer.values()) {
      if (Object.keys(m).length) return true;
    }
    return false;
  }

  // ──────────────────────────────────────────────────────────
  // 그룹 (Group)
  // ──────────────────────────────────────────────────────────

  storeGroup(id, name = null) {
    if (!this.selection.length) return null;
    const group = {
      id,
      name: name || `Group ${id}`,
      fixtureIds: [...this.selection],
    };
    this.groups.set(id, group);
    bus.emit(EVT.GROUP_CHANGED, { id });
    return group;
  }

  selectGroup(id) {
    const g = this.groups.get(id);
    if (g) this.setSelection([...g.fixtureIds]);
    return g;
  }

  // ──────────────────────────────────────────────────────────
  // 시퀀스 / 큐 (Sequence / Cue)
  // ──────────────────────────────────────────────────────────

  ensureSequence(id, name = null) {
    if (!this.sequences.has(id)) {
      this.sequences.set(id, {
        id,
        name: name || `Sequence ${id}`,
        cues: [],
      });
    }
    return this.sequences.get(id);
  }

  /**
   * 프로그래머 내용을 Cue 로 저장(Store).
   * @param {number} cueNo
   * @param {number} [sequenceId]
   * @param {Object} [opts] { name, fade, merge }
   */
  storeCue(cueNo, sequenceId = this.selectedSequenceId, opts = {}) {
    const seq = this.ensureSequence(sequenceId);
    // 프로그래머 스냅샷
    const values = {};
    for (const [fid, attrs] of this.programmer.entries()) {
      if (!Object.keys(attrs).length) continue;
      values[fid] = { ...attrs };
    }

    let cue = seq.cues.find((c) => c.no === cueNo);
    if (cue && opts.merge) {
      // Merge: 기존 + 프로그래머
      for (const fid in values) {
        cue.values[fid] = { ...(cue.values[fid] || {}), ...values[fid] };
      }
    } else if (cue) {
      cue.values = values; // 덮어쓰기
    } else {
      cue = {
        no: cueNo,
        name: opts.name || `Cue ${cueNo}`,
        fade: opts.fade ?? 3,
        values,
      };
      seq.cues.push(cue);
      seq.cues.sort((a, b) => a.no - b.no);
    }
    bus.emit(EVT.CUE_STORED, { sequenceId, cueNo });
    return cue;
  }

  deleteCue(cueNo, sequenceId = this.selectedSequenceId) {
    const seq = this.sequences.get(sequenceId);
    if (!seq) return;
    seq.cues = seq.cues.filter((c) => c.no !== cueNo);
    bus.emit(EVT.CUE_STORED, { sequenceId, cueNo, deleted: true });
  }

  // ──────────────────────────────────────────────────────────
  // 익스큐터 (Executor)  — 페이더 + Go/Off 버튼
  // ──────────────────────────────────────────────────────────

  assignExecutor(buttonNo, sequenceId) {
    this.ensureSequence(sequenceId);
    const exec = this.executors.get(buttonNo) || {
      buttonNo,
      sequenceId,
      fader: 100, // 페이더 0~100 (%)
      cueIndex: -1, // 아직 Go 안함
      on: false,
      fadeFrom: {}, // 페이드 시작 시점의 기여값 스냅샷
      fadeStart: 0,
      fadeDur: 0, // 초
    };
    exec.sequenceId = sequenceId;
    this.executors.set(buttonNo, exec);
    bus.emit(EVT.EXEC_CHANGED, { buttonNo });
    return exec;
  }

  setFader(buttonNo, level) {
    const exec = this.executors.get(buttonNo);
    if (!exec) return;
    exec.fader = Math.max(0, Math.min(100, level));
    bus.emit(EVT.EXEC_CHANGED, { buttonNo });
    this._emitOutput();
  }

  /** 현재 화면에 보이는 익스큐터 기여값을 페이드 시작점으로 스냅샷. */
  _startFade(exec, cue) {
    const now = _now();
    exec.fadeFrom = execContribution(this, exec, now) || {};
    exec.fadeStart = now;
    exec.fadeDur = cue ? (cue.fade ?? 3) : 0;
  }

  /** Go — 다음 큐로 진행(크로스페이드). */
  execGo(buttonNo) {
    const exec = this.executors.get(buttonNo);
    if (!exec) return;
    const seq = this.sequences.get(exec.sequenceId);
    if (!seq || !seq.cues.length) return;
    const wasOn = exec.on;
    exec.on = true;
    if (!wasOn) exec.fadeFrom = {}; // OFF 에서 시작하면 0 에서 페이드 업
    else exec.fadeFrom = execContribution(this, exec, _now()) || {};
    exec.cueIndex = (exec.cueIndex + 1) % seq.cues.length;
    const cue = seq.cues[exec.cueIndex];
    exec.fadeStart = _now();
    exec.fadeDur = cue ? (cue.fade ?? 3) : 0;
    bus.emit(EVT.CUE_FIRED, { buttonNo, cueIndex: exec.cueIndex });
    bus.emit(EVT.EXEC_CHANGED, { buttonNo });
    this._emitOutput();
  }

  execGoBack(buttonNo) {
    const exec = this.executors.get(buttonNo);
    if (!exec) return;
    const seq = this.sequences.get(exec.sequenceId);
    if (!seq || !seq.cues.length) return;
    exec.fadeFrom = exec.on ? (execContribution(this, exec, _now()) || {}) : {};
    exec.on = true;
    exec.cueIndex = (exec.cueIndex - 1 + seq.cues.length) % seq.cues.length;
    const cue = seq.cues[exec.cueIndex];
    exec.fadeStart = _now();
    exec.fadeDur = cue ? (cue.fade ?? 3) : 0;
    bus.emit(EVT.CUE_FIRED, { buttonNo, cueIndex: exec.cueIndex });
    bus.emit(EVT.EXEC_CHANGED, { buttonNo });
    this._emitOutput();
  }

  /** Off — 익스큐터 정지/해제. */
  execOff(buttonNo) {
    const exec = this.executors.get(buttonNo);
    if (!exec) return;
    exec.on = false;
    exec.cueIndex = -1;
    exec.fadeFrom = {};
    exec.fadeDur = 0;
    bus.emit(EVT.EXEC_CHANGED, { buttonNo });
    this._emitOutput();
  }

  /** 진행 중인 페이드가 하나라도 있으면 true (애니메이션 루프 게이트용). */
  anyFading(now = _now()) {
    for (const exec of this.executors.values()) {
      if (exec.on && exec.fadeDur > 0 && (now - exec.fadeStart) < exec.fadeDur * 1000) return true;
    }
    return false;
  }

  getActiveCue(buttonNo) {
    const exec = this.executors.get(buttonNo);
    if (!exec || !exec.on || exec.cueIndex < 0) return null;
    const seq = this.sequences.get(exec.sequenceId);
    if (!seq) return null;
    return seq.cues[exec.cueIndex] || null;
  }

  _emitOutput() {
    bus.emit(EVT.OUTPUT_CHANGED, {});
  }

  // ──────────────────────────────────────────────────────────
  // 직렬화 (쇼파일 저장/불러오기)
  // ──────────────────────────────────────────────────────────

  toJSON() {
    return {
      version: 1,
      app: 'ma3-simulator',
      fixtures: [...this.fixtures.values()],
      groups: [...this.groups.values()],
      sequences: [...this.sequences.values()],
      executors: [...this.executors.values()],
      selectedSequenceId: this.selectedSequenceId,
      timecodeEvents: this.timecodeEvents,
      timecodeDuration: this.timecodeDuration,
      grandMaster: this.grandMaster,
    };
  }

  _applyData(data) {
    this.reset();
    (data.fixtures || []).forEach((f) => {
      this.fixtures.set(f.fixtureId, f);
      this._nextFixtureId = Math.max(this._nextFixtureId, f.fixtureId + 1);
    });
    (data.groups || []).forEach((g) => this.groups.set(g.id, g));
    (data.sequences || []).forEach((s) => this.sequences.set(s.id, s));
    (data.executors || []).forEach((e) => this.executors.set(e.buttonNo, e));
    this.selectedSequenceId = data.selectedSequenceId || 1;
    this.timecodeEvents = data.timecodeEvents || [];
    this.timecodeDuration = data.timecodeDuration || 20;
    this.grandMaster = data.grandMaster ?? 100;
  }

  loadJSON(data) {
    this._applyData(data);
    bus.emit(EVT.SHOW_LOADED, {});
    bus.emit(EVT.PATCH_CHANGED, {});
    this._emitOutput();
  }

  // ──────────────────────────────────────────────────────────
  // Undo (Oops) — 동작 단위 스냅샷
  // ──────────────────────────────────────────────────────────

  /** 변경 직전 상태를 되돌리기 스택에 저장(프로그래머/선택 포함). */
  pushUndo() {
    if (!this._undo) this._undo = [];
    this._undo.push(JSON.stringify({
      data: this.toJSON(),
      programmer: [...this.programmer.entries()].map(([id, a]) => [id, { ...a }]),
      selection: [...this.selection],
    }));
    if (this._undo.length > 40) this._undo.shift();
  }

  /** Oops — 직전 동작 되돌리기. (패치 위치·큐·프로그래머·선택 복원, SHOW_LOADED 없이) */
  undo() {
    if (!this._undo || !this._undo.length) return false;
    const snap = JSON.parse(this._undo.pop());
    this._applyData(snap.data);
    this.programmer = new Map((snap.programmer || []).map(([id, a]) => [id, { ...a }]));
    this.selection = (snap.selection || []).filter((id) => this.fixtures.has(id));
    bus.emit(EVT.PATCH_CHANGED, {});
    bus.emit(EVT.SELECTION_CHANGED, { selection: this.selection });
    bus.emit(EVT.PROGRAMMER_CHANGED, {});
    bus.emit(EVT.EXEC_CHANGED, {});
    bus.emit(EVT.CUE_STORED, {});
    this._emitOutput();
    return true;
  }

  // ──────────────────────────────────────────────────────────
  // Update — 재생 중(또는 마지막) 큐에 프로그래머 병합
  // ──────────────────────────────────────────────────────────

  updateActiveCue() {
    // 재생 중인 익스큐터의 활성 큐 우선, 없으면 선택 시퀀스의 마지막 큐
    let target = null;
    for (const ex of [...this.executors.values()].sort((a, b) => a.buttonNo - b.buttonNo)) {
      if (ex.on && ex.cueIndex >= 0) {
        const seq = this.sequences.get(ex.sequenceId);
        const cue = seq && seq.cues[ex.cueIndex];
        if (cue) { target = { seq, cue }; break; }
      }
    }
    if (!target) {
      const seq = this.sequences.get(this.selectedSequenceId);
      if (seq && seq.cues.length) target = { seq, cue: seq.cues[seq.cues.length - 1] };
    }
    if (!target) return { ok: false };
    if (!this.hasProgrammerValues()) return { ok: false, empty: true };
    this.pushUndo();
    for (const [fid, attrs] of this.programmer.entries()) {
      if (!Object.keys(attrs).length) continue;
      target.cue.values[fid] = { ...(target.cue.values[fid] || {}), ...attrs };
    }
    bus.emit(EVT.CUE_STORED, { sequenceId: target.seq.id, cueNo: target.cue.no });
    this._emitOutput();
    return { ok: true, cueNo: target.cue.no, seqId: target.seq.id };
  }
}
