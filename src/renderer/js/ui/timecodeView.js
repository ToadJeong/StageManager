/**
 * timecodeView.js
 * 타임코드 화면 — 트랜스포트(재생/정지) + 타임라인 + 이벤트 편집.
 *
 * 시간 축에 "몇 초에 어느 익스큐터를 Go" 를 배치하고 재생하면 자동 실행된다.
 */
import { bus, EVT } from '../engine/eventBus.js';
import { fmtTime } from '../engine/timecode.js';
import { bi, tt, toast } from '../i18n.js';

export class TimecodeView {
  constructor(show, timecode, el) {
    this.show = show;
    this.tc = timecode;
    this.el = el;
    bus.on(EVT.TC_CHANGED, () => this.render());
    bus.on(EVT.EXEC_CHANGED, () => this.render());
    bus.on(EVT.CUE_STORED, () => this.render());
    bus.on(EVT.SHOW_LOADED, () => this.render());
    // 재생 위치는 가볍게 갱신
    bus.on(EVT.TC_TICK, (p) => this._updatePlayhead(p.position));
  }

  _execOptions() {
    const keys = [...this.show.executors.keys()].sort((a, b) => a - b);
    if (!keys.length) return '<option value="201">201</option>';
    return keys.map((k) => `<option value="${k}">${k}</option>`).join('');
  }

  render() {
    const tc = this.tc;
    const dur = tc.duration;
    const markers = tc.events.map((ev) => {
      const left = Math.min(100, (ev.time / dur) * 100);
      const label = ev.action === 'go' ? 'Go' : ev.action === 'off' ? 'Off' : '◀';
      return `<div class="tc-marker" style="left:${left}%" title="${ev.time}s · Ex${ev.buttonNo} ${label}">
                <span>${ev.buttonNo}·${label}</span></div>`;
    }).join('');

    const rows = tc.events.map((ev) => `
      <tr>
        <td>${fmtTime(ev.time)}</td>
        <td>${ev.time.toFixed(2)}s</td>
        <td>Executor ${ev.buttonNo}</td>
        <td>${ev.action.toUpperCase()}</td>
        <td><button class="tc-del" data-id="${ev.id}">✕</button></td>
      </tr>`).join('');

    this.el.innerHTML = `
      <div class="tc-wrap">
        <h2>${bi('타임코드 / Timecode')}</h2>
        <p class="hint-line">${bi('시간 축에 이벤트를 배치하고 ▶ 를 누르면 그 시각에 익스큐터 Go 가 자동 실행됩니다.', 'Place events on the timeline; press ▶ and each fires its executor Go at its time.')}</p>

        <div class="tc-transport">
          <button id="tc-play" class="primary">${tc.playing ? '⏸' : '▶'}</button>
          <button id="tc-stop">⏹</button>
          <span id="tc-time" class="tc-time">${fmtTime(tc.position)}</span>
          <span class="tc-dur">/ ${fmtTime(dur)}</span>
          <label class="tc-durinput">${bi('길이(초)', 'Length(s)')}
            <input id="tc-duration" type="number" min="2" max="600" value="${dur}"></label>
        </div>

        <div class="tc-audio">
          <button id="tc-loadaudio">${bi('🎵 음악 불러오기', '🎵 Load music')}</button>
          <span class="tc-audioname">${tc.audioName ? '♪ ' + tc.audioName : bi('음악 없음 (내부 클럭으로 재생)', 'No music (internal clock)')}</span>
          ${tc.audioName ? `<button id="tc-clearaudio">${bi('제거', 'Remove')}</button>` : ''}
          <input id="tc-audiofile" type="file" accept="audio/*" hidden>
        </div>

        <div class="tc-timeline" id="tc-timeline">
          <div class="tc-playhead" id="tc-playhead" style="left:${(tc.position / dur) * 100}%"></div>
          ${markers}
        </div>

        <div class="tc-addrow">
          <label>${bi('시간(초)', 'Time(s)')}<input id="tc-t" type="number" min="0" step="0.5" value="2"></label>
          <label>${bi('익스큐터', 'Executor')}<select id="tc-x">${this._execOptions()}</select></label>
          <label>${bi('동작', 'Action')}<select id="tc-a">
            <option value="go">Go</option><option value="goback">GoBack</option><option value="off">Off</option></select></label>
          <button id="tc-add" class="primary">${bi('이벤트 추가', 'Add event')}</button>
          <button id="tc-example">${bi('예제 채우기', 'Load example')}</button>
          <button id="tc-clear">${bi('전체 삭제', 'Clear all')}</button>
        </div>

        <table class="tc-table">
          <thead><tr><th>${bi('타임코드', 'TC')}</th><th>${bi('초', 'sec')}</th><th>${bi('대상', 'Target')}</th><th>${bi('동작', 'Action')}</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="empty-note">${bi('이벤트 없음', 'No events')}</td></tr>`}</tbody>
        </table>
      </div>`;

    this.el.querySelector('#tc-play').onclick = () => {
      if (tc.playing) tc.pause(); else tc.play(performance.now());
    };
    this.el.querySelector('#tc-stop').onclick = () => tc.stop();
    this.el.querySelector('#tc-duration').onchange = (e) => { tc.duration = parseFloat(e.target.value) || 20; };
    this.el.querySelector('#tc-add').onclick = () => {
      const t = parseFloat(this.el.querySelector('#tc-t').value) || 0;
      const x = parseInt(this.el.querySelector('#tc-x').value, 10);
      const a = this.el.querySelector('#tc-a').value;
      tc.addEvent(t, x, a);
    };
    this.el.querySelector('#tc-example').onclick = () => this._loadExample();
    this.el.querySelector('#tc-clear').onclick = () => tc.clearEvents();
    this.el.querySelector('#tc-loadaudio').onclick = () => this.el.querySelector('#tc-audiofile').click();
    this.el.querySelector('#tc-audiofile').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      tc.setAudio(url, file.name);
      toast({ ko: `음악 로드: ${file.name}`, en: `Music loaded: ${file.name}` });
      e.target.value = '';
    };
    const clr = this.el.querySelector('#tc-clearaudio');
    if (clr) clr.onclick = () => tc.clearAudio();
    this.el.querySelectorAll('.tc-del').forEach((b) => b.onclick = () => tc.removeEvent(parseInt(b.dataset.id, 10)));
    // 타임라인 클릭 → 스크럽
    this.el.querySelector('#tc-timeline').onclick = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      tc.goto(ratio * tc.duration);
    };
  }

  _updatePlayhead(position) {
    const ph = this.el.querySelector('#tc-playhead');
    const tm = this.el.querySelector('#tc-time');
    const playBtn = this.el.querySelector('#tc-play');
    if (ph) ph.style.left = `${(position / this.tc.duration) * 100}%`;
    if (tm) tm.textContent = fmtTime(position);
    if (playBtn) playBtn.textContent = this.tc.playing ? '⏸' : '▶';
  }

  _loadExample() {
    const seq = this.show.sequences.get(this.show.selectedSequenceId);
    const cueCount = seq ? seq.cues.length : 0;
    if (cueCount < 2) {
      toast({ ko: '먼저 큐를 2개 이상 저장하세요 (Store Cue 1, 2 …)', en: 'Store at least 2 cues first' }, 'err');
      return;
    }
    const btn = [...this.show.executors.keys()].sort((a, b) => a - b)[0] ?? 201;
    this.tc.clearEvents();
    this.tc.duration = Math.max(12, cueCount * 4);
    for (let i = 0; i < cueCount; i++) this.tc.addEvent(1 + i * 3.5, btn, 'go');
    toast({ ko: '예제 타임코드 생성됨 — ▶ 로 재생', en: 'Example timecode created — press ▶' });
  }
}
