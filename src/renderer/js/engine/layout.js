/**
 * layout.js
 * 패치된 픽스처들을 3D 무대 위에 보기 좋게 자동 배치한다.
 * 타입별로 줄(row)을 나눠 트러스에 매단 느낌으로 X 축에 고르게 펼친다.
 */
import { FixtureLibrary } from './fixtureLibrary.js';

// 타입별 매다는 높이/깊이(z)
const RIG = {
  movingHead: { y: 10, z: -5 },
  ledPar: { y: 9, z: 3 },
  dimmer: { y: 9, z: 3 },
  strobe: { y: 10.5, z: -5 },
};

export function reflowPositions(show) {
  // 타입별로 묶기
  const byType = new Map();
  for (const fx of [...show.fixtures.values()].sort((a, b) => a.fixtureId - b.fixtureId)) {
    if (!byType.has(fx.type)) byType.set(fx.type, []);
    byType.get(fx.type).push(fx);
  }
  for (const [type, list] of byType) {
    const rig = RIG[type] || { y: 11, z: 0 };
    const n = list.length;
    const spread = Math.min(30, Math.max(8, n * 2.4));
    list.forEach((fx, i) => {
      const x = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
      fx.position = { x, y: rig.y, z: rig.z };
    });
  }
}

/** 데모용 기본 쇼: LED PAR 10대 + 무빙헤드 4대 + 스트로브 2대. */
export function buildDemoShow(show) {
  show.reset();
  let id = 1;
  let addr = 1;
  for (let i = 0; i < 10; i++) {
    show.patchFixture({ fixtureId: id++, type: 'ledPar', universe: 1, address: addr });
    addr += FixtureLibrary.ledPar.footprint;
  }
  addr = 101;
  for (let i = 0; i < 4; i++) {
    show.patchFixture({ fixtureId: id++, type: 'movingHead', universe: 1, address: addr });
    addr += FixtureLibrary.movingHead.footprint;
  }
  addr = 201;
  for (let i = 0; i < 2; i++) {
    show.patchFixture({ fixtureId: id++, type: 'strobe', universe: 1, address: addr });
    addr += FixtureLibrary.strobe.footprint;
  }
  reflowPositions(show);
  // 기본 시퀀스/익스큐터 준비 (큐가 생기면 바로 재생 가능)
  show.ensureSequence(1, 'Main');
  show.assignExecutor(201, 1);
}
