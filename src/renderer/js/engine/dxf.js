/**
 * dxf.js
 * 경량 DXF(ASCII) 파서 — 라이트 도면에서 조명 블록을 추출한다.
 *
 * DWG(오토캐드 바이너리)는 직접 못 읽으므로, 같은 캐드에서 DXF 로 내보낸 파일을 대상으로 한다.
 * 조명 도면에서 픽스처는 보통 블록 참조(INSERT)로 그려지고,
 * 채널/주소 등은 블록 속성(ATTRIB)에 들어있다.
 *
 * 추출 대상:
 *   - INSERT: 블록 이름(code 2), 삽입점(10/20/30), 회전(50), 레이어(8)
 *   - 뒤따르는 ATTRIB: 태그(code 2) → 값(code 1)
 */

/**
 * @returns {{ inserts: Array<{block:string,x:number,y:number,z:number,rot:number,layer:string,attribs:Object}>,
 *             blocks: Array<{name:string,count:number}>,
 *             tags: string[] }}
 */
export function parseDxf(text) {
  const rawLines = text.split(/\r\n|\r|\n/);
  // (code,value) 쌍으로 변환
  const pairs = [];
  for (let i = 0; i + 1 < rawLines.length; i += 2) {
    const code = parseInt(rawLines[i].trim(), 10);
    if (Number.isNaN(code)) { i -= 1; continue; } // 정렬 어긋남 보정
    pairs.push([code, (rawLines[i + 1] ?? '').trim()]);
  }

  const inserts = [];
  let cur = null;       // 현재 INSERT
  let curAttrib = null; // 현재 ATTRIB

  const commitAttrib = () => {
    if (curAttrib && cur && curAttrib.tag) cur.attribs[curAttrib.tag] = curAttrib.value;
    curAttrib = null;
  };

  for (const [code, val] of pairs) {
    if (code === 0) {
      commitAttrib();
      if (val === 'ATTRIB') { curAttrib = { tag: '', value: '' }; continue; }
      // 새 엔티티 경계 → 진행 중이던 INSERT 종료(SEQEND 제외)
      if (cur && val !== 'SEQEND') { inserts.push(cur); cur = null; }
      if (val === 'SEQEND') { if (cur) { inserts.push(cur); cur = null; } continue; }
      if (val === 'INSERT') { cur = { block: '', x: 0, y: 0, z: 0, rot: 0, layer: '', attribs: {} }; }
      continue;
    }
    if (curAttrib) {
      if (code === 2) curAttrib.tag = val;
      else if (code === 1) curAttrib.value = val;
    } else if (cur) {
      if (code === 2) cur.block = val;
      else if (code === 8) cur.layer = val;
      else if (code === 10) cur.x = parseFloat(val) || 0;
      else if (code === 20) cur.y = parseFloat(val) || 0;
      else if (code === 30) cur.z = parseFloat(val) || 0;
      else if (code === 50) cur.rot = parseFloat(val) || 0;
    }
  }
  commitAttrib();
  if (cur) inserts.push(cur);

  // 블록 통계 + 속성 태그 모음
  const blockMap = new Map();
  const tagSet = new Set();
  for (const ins of inserts) {
    blockMap.set(ins.block, (blockMap.get(ins.block) || 0) + 1);
    Object.keys(ins.attribs).forEach((t) => tagSet.add(t));
  }
  const blocks = [...blockMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return { inserts, blocks, tags: [...tagSet] };
}

/** 블록/레이어 이름으로 픽스처 타입 추정. */
export function guessType(name = '') {
  const s = name.toLowerCase();
  if (/(strob|blind|atomic|jdc|sparky)/.test(s)) return 'strobe';
  if (/(hybrid|megapointe|mega ?pointe|mythos|pointe|robin ?point)/.test(s)) return 'hybrid';
  if (/(beam|sharpy|7r|5r|9r|10r)/.test(s)) return 'beam';
  if (/(wash|aura|spiider|rush ?wash|x4|jarag)/.test(s)) return 'wash';
  if (/(spot|profile|viper|t1|t2|axcor|scenius|esprit|tarrantula|source ?four led)/.test(s)) return 'spot';
  if (/(mover|moving|head|mac|clay|martin|robe|ayrton|glp|vari|hes)/.test(s)) return 'spot';
  if (/(bar|batten|pixel|cob ?bar)/.test(s)) return 'ledBar';
  if (/(par|led|rgb|cyc|fresnel|color)/.test(s)) return 'ledPar';
  if (/(dim|conv|source ?four|s4|generic|flood)/.test(s)) return 'dimmer';
  return 'ledPar';
}

/** 속성 태그 중 채널/주소/유니버스로 보이는 것 추정. */
export function guessTagRoles(tags) {
  const find = (re) => tags.find((t) => re.test(t.toLowerCase())) || '';
  return {
    fid: find(/(channel|chan|^ch$|unit|fixture|fid|^id$)/),
    address: find(/(address|addr|dmx|patch)/),
    universe: find(/(universe|uni|line)/),
  };
}

/**
 * 도면 좌표(평면도 XY)를 무대 좌표(X, Z)로 자동 맞춤.
 * @param {Array} pts [{x,y}]
 * @param {number} targetWidth 무대 가로 폭(유닛)
 * @returns {(p:{x:number,y:number}) => {x:number,z:number}}
 */
export function makeAutoFit(pts, targetWidth = 34) {
  if (!pts.length) return (p) => ({ x: 0, z: 0 });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const w = Math.max(maxX - minX, 0.001);
  const h = Math.max(maxY - minY, 0.001);
  const scale = targetWidth / Math.max(w, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // 캐드 평면도: +Y = 무대 뒤쪽(업스테이지) → 무대 -Z 로 매핑
  return (p) => ({ x: (p.x - cx) * scale, z: -(p.y - cy) * scale });
}
