// Manifest-driven art generation via Codex image_gen. Usage: npx tsx scripts/gen-art.ts [--only classes,enemies,...] [--force] [--concurrency 4]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { CLASSES } from '../src/game/data/classes';
import { FACTIONS } from '../src/game/data/enemies';
import { UNITS } from '../src/game/data/units';
import { PETS } from '../src/game/data/pets';

const STYLE = 'Hand-painted dark-fantasy mobile game art, rich saturated accents, crisp readable silhouette, dramatic rim lighting, high detail, no text, no watermark.';
const SPRITE = 'Full body, single character, centered, feet at the bottom, fills ~85% of the frame. TRANSPARENT background (alpha PNG, no backdrop, no ground shadow).';

interface Job { kind: string; id: string; prompt: string; size: '1024x1024' | '1024x1536'; outW: number; outH: number; }
const jobs: Job[] = [];

const classFlavor: Record<string, string[]> = {
  skeleton: ['a scrappy skeleton warrior with a chipped sword and a wooden shield, bone-white with green-glowing eye sockets',
             'a Bone Knight: armored skeleton champion in black plate with a bone greatsword, tattered cape, green eye-fire',
             'a Lich: undead sorcerer-king in ornate black-and-gold robes, spiked crown, bone staff with a green soul gem, floating skulls'],
  ghost:    ['a translucent pale-blue ghost with a sorrowful face and trailing wispy tail, faint glow',
             'a Wraith: hooded spectre in torn shadowy robes with a spectral scythe, cold blue light',
             'a Banshee Queen: regal spectral queen with a crown of ice-blue flame, flowing ethereal gown, screaming aura'],
  vampire:  ['a young vampire in a red-lined black coat, fangs bared, red eyes, elegant and quick',
             'a Vampire Lord: aristocratic vampire in ornate crimson armor with a bat-winged cloak and a rapier',
             'a Nosferatu: ancient monstrous vampire, bald, bat-like, long claws, crimson mist and swarming bats, terrifying'],
  ghoul:    ['a hunched ghoul with grey mottled skin, long claws and a hungry grin',
             'a Ghast: larger muscular ghoul with bulging sinew, bone spurs, rotting hide, dripping maw',
             'an Abomination: towering stitched flesh titan of many bodies, chains and hooks, multiple arms, green rot glow'],
};
for (const c of Object.values(CLASSES)) c.tierNames.forEach((name, i) => jobs.push({
  kind: 'classes', id: `${c.id}_${i + 1}`, size: '1024x1024', outW: 512, outH: 512,
  prompt: `${STYLE} ${SPRITE} Playable undead hero "${name}": ${classFlavor[c.id][i]}. Facing RIGHT, heroic pose.`,
}));

const factionFlavor: Record<string, string> = {
  holy: 'Holy Order human zealots: white and gold armor, sunburst sigils, holy light',
  elves: 'Elven Wardens: silver-and-moonlit-blue leaf armor, forest elegance',
  dwarves: 'Dwarven Legion: heavy bronze-and-iron armor, runes, beards, forge glow',
  orcs: 'Orc Warbands: green-skinned brutes, crude iron, war paint, tusks',
  kingdom: 'Human Kingdom: royal blue and steel, heraldic lions, disciplined soldiers',
  fae: 'Fae Court: whimsical and eerie, violet and pink glow, thorns, glamour',
  dragonkin: 'Dragonkin: scaled reptilian warriors, ember-orange fire, obsidian armor',
  demons: 'Demon Cult: crimson robes, brass horns, hellfire, infernal sigils',
};
for (const f of FACTIONS) {
  f.enemies.forEach((name, i) => jobs.push({
    kind: 'enemies', id: `${f.id}_${i}`, size: '1024x1024', outW: 512, outH: 512,
    prompt: `${STYLE} ${SPRITE} Enemy "${name}" of the ${f.name} (${factionFlavor[f.id]}). Facing LEFT, battle-ready stance.`,
  }));
  jobs.push({
    kind: 'enemies', id: `${f.id}_boss`, size: '1024x1024', outW: 640, outH: 640,
    prompt: `${STYLE} ${SPRITE} BOSS "${f.boss}", leader of the ${f.name} (${factionFlavor[f.id]}). Imposing, larger-than-life, ornate legendary gear, powerful aura. Facing LEFT.`,
  });
  jobs.push({
    kind: 'backgrounds', id: f.id, size: '1024x1536', outW: 1024, outH: 1536,
    prompt: `${STYLE} Portrait-orientation painted battle backdrop for a mobile idle game, the homeland of the ${f.name} (${factionFlavor[f.id]}): atmospheric environment, empty foreground ground plane in the lower third where characters will stand, no characters, no creatures, moody lighting, depth with distant landmarks.`,
  });
}
const unitFlavor: Record<string, string> = {
  zombies: 'a shambling group of three rotting zombies', archers: 'a skeleton archer drawing a bone bow', bats: 'a swirling swarm of vampire bats',
  wights: 'a barrow wight in ancient rusted mail with a cold blue glow', golem: 'a hulking golem built from skulls and bones', knights: 'a death knight in black spiked plate on foot with a runed greatsword',
  dracolich: 'a skeletal undead dragon with green soulfire in its ribcage', reapers: 'a choir of hooded reapers with scythes, mouths open in song',
};
for (const u of UNITS) jobs.push({ kind: 'units', id: u.id, size: '1024x1024', outW: 384, outH: 384, prompt: `${STYLE} ${SPRITE} Undead army unit "${u.name}": ${unitFlavor[u.id]}. Facing RIGHT.` });
const petFlavor: Record<string, string> = {
  rat: 'a plague rat with glowing green eyes and a bony tail', crow: 'a carrion crow with bone-white beak and tattered feathers', hound: 'a barghest: a black spectral hound with burning eyes',
  wisp: 'a grave wisp: a floating skull-faced ball of pale flame', hydra: 'a small three-headed bone hydra',
};
for (const p of PETS) jobs.push({ kind: 'pets', id: p.id, size: '1024x1024', outW: 256, outH: 256, prompt: `${STYLE} ${SPRITE} Cute-but-creepy undead pet "${p.name}": ${petFlavor[p.id]}. Facing RIGHT.` });

// ---- run ----
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const force = args.includes('--force');
const conc = args.includes('--concurrency') ? Number(args[args.indexOf('--concurrency') + 1]) : 4;
const ROOT = resolve(import.meta.dirname, '..');
const RAW = resolve(ROOT, 'art/raw');
const OUT = resolve(ROOT, 'public/art');
mkdirSync(resolve(ROOT, 'art'), { recursive: true });
writeFileSync(resolve(ROOT, 'art/manifest.json'), JSON.stringify(jobs, null, 2));

const queue = jobs.filter(j => (!only || only.includes(j.kind)) && (force || !existsSync(`${OUT}/${j.kind}/${j.id}.png`)));
console.log(`${queue.length} images to generate (of ${jobs.length})`);
let ok = 0, fail = 0;

function codex(job: Job, rawPath: string): Promise<void> {
  return new Promise((res, rej) => {
    const dir = resolve(RAW, job.kind); mkdirSync(dir, { recursive: true });
    const prompt = `Use your image_gen tool ONCE to generate a ${job.size} PNG${job.kind === 'backgrounds' ? '' : ' with a fully transparent background'} and save it to exactly "${rawPath}". Do not write any other files. Prompt for the image: ${job.prompt} Reply with just the saved path.`;
    const p = spawn('codex', ['exec', '--skip-git-repo-check', '-C', dir, '--full-auto', prompt], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', d => err += d);
    const t = setTimeout(() => { p.kill(); rej(new Error('timeout')); }, 8 * 60 * 1000);
    p.on('exit', code => { clearTimeout(t); code === 0 && existsSync(rawPath) ? res() : rej(new Error(`codex exit ${code}: ${err.slice(-300)}`)); });
  });
}

async function run(job: Job) {
  const rawPath = `${RAW}/${job.kind}/${job.id}.png`;
  const outDir = `${OUT}/${job.kind}`; mkdirSync(outDir, { recursive: true });
  try {
    if (force || !existsSync(rawPath)) await codex(job, rawPath);
    const meta = await sharp(rawPath).metadata();
    if (job.kind !== 'backgrounds' && !meta.hasAlpha) throw new Error('no alpha channel');
    const tmp = `${outDir}/${job.id}.tmp.png`;
    let img = sharp(rawPath);
    if (job.kind !== 'backgrounds') img = img.trim({ threshold: 8 }).resize(job.outW, job.outH, { fit: 'inside' });
    else img = img.resize(job.outW, job.outH, { fit: 'cover' });
    await img.png({ compressionLevel: 9, palette: job.kind !== 'backgrounds' }).toFile(tmp);
    renameSync(tmp, `${outDir}/${job.id}.png`);
    ok++; console.log(`✓ ${job.kind}/${job.id}`);
  } catch (e) {
    fail++; console.log(`✗ ${job.kind}/${job.id}: ${(e as Error).message}`);
    try { if (existsSync(rawPath) && (e as Error).message === 'no alpha channel') unlinkSync(rawPath); } catch { /* */ }
  }
}

let i = 0;
await Promise.all(Array.from({ length: conc }, async () => { while (i < queue.length) await run(queue[i++]); }));
console.log(`done: ${ok} ok, ${fail} failed`);
