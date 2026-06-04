/**
 * commandLine.js
 * grandMA3 스타일 커맨드라인 파서/실행기.
 *
 * 지원 문법 (대소문자 무시):
 *   선택      Fixture 1 / Fixture 1 Thru 10 / 1 + 3 + 5 / 1 Thru 10 - 5 / Group 2
 *   값        At 100 / At Full / At Out / Fixture 1 Thru 5 At 50
 *   저장      Store Cue 1 / Store Group 3 / Store Cue 2 Sequence 4
 *   삭제      Delete Cue 1 / Delete Group 3
 *   클리어    Clear
 *   재생      Go / Go Executor 201 / Off / Off Executor 201 / GoBack Executor 201
 *   홈        Home   (선택 픽스처를 기본값으로)
 *
 * 실제 MA3 의 모든 문법을 구현하지는 않지만, 학습에 핵심적인 흐름을 충실히 따른다.
 */
import { FixtureLibrary } from './fixtureLibrary.js';

const VERBS = new Set(['store', 'delete', 'del', 'clear', 'go', 'goback', 'off', 'home', 'update', 'copy']);

/** 커맨드 문자열 → 토큰 배열. */
export function tokenize(str) {
  const tokens = [];
  const re = /\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z]+|[+\-])\s*/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const raw = m[1];
    if (/^[0-9]/.test(raw)) {
      tokens.push({ t: 'num', v: parseFloat(raw) });
    } else if (raw === '+' || raw === '-') {
      tokens.push({ t: 'op', v: raw });
    } else {
      tokens.push({ t: 'kw', v: raw.toLowerCase(), raw });
    }
  }
  return tokens;
}

const KW = {
  fixture: ['fixture', 'fix', 'f'],
  group: ['group', 'grp', 'g'],
  thru: ['thru', 'through'],
  at: ['at'],
  full: ['full'],
  out: ['out', 'zero'],
  store: ['store'],
  cue: ['cue', 'q'],
  sequence: ['sequence', 'seq'],
  executor: ['executor', 'exec', 'x'],
  delete: ['delete', 'del'],
  clear: ['clear', 'clr'],
  go: ['go'],
  goback: ['goback', 'back'],
  off: ['off'],
  home: ['home'],
};

function isKw(tok, name) {
  return tok && tok.t === 'kw' && KW[name].includes(tok.v);
}

/**
 * 선택자(범위) 평가. 토큰 배열의 i 위치부터 픽스처 id 목록을 만든다.
 * @returns {{ ids:number[], next:number }}
 */
function evalSelector(show, tokens, i) {
  const maxId = Math.max(0, ...[...show.fixtures.keys()]);
  let ids = [];
  let op = '+'; // 누적 연산
  let started = false;

  function apply(list) {
    if (op === '-') {
      const rem = new Set(list);
      ids = ids.filter((x) => !rem.has(x));
    } else {
      ids.push(...list);
    }
  }

  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.t === 'op') {
      op = tok.v;
      i++;
      continue;
    }
    if (tok.t === 'num') {
      const start = tok.v;
      // Thru 이어지나?
      if (tokens[i + 1] && isKw(tokens[i + 1], 'thru')) {
        const after = tokens[i + 2];
        let end;
        if (after && after.t === 'num') {
          end = after.v;
          i += 3;
        } else {
          end = maxId; // 개방형: "1 Thru"
          i += 2;
        }
        const range = [];
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        for (let n = lo; n <= hi; n++) range.push(n);
        apply(range);
      } else {
        apply([start]);
        i++;
      }
      started = true;
      op = '+';
      continue;
    }
    // 다른 키워드를 만나면 선택자 종료
    break;
  }
  return { ids: started ? ids : null, next: i };
}

/** "At" 의 값 토큰을 퍼센트로 해석. */
function evalAtValue(tokens, i) {
  const tok = tokens[i];
  if (!tok) return { value: null, next: i };
  if (tok.t === 'num') return { value: tok.v, next: i + 1 };
  if (isKw(tok, 'full')) return { value: 100, next: i + 1 };
  if (isKw(tok, 'out')) return { value: 0, next: i + 1 };
  return { value: null, next: i };
}

function msg(ko, en) {
  return { ko, en };
}

/**
 * 커맨드 실행.
 * @param {import('./show.js').Show} show
 * @param {string} commandStr
 * @returns {{ ok:boolean, message:{ko:string,en:string} }}
 */
export function executeCommand(show, commandStr) {
  const tokens = tokenize(commandStr);
  if (!tokens.length) return { ok: false, message: msg('빈 명령', 'Empty command') };

  const first = tokens[0];

  // ── 동사형 명령 ──────────────────────────────────────────
  if (first.t === 'kw' && VERBS.has(first.v)) {
    // Clear
    if (isKw(first, 'clear')) {
      show.clearProgrammer();
      return { ok: true, message: msg('프로그래머 클리어', 'Programmer cleared') };
    }
    // Home
    if (isKw(first, 'home')) {
      for (const id of show.selection) {
        const fx = show.getFixture(id);
        if (!fx) continue;
        for (const a of FixtureLibrary[fx.type].attributes) {
          show.setProgrammerAttr(a.name, a.home, [id]);
        }
      }
      return { ok: true, message: msg('홈 값 적용', 'Set to home values') };
    }
    // Store
    if (isKw(first, 'store')) {
      let i = 1;
      if (isKw(tokens[i], 'cue')) {
        const noTok = tokens[i + 1];
        if (!noTok || noTok.t !== 'num') return { ok: false, message: msg('Cue 번호 필요', 'Cue number required') };
        let seqId = show.selectedSequenceId;
        if (isKw(tokens[i + 2], 'sequence') && tokens[i + 3] && tokens[i + 3].t === 'num') {
          seqId = tokens[i + 3].v;
          show.selectedSequenceId = seqId;
        }
        if (!show.hasProgrammerValues()) {
          return { ok: false, message: msg('프로그래머가 비어있음 — 먼저 값을 만드세요', 'Programmer empty — set values first') };
        }
        show.storeCue(noTok.v, seqId, { merge: true });
        return { ok: true, message: msg(`Cue ${noTok.v} 저장됨 (Seq ${seqId})`, `Stored Cue ${noTok.v} (Seq ${seqId})`) };
      }
      if (isKw(tokens[i], 'group')) {
        const noTok = tokens[i + 1];
        if (!noTok || noTok.t !== 'num') return { ok: false, message: msg('Group 번호 필요', 'Group number required') };
        if (!show.selection.length) return { ok: false, message: msg('선택된 픽스처 없음', 'Nothing selected') };
        show.storeGroup(noTok.v);
        return { ok: true, message: msg(`Group ${noTok.v} 저장됨`, `Stored Group ${noTok.v}`) };
      }
      return { ok: false, message: msg('Store 대상(Cue/Group) 필요', 'Specify Store target (Cue/Group)') };
    }
    // Delete
    if (isKw(first, 'delete')) {
      let i = 1;
      if (isKw(tokens[i], 'cue') && tokens[i + 1] && tokens[i + 1].t === 'num') {
        show.deleteCue(tokens[i + 1].v);
        return { ok: true, message: msg(`Cue ${tokens[i + 1].v} 삭제`, `Deleted Cue ${tokens[i + 1].v}`) };
      }
      if (isKw(tokens[i], 'group') && tokens[i + 1] && tokens[i + 1].t === 'num') {
        show.groups.delete(tokens[i + 1].v);
        return { ok: true, message: msg(`Group ${tokens[i + 1].v} 삭제`, `Deleted Group ${tokens[i + 1].v}`) };
      }
      return { ok: false, message: msg('Delete 대상 필요', 'Specify Delete target') };
    }
    // Go / GoBack / Off
    if (isKw(first, 'go') || isKw(first, 'goback') || isKw(first, 'off')) {
      let buttonNo = null;
      // Go Executor 201
      if (isKw(tokens[1], 'executor') && tokens[2] && tokens[2].t === 'num') {
        buttonNo = tokens[2].v;
      } else {
        // 기본: 가장 낮은 번호의 익스큐터
        const keys = [...show.executors.keys()].sort((a, b) => a - b);
        buttonNo = keys[0] ?? null;
      }
      if (buttonNo == null) return { ok: false, message: msg('익스큐터 없음', 'No executor assigned') };
      if (isKw(first, 'go')) show.execGo(buttonNo);
      else if (isKw(first, 'goback')) show.execGoBack(buttonNo);
      else show.execOff(buttonNo);
      const verb = isKw(first, 'go') ? 'Go' : isKw(first, 'goback') ? 'GoBack' : 'Off';
      return { ok: true, message: msg(`Executor ${buttonNo} ${verb}`, `Executor ${buttonNo} ${verb}`) };
    }
  }

  // ── 선택 + 값 명령 ───────────────────────────────────────
  let i = 0;
  let selectorIds = null;

  if (isKw(first, 'group')) {
    const noTok = tokens[1];
    if (!noTok || noTok.t !== 'num') return { ok: false, message: msg('Group 번호 필요', 'Group number required') };
    const g = show.selectGroup(noTok.v);
    if (!g) return { ok: false, message: msg(`Group ${noTok.v} 없음`, `Group ${noTok.v} not found`) };
    i = 2;
    selectorIds = [...g.fixtureIds];
  } else {
    if (isKw(first, 'fixture')) i = 1;
    const sel = evalSelector(show, tokens, i);
    if (sel.ids !== null) {
      selectorIds = sel.ids;
      i = sel.next;
    }
  }

  // 선택 적용
  if (selectorIds !== null) {
    show.setSelection(selectorIds);
  }

  // At 값
  if (isKw(tokens[i], 'at')) {
    const { value, next } = evalAtValue(tokens, i + 1);
    if (value === null) return { ok: false, message: msg('At 값이 올바르지 않음', 'Invalid At value') };
    if (!show.selection.length) return { ok: false, message: msg('선택된 픽스처 없음', 'Nothing selected') };
    show.setDimmer(value);
    i = next;
    return { ok: true, message: msg(`At ${value}% 적용 (${show.selection.length}개)`, `Set ${value}% on ${show.selection.length} fixture(s)`) };
  }

  if (selectorIds !== null) {
    return { ok: true, message: msg(`${show.selection.length}개 선택됨`, `Selected ${show.selection.length} fixture(s)`) };
  }

  return { ok: false, message: msg('명령을 이해하지 못함', 'Could not parse command') };
}
