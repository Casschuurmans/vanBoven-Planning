import type { Absence, Assignment, Data, Project } from '../types';
import { DAYS, dayIdx, tmin } from './dates';

export type BlockKey = 'D' | 'O' | 'M';
export const BLOCKS: Record<BlockKey, { label: string; s: string; e: string }> = {
  D: { label: 'Hele dag', s: '07:00', e: '16:00' },
  O: { label: 'Ochtend', s: '07:00', e: '12:00' },
  M: { label: 'Middag', s: '12:00', e: '16:00' },
};

export const COLORS = ['#0F7B6C', '#C2410C', '#6D28D9', '#0369A1', '#B45309', '#BE185D', '#4D7C0F', '#475569', '#0E7490', '#9F1239'];

export function blockKey(a: { start: string; end: string }): BlockKey | 'C' {
  for (const k of Object.keys(BLOCKS) as BlockKey[]) {
    if (BLOCKS[k].s === a.start && BLOCKS[k].e === a.end) return k;
  }
  return 'C';
}
export function blockLabel(a: { start: string; end: string }): string {
  const k = blockKey(a);
  return k === 'C' ? a.start + '–' + a.end : BLOCKS[k].label;
}
export function textOn(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#111' : '#fff';
}

export function absFor(d: Data, empId: string, date: string): Absence[] {
  return d.absences.filter((x) => x.empId === empId && x.from <= date && date <= x.to);
}
export function asgFor(d: Data, empId: string, date: string): Assignment[] {
  return d.assignments
    .filter((a) => a.empId === empId && a.date === date)
    .sort((a, b) => tmin(a.start) - tmin(b.start));
}

/** Geeft waarschuwingen terug. Een lege lijst betekent dat er niets aan de hand is. */
export function conflictsFor(d: Data, empId: string, date: string, s: string, e: string, ignoreId?: string | null): string[] {
  const out: string[] = [];
  const p = d.employees.find((x) => x.id === empId);
  if (!p) return out;
  const di = dayIdx(date);
  if (di > 4) out.push('Dit is een weekend. Kies een dag van maandag t/m vrijdag.');
  else if (!p.days.includes(di + 1)) out.push(`${p.name} werkt standaard niet op ${DAYS[di].toLowerCase()}.`);
  absFor(d, empId, date).forEach((x) => out.push(`${p.name} is afwezig op deze dag (${x.type.toLowerCase()}).`));
  asgFor(d, empId, date).forEach((a) => {
    if (a.id === ignoreId) return;
    if (tmin(s) < tmin(a.end) && tmin(a.start) < tmin(e)) {
      const pr = d.projects.find((x) => x.id === a.projId);
      out.push(`Overlapt met ${pr ? pr.name : 'andere planning'} (${a.start}–${a.end}).`);
    }
  });
  return out;
}

export function projectById(d: Data, id: string): Project | undefined {
  return d.projects.find((p) => p.id === id);
}
