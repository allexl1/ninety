//Fails `npm run build` on bad dataset rows. Run: node scripts/validate-data.mjs
import { readFileSync } from 'node:fs';

const POS = new Set(['GK','RB','CB','LB','RWB','LWB','CDM','CM','CAM','RM','LM','RW','LW','ST']);
const SRC = new Set(['fifa-contemp','icon','fc-scale']);
const CONF = new Set(['high','med','low']);
const fails = [];
const fail = (m) => fails.push(m);

const wheel = JSON.parse(readFileSync('src/data/teams.json','utf8'));
if (wheel.teams.length !== 8) fail(`wheel: expected 8 teams, got ${wheel.teams.length}`);
const ids = new Set();
for (const t of wheel.teams) {
  if (ids.has(t.id)) fail(`wheel: duplicate id ${t.id}`);
  ids.add(t.id);
  if (t.players.length !== 15) fail(`${t.id}: expected 15 players, got ${t.players.length}`);
  const xi = t.players.filter((p) => p.xi);
  if (xi.length !== 11) fail(`${t.id}: expected 11 starters, got ${xi.length}`);
  if (xi.filter((p) => p.pos[0] === 'GK').length !== 1) fail(`${t.id}: XI must have exactly 1 GK`);
  const names = new Set();
  for (const p of t.players) {
    if (names.has(p.name)) fail(`${t.id}: duplicate player ${p.name}`);
    names.add(p.name);
    if (!Number.isInteger(p.rating) || p.rating < 60 || p.rating > 99) fail(`${t.id}/${p.name}: rating ${p.rating} out of 60-99`);
    if (!p.pos.length || !p.pos.every((s) => POS.has(s))) fail(`${t.id}/${p.name}: bad positions ${p.pos}`);
    if (!SRC.has(p.src)) fail(`${t.id}/${p.name}: bad src ${p.src} (every row traces to a source)`);
    if (!CONF.has(p.conf)) fail(`${t.id}/${p.name}: bad conf ${p.conf}`);
    if (!/^[A-Z]{3}$/.test(p.nation)) fail(`${t.id}/${p.name}: nation must be 3-letter, got ${p.nation}`);
  }
}

const opp = JSON.parse(readFileSync('src/data/opponents-26-27.json','utf8'));
if (opp.opponents.length !== 20) fail(`opponents: expected 20 clubs, got ${opp.opponents.length}`);
for (const o of opp.opponents) {
  if (!Number.isInteger(o.overall) || o.overall < 60 || o.overall > 95) fail(`opponents/${o.club}: overall ${o.overall} out of 60-95`);
}

if (fails.length) {
  console.error(`validate-data: ${fails.length} FAIL`);
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('validate-data: OK (8 teams x 15 rows + 20 opponents, all rows sourced)');
