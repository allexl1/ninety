// Formation presets + custom builder → 11 detailed XI slots.
// Slots use the locked vocab: GK RB CB LB RWB LWB CDM CM CAM RM LM RW LW ST.
// Balance/strength effects live in src/engine/ratings.js (single source).
export const SLOT_LINE = {
  GK: 'keeper',
  RB: 'defenders', CB: 'defenders', LB: 'defenders', RWB: 'defenders', LWB: 'defenders',
  CDM: 'midfielders', CM: 'midfielders', CAM: 'midfielders', RM: 'midfielders', LM: 'midfielders',
  RW: 'attackers', LW: 'attackers', ST: 'attackers',
};

export const PRESETS = [
  { shape: '4-4-2', blurb: 'Two banks of four. Honest, solid, timeless.', slots: ['GK','RB','CB','CB','LB','RM','CM','CM','LM','ST','ST'] },
  { shape: '4-3-3', blurb: 'Width up top, control in the middle.', slots: ['GK','RB','CB','CB','LB','CM','CM','CM','RW','ST','LW'] },
  { shape: '4-2-3-1', blurb: 'Double pivot shields; four arrive late.', slots: ['GK','RB','CB','CB','LB','CDM','CDM','RW','CAM','LW','ST'] },
  { shape: '3-5-2', blurb: 'Wing-backs fly, midfield overloads.', slots: ['GK','CB','CB','CB','RM','CM','CM','CM','LM','ST','ST'] },
  { shape: '3-4-3', blurb: 'Front three pin; brave or broken.', slots: ['GK','CB','CB','CB','RM','CM','CM','LM','RW','ST','LW'] },
  { shape: '5-3-2', blurb: 'Five at the back. Thrones are defended.', slots: ['GK','LWB','CB','CB','CB','RWB','CM','CM','CM','ST','ST'] },
  { shape: '4-5-1', blurb: 'Congest, frustrate, nick one.', slots: ['GK','RB','CB','CB','LB','RM','CM','CM','CM','LM','ST'] },
  { shape: '5-4-1', blurb: 'The bus. Parked beautifully.', slots: ['GK','LWB','CB','CB','CB','RWB','RM','CM','CM','LM','ST'] },
];

function dfSlots(n, wingbacks) {
  if (n <= 0) return [];
  if (n === 1) return ['CB'];
  if (n === 2) return ['CB', 'CB'];
  if (n === 3) return wingbacks ? ['LWB', 'CB', 'RWB'] : ['CB', 'CB', 'CB'];
  if (n === 4) return wingbacks ? ['LWB', 'CB', 'CB', 'RWB'] : ['LB', 'CB', 'CB', 'RB'];
  const inner = Math.min(n, 6) - 2;
  const backs = wingbacks ? ['LWB', ...Array(inner).fill('CB'), 'RWB'] : ['LB', ...Array(inner).fill('CB'), 'RB'];
  return backs.slice(0, n);
}

function mfSlots(n, wide) {
  if (n <= 0) return [];
  if (!wide) {
    if (n === 1) return ['CM'];
    if (n === 2) return ['CDM', 'CM'];
    if (n === 3) return ['CDM', 'CM', 'CAM'];
    return ['CDM', ...Array(n - 2).fill('CM'), 'CAM'].slice(0, n);
  }
  if (n === 1) return ['CM'];
  if (n === 2) return ['RM', 'LM'];
  if (n === 3) return ['RM', 'CM', 'LM'];
  if (n === 4) return ['RM', 'CM', 'CM', 'LM'];
  return ['RM', 'CDM', ...Array(n - 4).fill('CM'), 'CAM', 'LM'].slice(0, n);
}

function fwSlots(n, wide) {
  if (n <= 0) return [];
  if (n === 1) return ['ST'];
  if (n === 2) return wide ? ['ST', 'ST'] : ['ST', 'ST'];
  if (n === 3) return ['LW', 'ST', 'RW'];
  return ['LW', ...Array(n - 2).fill('ST'), 'RW'].slice(0, n);
}

// Custom builder: any DF/MF/FW split summing to 10 — even 1-1-8 and 0-0-10.
// The engine (balanceReport) punishes absurd shapes; the meter warns first.
export function buildCustom({ df, mf, fw, wingbacks = false, wideMF = true }) {
  const parts = [df, mf, fw].map(Number);
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 10)) return { error: 'Lines must be whole numbers 0–10.' };
  if (df + mf + fw !== 10) return { error: `Outfield must sum to 10 (now ${df + mf + fw}).` };
  const slots = ['GK', ...dfSlots(df, wingbacks), ...mfSlots(mf, wideMF), ...fwSlots(fw, wideMF)];
  return { shape: `${df}-${mf}-${fw}`, slots };
}

export function shapeOf(slots) {
  const out = slots.filter((s) => s !== 'GK');
  const df = out.filter((s) => SLOT_LINE[s] === 'defenders').length;
  const mf = out.filter((s) => SLOT_LINE[s] === 'midfielders').length;
  const fw = out.filter((s) => SLOT_LINE[s] === 'attackers').length;
  return `${df}-${mf}-${fw}`;
}
