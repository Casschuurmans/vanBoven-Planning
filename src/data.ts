import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { addDays, todayISO } from './lib/dates';
import type { Absence, Assignment, Data, Employee, Project } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/* ---------- database <-> app ---------- */
const mapEmp = (r: Row): Employee => ({
  id: r.id,
  name: r.name,
  role: r.role ?? '',
  days: ((r.work_days ?? []) as number[]).slice().sort(),
  avail: r.availability ?? '',
  notes: r.notes ?? '',
  order: r.sort_order ?? 0,
});
const rowEmp = (e: Employee) => ({
  name: e.name,
  role: e.role,
  work_days: e.days,
  availability: e.avail,
  notes: e.notes,
  sort_order: e.order,
});

const mapProj = (r: Row): Project => ({
  id: r.id,
  name: r.name,
  number: r.number ?? '',
  location: r.location ?? '',
  start: r.start_date ?? '',
  end: r.end_date ?? '',
  status: r.status,
  color: r.color,
  kind: r.kind,
  desc: r.description ?? '',
  need: r.need ?? {},
});
const rowProj = (p: Project) => ({
  name: p.name,
  number: p.number,
  location: p.location,
  start_date: p.start || null,
  end_date: p.end || null,
  status: p.status,
  color: p.color,
  kind: p.kind,
  description: p.desc,
  need: p.need,
});

const mapAsg = (r: Row): Assignment => ({
  id: r.id,
  empId: r.employee_id,
  projId: r.project_id,
  date: r.work_date,
  start: String(r.start_time).slice(0, 5),
  end: String(r.end_time).slice(0, 5),
  note: r.note ?? '',
});
const rowAsg = (a: Assignment) => ({
  employee_id: a.empId,
  project_id: a.projId,
  work_date: a.date,
  start_time: a.start,
  end_time: a.end,
  note: a.note,
});

const mapAbs = (r: Row): Absence => ({
  id: r.id,
  empId: r.employee_id,
  type: r.type,
  from: r.from_date,
  to: r.to_date,
  note: r.note ?? '',
});
const rowAbs = (a: Absence) => ({ employee_id: a.empId, type: a.type, from_date: a.from, to_date: a.to, note: a.note });

export type TableName = 'employees' | 'projects' | 'assignments' | 'absences';
const CFG: Record<TableName, { map: (r: Row) => any; row: (i: any) => Row }> = {
  employees: { map: mapEmp, row: rowEmp },
  projects: { map: mapProj, row: rowProj },
  assignments: { map: mapAsg, row: rowAsg },
  absences: { map: mapAbs, row: rowAbs },
};
const TABLES = Object.keys(CFG) as TableName[];

const EMPTY: Data = { employees: [], projects: [], assignments: [], absences: [] };

/* ---------- state helpers ---------- */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i < 0) return [...list, item];
  const c = list.slice();
  c[i] = item;
  return c;
}
function applyItem(d: Data, t: TableName, item: any): Data {
  return { ...d, [t]: upsert((d as any)[t], item) } as Data;
}
function applyDelete(d: Data, t: TableName, id: string): Data {
  const n: Data = { ...d, [t]: (d as any)[t].filter((x: { id: string }) => x.id !== id) } as Data;
  if (t === 'employees') {
    n.assignments = n.assignments.filter((a) => a.empId !== id);
    n.absences = n.absences.filter((a) => a.empId !== id);
  }
  if (t === 'projects') n.assignments = n.assignments.filter((a) => a.projId !== id);
  return n;
}

async function fetchAssignments(): Promise<{ data: Row[] | null; error: string }> {
  // Alleen de laatste 90 dagen en alles daarna, zodat de lijst klein blijft.
  const from = addDays(todayISO(), -90);
  const out: Row[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .gte('work_date', from)
      .order('work_date')
      .range(i, i + 999);
    if (error) return { data: null, error: error.message };
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { data: out, error: '' };
}

/* ---------- hook ---------- */
export function usePlanningData() {
  const [data, setData] = useState<Data>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const wasLive = useRef(false);

  const reload = useCallback(async () => {
    const [e, p, a, ab] = await Promise.all([
      supabase.from('employees').select('*').order('created_at'),
      supabase.from('projects').select('*').order('created_at'),
      fetchAssignments(),
      supabase.from('absences').select('*').order('from_date'),
    ]);
    const err = e.error?.message || p.error?.message || a.error || ab.error?.message;
    if (err) {
      setError(err);
      setStatus('error');
      return;
    }
    setError('');
    setData({
      employees: (e.data ?? []).map(mapEmp),
      projects: (p.data ?? []).map(mapProj),
      assignments: (a.data ?? []).map(mapAsg),
      absences: (ab.data ?? []).map(mapAbs),
    });
    setStatus('ready');
  }, []);

  useEffect(() => {
    reload();
    const ch = supabase.channel('planning-wijzigingen');
    TABLES.forEach((t) => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id;
          if (id) setData((d) => applyDelete(d, t, id));
        } else if (payload.new) {
          setData((d) => applyItem(d, t, CFG[t].map(payload.new)));
        }
      });
    });
    ch.subscribe((s) => {
      const ok = s === 'SUBSCRIBED';
      setLive(ok);
      if (ok && wasLive.current) reload(); // opnieuw verbonden: gemiste wijzigingen ophalen
      if (ok) wasLive.current = true;
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [reload]);

  const actions = useMemo(
    () => ({
      /** Nieuw (zonder id) of bestaand (met id) item opslaan. Gooit een Error bij een probleem. */
      async save(t: TableName, item: any): Promise<void> {
        const c = CFG[t];
        if (item.id) {
          const before = item;
          setData((d) => applyItem(d, t, before)); // direct zichtbaar
          const { error: er } = await supabase.from(t).update(c.row(item)).eq('id', item.id);
          if (er) {
            reload();
            throw new Error(er.message);
          }
        } else {
          const { data: row, error: er } = await supabase.from(t).insert(c.row(item)).select().single();
          if (er) throw new Error(er.message);
          setData((d) => applyItem(d, t, c.map(row)));
        }
      },
      async saveMany(t: TableName, items: any[]): Promise<void> {
        if (!items.length) return;
        const c = CFG[t];
        const { data: rows, error: er } = await supabase.from(t).insert(items.map((i) => c.row(i))).select();
        if (er) throw new Error(er.message);
        setData((d) => (rows ?? []).reduce((acc: Data, r: Row) => applyItem(acc, t, c.map(r)), d));
      },
      async remove(t: TableName, id: string): Promise<void> {
        const { error: er } = await supabase.from(t).delete().eq('id', id);
        if (er) throw new Error(er.message);
        setData((d) => applyDelete(d, t, id));
      },
    }),
    [reload],
  );

  const sorted = useMemo<Data>(
    () => ({ ...data, employees: data.employees.slice().sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)) }),
    [data],
  );

  return { data: sorted, status, error, live, actions, reload };
}

export type Actions = ReturnType<typeof usePlanningData>['actions'];
