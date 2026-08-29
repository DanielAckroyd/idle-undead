import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'sprites');

const C = {
  ink: '#171321', shadow: '#292238', iron: '#4b5362', steel: '#727b88',
  bone: '#ded8b0', boneHi: '#f2edcf', green: '#759447', rot: '#9dbc5b',
  purple: '#6f498f', spirit: '#9c7ac2', glow: '#b9f2cf', blood: '#9e3045',
  red: '#d55252', brown: '#654638', leather: '#8b6042', gold: '#d7ad4c',
  white: '#eee7dc', black: '#211927', orange: '#d8703e', blue: '#668bb4',
};

const r = (x, y, w, h, fill, opacity) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${opacity == null ? '' : ` opacity="${opacity}"`}/>`;
const many = (blocks) => blocks.map((b) => r(...b));
const mirror = (blocks) => blocks.flatMap(([x, y, w, h, fill, opacity]) => [
  r(x, y, w, h, fill, opacity), r(64 - x - w, y, w, h, fill, opacity),
]);

function svg(title, parts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges"><title>${title}</title>${parts.flat(Infinity).join('')}</svg>\n`;
}

function humanoid({ skin = C.bone, body = C.iron, accent = C.purple, eyes = C.glow, wide = false } = {}) {
  const x = wide ? 16 : 20;
  const w = wide ? 32 : 24;
  return [
    r(x, 24, w, 24, C.ink), r(x + 4, 28, w - 8, 20, body),
    r(24, 12, 16, 16, C.ink), r(28, 16, 12, 12, skin),
    r(28, 20, 4, 4, eyes), r(36, 20, 4, 4, eyes),
    r(x - 4, 28, 8, 20, C.ink), r(x + w - 4, 28, 8, 20, C.ink),
    r(20, 44, 12, 12, C.ink), r(36, 44, 12, 12, C.ink),
    r(24, 32, 16, 4, accent), r(24, 48, 8, 8, body), r(36, 48, 8, 8, body),
  ];
}

const ground = () => [r(12, 56, 40, 4, C.ink), r(20, 52, 24, 4, C.shadow)];
const glow = (color) => [r(12, 12, 40, 40, color, .12), r(8, 24, 48, 20, color, .1)];
const crown = (color = C.gold) => many([[20,8,4,8,color],[28,4,8,12,color],[40,8,4,8,color],[20,12,24,4,C.ink],[24,12,16,4,color]]);
const horns = (color = C.bone) => mirror([[12,8,4,12,color],[16,12,4,8,color]]);
const cape = (color = C.purple) => many([[16,24,32,4,C.ink],[12,28,40,20,C.ink],[16,28,32,24,color],[12,48,12,8,color],[40,48,12,8,color]]);
const shield = (color, sun = false) => [
  r(8,28,16,24,C.ink), r(12,32,12,16,color), r(16,48,4,4,C.ink),
  ...(sun ? [r(16,32,4,16,C.gold),r(12,36,12,4,C.gold)] : []),
];
const sword = (color = C.steel, x = 48) => [r(x,16,4,28,C.ink),r(x,12,4,28,color),r(x-4,40,12,4,C.gold),r(x,44,4,12,C.brown)];
const axe = (color = C.steel, x = 48) => [r(x,20,4,36,C.brown),r(x-8,12,12,12,C.ink),r(x-4,16,12,12,color)];
const staff = (gem = C.glow, x = 48) => [r(x,16,4,40,C.brown),r(x-4,8,12,12,C.ink),r(x,12,4,4,gem),r(x-8,20,4,4,gem)];
const spear = (color = C.steel, x = 48) => [r(x,8,4,48,C.brown),r(x-4,4,12,8,color),r(x,0,4,4,C.white)];
const bow = (color = C.brown, x = 48) => [r(x,12,4,8,color),r(x+4,16,4,8,color),r(x+8,24,4,16,color),r(x+4,40,4,8,color),r(x,48,4,8,color),r(x,16,4,36,C.boneHi),r(x-4,32,12,4,C.steel)];
const wings = (color, large = false) => {
  const b = large ? [[4,16,12,8],[0,20,16,12],[4,32,12,12],[8,44,12,8]] : [[8,20,12,8],[4,24,12,12],[8,36,12,8]];
  return mirror(b.map(([x,y,w,h]) => [x,y,w,h,C.ink])).concat(mirror(b.map(([x,y,w,h]) => [x+4,y+4,w-4,h-4,color])));
};
const sunburst = (color) => [r(28,0,8,12,color,.75),r(28,48,8,12,color,.75),r(4,28,12,8,color,.75),r(48,28,12,8,color,.75),r(12,12,8,8,color,.55),r(44,12,8,8,color,.55),r(12,44,8,8,color,.55),r(44,44,8,8,color,.55)];
const stitches = () => [r(20,28,12,4,C.ink),r(24,24,4,12,C.bone),r(36,40,12,4,C.ink),r(40,36,4,12,C.bone)];

function ghost(tier) {
  const p = [glow(C.spirit)];
  if (tier === 3) p.push(crown(C.spirit), wings(C.purple));
  p.push(r(tier === 1 ? 20 : 16,16,tier === 1 ? 24 : 32,32,C.ink),r(24,16,16,12,C.spirit),r(20,28,24,16,C.purple),r(16,40,12,12,C.spirit),r(28,40,8,16,C.spirit),r(40,40,8,12,C.spirit),r(28,20,4,4,C.glow),r(36,20,4,4,C.glow));
  if (tier > 1) p.push(r(8,28,12,4,C.spirit),r(44,28,12,4,C.spirit),tier === 2 ? axe(C.spirit,48) : staff(C.glow,48));
  return p;
}

function classSprite(id, tier) {
  if (id === 'ghost') return ghost(tier);
  if (id === 'skeleton') {
    if (tier === 1) return [humanoid({body:C.bone,accent:C.shadow}),r(28,24,4,8,C.ink),r(36,24,4,8,C.ink),sword(C.steel),ground()];
    if (tier === 2) return [cape(C.purple),humanoid({body:C.steel,accent:C.bone}),r(20,12,24,4,C.steel),shield(C.bone),sword(C.steel),ground()];
    return [glow(C.glow),cape(C.purple),crown(C.boneHi),humanoid({body:C.purple,accent:C.glow,eyes:C.glow}),r(28,24,12,4,C.ink),staff(C.glow),r(8,44,8,8,C.glow,.7),ground()];
  }
  if (id === 'vampire') {
    if (tier === 1) return [cape(C.blood),humanoid({skin:C.white,body:C.black,accent:C.red,eyes:C.red}),r(28,24,4,4,C.white),r(36,24,4,4,C.white),sword(C.steel),ground()];
    if (tier === 2) return [cape(C.red),crown(C.gold),humanoid({skin:C.white,body:C.black,accent:C.gold,eyes:C.red,wide:true}),sword(C.red),ground()];
    return [glow(C.red),wings(C.blood,true),horns(C.white),humanoid({skin:C.white,body:C.black,accent:C.red,eyes:C.red,wide:true}),r(24,28,4,8,C.white),r(40,28,4,8,C.white),ground()];
  }
  if (tier === 1) return [humanoid({skin:C.green,body:C.brown,accent:C.rot,eyes:C.red}),r(12,24,8,8,C.green),r(44,28,12,8,C.green),r(8,20,4,4,C.bone),r(52,24,4,4,C.bone),ground()];
  if (tier === 2) return [glow(C.rot),humanoid({skin:C.green,body:C.purple,accent:C.rot,eyes:C.red,wide:true}),r(8,24,12,20,C.green),r(44,20,12,24,C.green),r(4,20,8,4,C.bone),r(52,16,8,4,C.bone),ground()];
  return [glow(C.rot),humanoid({skin:C.green,body:C.blood,accent:C.bone,eyes:C.red,wide:true}),horns(C.bone),stitches(),r(4,24,16,24,C.green),r(44,20,16,28,C.green),r(0,20,8,8,C.bone),r(56,16,8,8,C.bone),ground()];
}

function treeBeing(accent, boss = false) {
  return [glow(accent),r(24,24,16,32,C.ink),r(28,24,12,32,C.brown),r(16,12,32,20,C.ink),r(12,16,16,16,accent),r(36,12,16,20,accent),r(8,28,20,8,C.brown),r(40,24,16,8,C.brown),r(20,52,12,8,C.brown),r(36,52,12,8,C.brown),...(boss?crown(accent):[]),r(28,28,4,4,C.glow),r(36,28,4,4,C.glow)];
}
function beast({skin=C.brown, accent=C.red, horn=false, three=false, winged=false, large=false}={}) {
  const p = [];
  if (winged) p.push(wings(accent,large));
  p.push(r(large?12:16,28,large?40:32,20,C.ink),r(large?16:20,28,large?36:28,16,skin),r(large?36:36,20,20,16,C.ink),r(40,24,16,12,skin),r(48,28,4,4,accent),r(16,44,8,12,C.ink),r(40,44,8,12,C.ink),r(8,32,12,4,skin));
  if (horn) p.push(horns(C.bone));
  if (three) p.push(r(20,20,12,12,C.ink),r(24,24,8,8,C.bone),r(32,16,12,16,C.ink),r(36,20,8,8,C.bone),r(44,20,12,12,C.ink),r(48,24,8,8,C.bone));
  return p;
}
function dwarf(accent) {
  return [humanoid({skin:C.bone,body:C.iron,accent,eyes:C.white,wide:true}),r(20,24,24,16,C.brown),r(24,36,16,8,C.brown),r(16,12,32,8,C.iron)];
}
function pixies(accent) {
  return [glow(accent),...[[8,12],[28,28],[44,8]].flatMap(([x,y])=>[r(x,y,8,8,C.white),r(x-4,y+4,4,8,accent),r(x+8,y+4,4,8,accent),r(x+4,y+8,4,8,accent)])];
}

function enemySprite(faction, index) {
  const a = faction.color;
  const n = index === 5 ? faction.boss : faction.enemies[index];
  const boss = index === 5;
  let p;
  switch (n) {
    case 'Acolyte': p=[humanoid({skin:C.bone,body:C.white,accent:a}),staff(a),r(8,36,12,12,a)]; break;
    case 'Templar': p=[humanoid({skin:C.bone,body:C.steel,accent:a}),shield(a,true),sword()]; break;
    case 'Inquisitor': p=[cape(C.black),humanoid({skin:C.bone,body:C.black,accent:a}),r(16,8,32,4,C.black),r(20,4,24,8,C.black),sword(a)]; break;
    case 'Cleric': p=[humanoid({skin:C.bone,body:C.white,accent:a}),sunburst(a),staff(a)]; break;
    case 'Crusader': p=[cape(C.white),humanoid({skin:C.bone,body:C.steel,accent:a,wide:true}),shield(a,true),sword()]; break;
    case 'High Paladin Aurelion': p=[glow(a),sunburst(a),cape(C.white),crown(a),humanoid({skin:C.boneHi,body:C.steel,accent:a,wide:true}),shield(a,true),sword(a)]; break;

    case 'Warden Scout': p=[cape(C.green),humanoid({skin:C.bone,body:C.green,accent:a}),r(24,8,16,8,C.green),sword(a,48)]; break;
    case 'Moon Archer': p=[humanoid({skin:C.bone,body:C.green,accent:a}),r(24,8,16,4,C.white),bow(a)]; break;
    case 'Thornweaver': p=[humanoid({skin:C.green,body:C.brown,accent:a}),staff(a),r(8,24,4,24,a),r(4,28,12,4,a)]; break;
    case 'Bladesinger': p=[cape(a),humanoid({skin:C.bone,body:C.green,accent:C.white}),sword(a,8),sword(a,48)]; break;
    case 'Treant': p=treeBeing(a); break;
    case 'Archdruid Sylvanne': p=[treeBeing(a,true),r(8,8,8,16,C.brown),r(48,8,8,16,C.brown),staff(a)]; break;

    case 'Shieldbreaker': p=[dwarf(a),shield(a),axe(a)]; break;
    case 'Runesmith': p=[dwarf(a),axe(a),r(8,44,20,12,C.ink),r(12,44,12,8,a)]; break;
    case 'Tunnel Guard': p=[dwarf(a),shield(C.iron),r(44,8,4,48,C.brown),r(40,8,16,4,a),r(52,12,4,8,a)]; break;
    case 'Cannoneer': p=[dwarf(a),r(4,36,40,12,C.ink),r(8,32,32,12,C.iron),r(36,28,20,8,a),r(8,48,12,12,C.brown),r(32,48,12,12,C.brown)]; break;
    case 'Iron Golem': p=[humanoid({skin:C.iron,body:C.steel,accent:a,eyes:a,wide:true}),r(12,20,40,8,C.iron),r(8,28,12,24,C.steel),r(44,28,12,24,C.steel)]; break;
    case 'Thane Borgrim Ironhand': p=[glow(a),cape(a),crown(C.iron),dwarf(a),r(4,24,16,28,C.steel),axe(a)]; break;

    case 'Grunt': p=[humanoid({skin:C.green,body:C.brown,accent:a}),r(28,24,4,4,C.bone),r(36,24,4,4,C.bone),axe(C.brown)]; break;
    case 'Wolfrider': p=[beast({skin:C.shadow,accent:a}),r(20,16,20,16,C.ink),r(24,16,12,12,C.green),spear(a)]; break;
    case 'Berserker': p=[humanoid({skin:C.green,body:C.blood,accent:a,wide:true}),horns(C.bone),axe(a,8),axe(a,48)]; break;
    case 'Shaman': p=[humanoid({skin:C.green,body:C.purple,accent:a}),r(20,8,24,8,C.bone),staff(a),r(8,40,8,8,a,.7)]; break;
    case 'Warg': p=beast({skin:C.black,accent:a,horn:true,large:true}); break;
    case 'Warchief Gorrak': p=[glow(a),cape(C.blood),horns(a),humanoid({skin:C.green,body:C.iron,accent:a,wide:true}),axe(a,48),r(4,28,16,24,C.iron)]; break;

    case 'Militia': p=[humanoid({skin:C.bone,body:C.brown,accent:a}),sword()]; break;
    case 'Pikeman': p=[humanoid({skin:C.bone,body:C.steel,accent:a}),spear(a)]; break;
    case 'Knight': p=[cape(a),humanoid({skin:C.bone,body:C.steel,accent:a}),shield(a),sword()]; break;
    case 'Battlemage': p=[humanoid({skin:C.bone,body:C.purple,accent:a}),staff(C.orange),r(8,20,8,8,C.orange),r(4,24,16,8,C.red,.6)]; break;
    case 'Royal Guard': p=[humanoid({skin:C.bone,body:C.steel,accent:a,wide:true}),r(20,8,24,8,C.gold),spear(C.gold),shield(a)]; break;
    case 'King Aldric the Bold': p=[glow(a),cape(a),crown(C.gold),humanoid({skin:C.boneHi,body:C.steel,accent:C.gold,wide:true}),shield(a),sword(C.gold)]; break;

    case 'Pixie Swarm': p=pixies(a); break;
    case 'Redcap': p=[humanoid({skin:C.green,body:C.brown,accent:a}),r(20,8,24,8,C.red),r(16,12,32,4,C.red),sword(a)]; break;
    case 'Dryad': p=[treeBeing(a),r(24,8,16,12,C.green),r(20,12,4,12,a),r(40,12,4,12,a)]; break;
    case 'Trickster': p=[humanoid({skin:C.white,body:C.purple,accent:a}),r(16,8,12,8,a),r(36,8,12,8,C.red),r(12,4,8,8,C.gold),r(44,4,8,8,C.gold),sword(a)]; break;
    case 'Unicorn': p=[beast({skin:C.white,accent:a}),r(48,12,4,16,a),r(48,8,4,4,C.white)]; break;
    case 'Queen Titania': p=[glow(a),wings(a,true),crown(a),humanoid({skin:C.white,body:C.purple,accent:a,wide:true}),staff(a)]; break;

    case 'Kobold': p=[humanoid({skin:C.orange,body:C.brown,accent:a}),r(20,8,8,8,a),r(40,8,8,8,a),spear(a)]; break;
    case 'Drake': p=beast({skin:C.orange,accent:a,horn:true}); break;
    case 'Wyvern': p=[beast({skin:C.orange,accent:a,winged:true}),r(8,40,8,16,a)]; break;
    case 'Dragon Priest': p=[humanoid({skin:C.orange,body:C.purple,accent:a}),horns(a),staff(a),r(8,36,12,12,C.orange)]; break;
    case 'Salamander': p=[beast({skin:C.red,accent:a}),r(4,28,12,8,C.orange),r(0,24,8,8,C.gold)]; break;
    case 'Ancient Wyrm Vaelthrax': p=[glow(a),beast({skin:C.red,accent:a,horn:true,winged:true,large:true}),r(4,32,8,8,C.orange),r(0,28,8,8,C.gold)]; break;

    case 'Cultist': p=[cape(C.black),humanoid({skin:C.bone,body:C.black,accent:a}),r(20,8,24,12,C.blood),staff(a)]; break;
    case 'Imp': p=[wings(a),humanoid({skin:C.red,body:C.blood,accent:a}),horns(C.black),r(8,44,12,4,a)]; break;
    case 'Hellhound': p=beast({skin:C.black,accent:a,horn:true}); break;
    case 'Succubus': p=[wings(a),humanoid({skin:C.red,body:C.black,accent:a}),horns(C.black),r(8,32,12,4,a),r(4,28,4,4,a)]; break;
    case 'Pit Fiend': p=[glow(a),wings(C.blood,true),horns(C.black),humanoid({skin:C.red,body:C.black,accent:a,wide:true}),axe(a)]; break;
    case 'Archfiend Malgorath': p=[glow(a),wings(a,true),horns(a),crown(C.black),humanoid({skin:C.red,body:C.black,accent:a,wide:true}),r(4,24,16,28,C.red),axe(a)]; break;
    default: throw new Error(`No drawing for ${n}`);
  }
  return [boss ? glow(a) : [], p, ground()];
}

function unitSprite(id) {
  switch (id) {
    case 'zombies': return [humanoid({skin:C.green,body:C.brown,accent:C.rot}),r(8,28,12,8,C.green),r(44,24,12,8,C.green),ground()];
    case 'archers': return [humanoid({body:C.bone,accent:C.purple}),r(28,24,4,8,C.ink),r(36,24,4,8,C.ink),bow(C.bone),ground()];
    case 'bats': return [glow(C.purple),...[[8,12],[32,28],[44,8]].flatMap(([x,y])=>[r(x,y+4,8,8,C.black),r(x-8,y,8,8,C.purple),r(x+8,y,8,8,C.purple),r(x+4,y+4,4,4,C.red)])];
    case 'wights': return [glow(C.spirit),cape(C.purple),humanoid({skin:C.spirit,body:C.iron,accent:C.glow,eyes:C.glow}),sword(C.spirit),ground()];
    case 'golem': return [humanoid({skin:C.bone,body:C.bone,accent:C.purple,eyes:C.glow,wide:true}),r(8,20,16,32,C.bone),r(40,20,16,32,C.bone),r(24,4,16,12,C.bone),ground()];
    case 'knights': return [glow(C.purple),cape(C.purple),horns(C.bone),humanoid({body:C.iron,accent:C.glow,eyes:C.glow,wide:true}),shield(C.bone),sword(C.purple),ground()];
    case 'dracolich': return [glow(C.glow),beast({skin:C.bone,accent:C.purple,horn:true,winged:true,large:true}),r(24,32,8,4,C.ink),r(40,28,4,4,C.glow)];
    case 'reapers': return [glow(C.spirit),ghost(3),axe(C.boneHi,48),r(4,20,8,32,C.black),r(52,20,8,32,C.black),ground()];
    default: throw new Error(`No unit drawing for ${id}`);
  }
}

function petSprite(id) {
  switch (id) {
    case 'rat': return [r(12,32,32,16,C.ink),r(16,32,28,12,C.green),r(40,28,12,12,C.ink),r(44,32,8,8,C.brown),r(48,32,4,4,C.red),r(8,40,8,4,C.green),r(4,44,8,4,C.green),r(16,48,8,8,C.ink),r(36,44,8,12,C.ink),ground()];
    case 'crow': return [r(20,20,24,28,C.ink),r(24,16,16,16,C.black),r(36,20,16,4,C.bone),r(36,20,4,4,C.glow),r(8,24,16,16,C.purple),r(40,28,16,16,C.purple),r(24,44,4,12,C.brown),r(36,44,4,12,C.brown),ground()];
    case 'hound': return [glow(C.purple),beast({skin:C.black,accent:C.glow,horn:true,large:true}),ground()];
    case 'wisp': return [glow(C.glow),r(24,12,16,8,C.spirit,.7),r(20,20,24,16,C.glow,.8),r(24,36,16,8,C.spirit,.7),r(28,44,8,12,C.spirit,.45),r(28,24,4,4,C.white),r(36,24,4,4,C.white)];
    case 'hydra': return [glow(C.glow),beast({skin:C.bone,accent:C.purple,three:true,large:true}),r(12,36,40,8,C.bone),ground()];
    default: throw new Error(`No pet drawing for ${id}`);
  }
}

const classes = {
  skeleton: ['Skeleton', 'Bone Knight', 'Lich'],
  ghost: ['Ghost', 'Wraith', 'Banshee Queen'],
  vampire: ['Vampire', 'Vampire Lord', 'Nosferatu'],
  ghoul: ['Ghoul', 'Ghast', 'Abomination'],
};
const factions = [
  {id:'holy',color:'#f5d76e',enemies:['Acolyte','Templar','Inquisitor','Cleric','Crusader'],boss:'High Paladin Aurelion'},
  {id:'elves',color:'#7ed6a5',enemies:['Warden Scout','Moon Archer','Thornweaver','Bladesinger','Treant'],boss:'Archdruid Sylvanne'},
  {id:'dwarves',color:'#c98b4a',enemies:['Shieldbreaker','Runesmith','Tunnel Guard','Cannoneer','Iron Golem'],boss:'Thane Borgrim Ironhand'},
  {id:'orcs',color:'#8cbf4a',enemies:['Grunt','Wolfrider','Berserker','Shaman','Warg'],boss:'Warchief Gorrak'},
  {id:'kingdom',color:'#6f9be0',enemies:['Militia','Pikeman','Knight','Battlemage','Royal Guard'],boss:'King Aldric the Bold'},
  {id:'fae',color:'#d78ee8',enemies:['Pixie Swarm','Redcap','Dryad','Trickster','Unicorn'],boss:'Queen Titania'},
  {id:'dragonkin',color:'#e8663d',enemies:['Kobold','Drake','Wyvern','Dragon Priest','Salamander'],boss:'Ancient Wyrm Vaelthrax'},
  {id:'demons',color:'#b03a48',enemies:['Cultist','Imp','Hellhound','Succubus','Pit Fiend'],boss:'Archfiend Malgorath'},
];
const units = {zombies:'Zombie Horde',archers:'Skeleton Archers',bats:'Bat Swarm',wights:'Barrow Wights',golem:'Bone Golem',knights:'Death Knights',dracolich:'Dracolich',reapers:'Reaper Choir'};
const pets = {rat:'Plague Rat',crow:'Carrion Crow',hound:'Barghest',wisp:'Grave Wisp',hydra:'Bone Hydra'};

const counts = {classes:0,enemies:0,units:0,pets:0};
async function emit(folder, filename, title, parts) {
  const dir = path.join(OUT, folder);
  await mkdir(dir, {recursive:true});
  const content = svg(title, parts);
  if (Buffer.byteLength(content) >= 6 * 1024) throw new Error(`${filename} exceeds 6KB`);
  await writeFile(path.join(dir, filename), content);
  counts[folder]++;
}

for (const [id, names] of Object.entries(classes)) {
  for (let tier=1; tier<=3; tier++) await emit('classes', `${id}_${tier}.svg`, names[tier-1], classSprite(id,tier));
}
for (const faction of factions) {
  for (let i=0; i<5; i++) await emit('enemies', `${faction.id}_${i}.svg`, faction.enemies[i], enemySprite(faction,i));
  await emit('enemies', `${faction.id}_boss.svg`, faction.boss, enemySprite(faction,5));
}
for (const [id,name] of Object.entries(units)) await emit('units', `${id}.svg`, name, unitSprite(id));
for (const [id,name] of Object.entries(pets)) await emit('pets', `${id}.svg`, name, petSprite(id));

for (const [folder,count] of Object.entries(counts)) console.log(`${folder}: ${count}`);
console.log(`total: ${Object.values(counts).reduce((a,b)=>a+b,0)}`);
