import { enemyMaxHp, enemyGold } from '../src/game/data/enemies';
import { unitDps, heroTapBase } from '../src/game/stats';
import { fmt } from '../src/game/numbers';
for (const st of [10, 30, 50, 80, 100, 150, 200]) console.log('stage', st, 'hp', fmt(enemyMaxHp(st, false)), 'boss', fmt(enemyMaxHp(st, true)), 'gold', fmt(enemyGold(st, false)));
for (const l of [10, 50, 100, 200, 300, 400]) console.log('hero', l, fmt(heroTapBase('skeleton', l)), 'zombies dps', fmt(unitDps('zombies', l)), 'reapers', fmt(unitDps('reapers', l)));
