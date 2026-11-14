export const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
export const DS = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
export const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const MS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

const pad = (n: number) => (n < 10 ? '0' : '') + n;

export function iso(d: Date): string {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
export function parse(s: string): Date {
  const p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
/** 0 = maandag ... 6 = zondag */
export function dayIdx(s: string): number {
  return (parse(s).getDay() + 6) % 7;
}
export function mondayOf(s: string): string {
  return addDays(s, -dayIdx(s));
}
export function todayISO(): string {
  return iso(new Date());
}
export function nextWorkday(s: string): string {
  let n = addDays(s, 1);
  while (dayIdx(n) > 4) n = addDays(n, 1);
  return n;
}
export function weekNo(s: string): number {
  const d = parse(s);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}
export function fmtShort(s: string): string {
  const d = parse(s);
  return d.getDate() + ' ' + MS[d.getMonth()];
}
export function fmtLong(s: string): string {
  const d = parse(s);
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}
export function weekLabel(monday: string): string {
  const a = parse(monday);
  const b = parse(addDays(monday, 4));
  const t =
    a.getMonth() === b.getMonth()
      ? a.getDate() + ' t/m ' + b.getDate() + ' ' + MONTHS[b.getMonth()] + ' ' + b.getFullYear()
      : a.getDate() + ' ' + MS[a.getMonth()] + ' t/m ' + b.getDate() + ' ' + MS[b.getMonth()] + ' ' + b.getFullYear();
  return 'Week ' + weekNo(monday) + ' · ' + t;
}
export function tmin(t: string): number {
  const p = t.split(':');
  return +p[0] * 60 + +p[1];
}
