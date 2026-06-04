/**
 * layout.js
 * 패치된 픽스처들을 3D 무대 위에 자동 배치 + 데모 쇼 구성.
 */
import { FixtureLibrary } from './fixtureLibrary.js';

// 타입별 매다는 높이(트림)/깊이(z)
const RIG = {
  ledPar: { y: 9, z: 3 },
  ledBar: { y: 9, z: 4 },
  dimmer: { y: 9, z: 3 },
  wash: { y: 10, z: -1 },
  spot: { y: 10.6, z: -4 },
  hybrid: { y: 10.6, z: -4 },
  beam: { y: 11, z: -7 },
  strobe: { y: 11, z: -8 },
};

export function reflowPositions(show) {
  const byType = new Map();
  for (const fx of [...show.fixtures.values()].sort((a, b) => a.fixtureId - b.fixtureId)) {
    if (!byType.has(fx.type)) byType.set(fx.type, []);
    byType.get(fx.type).push(fx);
  }
  for (const [type, list] of byType) {
    const rig = RIG[type] || { y: 10, z: 0 };
    const n = list.length;
    const spread = Math.min(32, Math.max(8, n * 2.6));
    list.forEach((fx, i) => {
      const x = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
      fx.position = { x, y: rig.y, z: rig.z };
    });
  }
}

/** 데모용 기본 쇼: 다양한 종류의 대표 기종을 고루 패치. */
export function buildDemoShow(show) {
  show.reset();
  let id = 1, addr = 1;
  const add = (type, count) => {
    const fp = FixtureLibrary[type].footprint;
    for (let i = 0; i < count; i++) {
      if (addr + fp - 1 > 512) { addr = 1; } // 단순 보호
      show.patchFixture({ fixtureId: id++, type, universe: 1, address: addr });
      addr += fp;
    }
  };
  add('ledPar', 10);  // 1–10
  add('wash', 4);     // 11–14 (RGB 무빙 워시)
  add('spot', 4);     // 15–18 (CMY 프로파일)
  add('beam', 4);     // 19–22 (빔)
  add('hybrid', 2);   // 23–24
  add('strobe', 2);   // 25–26

  reflowPositions(show);
  show.ensureSequence(1, 'Main');
  show.assignExecutor(201, 1);
}
