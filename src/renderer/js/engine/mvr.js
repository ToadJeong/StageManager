/**
 * mvr.js
 * MVR(My Virtual Rig, .mvr) 가져오기.
 *
 * MVR 은 ZIP 아카이브이며 안에 GeneralSceneDescription.xml 이 들어있다.
 * 이 XML 의 <Fixture> 들에서 이름·GDTF 타입·주소·FixtureID·위치(Matrix)를 추출한다.
 * Vectorworks 등에서 "MVR 내보내기"로 만든 리그를 콘솔/비주얼라이저로 옮기는 표준 경로.
 *
 * 반환 형태는 dxf.js 의 parseDxf 와 동일하게 맞춰, 기존 매핑/등록 UI 를 그대로 재사용한다.
 */
import { unzipSync, strFromU8 } from '../../vendor/fflate.module.js';

/**
 * @param {ArrayBuffer} arrayBuffer .mvr 파일 내용
 * @returns {{ inserts: Array, blocks: Array<{name:string,count:number}>, tags: string[] }}
 */
export function parseMvr(arrayBuffer) {
  const files = unzipSync(new Uint8Array(arrayBuffer));
  // GeneralSceneDescription.xml 찾기
  const key = Object.keys(files).find((k) => /GeneralSceneDescription\.xml$/i.test(k));
  if (!key) throw new Error('GeneralSceneDescription.xml not found in MVR');
  const xmlText = strFromU8(files[key]);

  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('MVR XML parse error');

  const inserts = [];
  for (const fx of doc.querySelectorAll('Fixture')) {
    const name = fx.getAttribute('name') || '';
    const gdtf = text(fx, 'GDTFSpec') || name || 'Fixture';
    const fid = text(fx, 'FixtureID');
    const layer = closestLayerName(fx);

    // 주소: <Addresses><Address break="0">절대주소</Address>
    const addrEl = fx.querySelector('Addresses Address') || fx.querySelector('Address');
    const absAddr = addrEl ? parseInt(addrEl.textContent, 10) : NaN;
    let universe = 1, address = NaN;
    if (!Number.isNaN(absAddr)) {
      if (absAddr > 512) { universe = Math.floor((absAddr - 1) / 512) + 1; address = ((absAddr - 1) % 512) + 1; }
      else { address = absAddr; }
    }

    // 위치: <Matrix>{..}{..}{..}{ox,oy,oz}</Matrix>  (mm)
    const m = text(fx, 'Matrix');
    let px = 0, py = 0;
    if (m) {
      const groups = m.match(/\{([^}]*)\}/g) || [];
      if (groups.length) {
        const last = groups[groups.length - 1].replace(/[{}]/g, '').split(',').map((s) => parseFloat(s));
        // MVR 은 Z-up: (x, y, z=height). 평면 배치에는 x,y 사용.
        px = last[0] || 0; py = last[1] || 0;
      }
    }

    inserts.push({
      block: gdtf,
      x: px, y: py, z: 0, rot: 0, layer,
      attribs: {
        FID: fid || '',
        ADDRESS: Number.isNaN(address) ? '' : String(address),
        UNIVERSE: String(universe),
      },
    });
  }

  const blockMap = new Map();
  for (const ins of inserts) blockMap.set(ins.block, (blockMap.get(ins.block) || 0) + 1);
  const blocks = [...blockMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return { inserts, blocks, tags: ['FID', 'ADDRESS', 'UNIVERSE'] };
}

function text(parent, tag) {
  const el = parent.querySelector(tag);
  return el ? el.textContent.trim() : '';
}

function closestLayerName(fx) {
  let n = fx.parentElement;
  while (n) {
    if (n.tagName === 'Layer') return n.getAttribute('name') || '';
    n = n.parentElement;
  }
  return '';
}
