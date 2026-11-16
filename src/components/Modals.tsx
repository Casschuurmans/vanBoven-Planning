import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, FormEvent } from 'react';
import type { Actions } from '../data';
import { DAYS, DS, addDays, nextWorkday, tmin } from '../lib/dates';
import { BLOCKS, COLORS, blockKey, conflictsFor } from '../lib/planning';
import type { BlockKey } from '../lib/planning';
import { place } from '../lib/place';
import type { AbsType, AssignOpts, ConfirmOpts, Data, Kind, Project, Status, UI } from '../types';

const STATUS: Status[] = ['Voorbereiding', 'In uitvoering', 'Afgerond', 'On hold'];
const ABS: AbsType[] = ['Vakantie', 'Verlof', 'Ziekte', 'Overig'];

interface Common {
  data: Data;
  actions: Actions;
  ui: UI;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const f = ref.current?.querySelector<HTMLElement>('input:not([type=hidden]),select,textarea');
    (f ?? ref.current?.querySelector<HTMLElement>('button.primary'))?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="mh">
          <h2>{title}</h2>
          <button type="button" className="x" onClick={onClose} aria-label="Sluiten">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- bevestigen ---------- */
export function ConfirmModal({ c, onClose }: { c: ConfirmOpts; onClose: () => void }) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onClose();
    c.onOk();
  };
  return (
    <Modal title={c.title} onClose={onClose}>
      <form className="mb" onSubmit={submit}>
        {c.intro && <p style={{ margin: 0 }}>{c.intro}</p>}
        <div className="warn">
          <ul>
            {c.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
        <div className="mf">
          <button type="button" className="btn" onClick={onClose}>
            Annuleren
          </button>
          <button type="submit" className="btn primary">
            {c.okLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- planning ---------- */
export function AssignModal({ opts, data, actions, ui }: Common & { opts: AssignOpts }) {
  const ed = opts.id ? data.assignments.find((a) => a.id === opts.id) : undefined;
  const firstProj = data.projects.find((p) => p.status !== 'Afgerond');
  const [empId, setEmpId] = useState(ed?.empId ?? opts.empId ?? data.employees[0]?.id ?? '');
  const [date, setDate] = useState(ed?.date ?? opts.date ?? '');
  const [projId, setProjId] = useState(ed?.projId ?? opts.projId ?? firstProj?.id ?? '');
  const [start, setStart] = useState(ed?.start ?? '07:00');
  const [end, setEnd] = useState(ed?.end ?? '16:00');
  const [note, setNote] = useState(ed?.note ?? '');
  const [err, setErr] = useState('');

  const block: BlockKey | 'C' = blockKey({ start, end });
  const valid = !!date && !!start && !!end && tmin(end) > tmin(start);
  const warns = useMemo(
    () => (valid && empId ? conflictsFor(data, empId, date, start, end, ed?.id ?? null) : []),
    [data, empId, date, start, end, valid, ed?.id],
  );

  const projects = data.projects.filter((p) => p.status !== 'Afgerond' || p.id === projId);
  const group = (kind: Kind, label: string) => {
    const l = projects.filter((p) => p.kind === kind);
    if (!l.length) return null;
    return (
      <optgroup label={label}>
        {l.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.number ? ` (${p.number})` : ''}
          </option>
        ))}
      </optgroup>
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!date) return setErr('Kies een datum.');
    if (!valid) return setErr('De eindtijd moet na de begintijd liggen.');
    if (!projId || !empId) return setErr('Kies een medewerker en een project.');
    ui.closeModal();
    ui.run(
      actions.save('assignments', { ...(ed ? { id: ed.id } : {}), empId, projId, date, start, end, note }),
      ed ? 'Planning opgeslagen' : 'Ingepland',
    );
  };
  const copy = (date2: string, msg: string) => {
    if (!ed) return;
    ui.closeModal();
    place(ui, data, actions, { empId: ed.empId, projId: ed.projId, date: date2, start: ed.start, end: ed.end, note: ed.note }, msg);
  };
  const del = () => {
    if (!ed) return;
    ui.confirm({
      title: 'Planning verwijderen',
      lines: ['Deze planningsregel wordt verwijderd.'],
      okLabel: 'Verwijderen',
      onOk: () => {
        ui.run(actions.remove('assignments', ed.id), 'Planning verwijderd');
      },
    });
  };

  return (
    <Modal title={ed ? 'Planning aanpassen' : 'Medewerker inplannen'} onClose={ui.closeModal}>
      <form className="mb" onSubmit={submit} noValidate>
        <div className="row2">
          <label className="f">
            Medewerker
            <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
              {data.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="f">
            Datum
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>
        <label className="f">
          Project of klus
          <select value={projId} onChange={(e) => setProjId(e.target.value)}>
            {group('project', 'Projecten')}
            {group('klus', 'Losse klussen')}
          </select>
        </label>
        <div className="row3">
          <label className="f">
            Tijdblok
            <select
              value={block}
              onChange={(e) => {
                const k = e.target.value as BlockKey | 'C';
                if (k !== 'C') {
                  setStart(BLOCKS[k].s);
                  setEnd(BLOCKS[k].e);
                }
              }}
            >
              <option value="D">Hele dag</option>
              <option value="O">Ochtend</option>
              <option value="M">Middag</option>
              <option value="C">Eigen tijd</option>
            </select>
          </label>
          <label className="f">
            Van
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label className="f">
            Tot
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </label>
        </div>
        <label className="f">
          Notitie (optioneel)
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijvoorbeeld: sleutel ophalen bij kantoor" />
        </label>
        {warns.length > 0 && (
          <div className="warn">
            <b>Let op</b>
            <ul>
              {warns.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            Je kunt de planning toch opslaan.
          </div>
        )}
        {err && (
          <div className="err" role="alert">
            {err}
          </div>
        )}
        <div className="mf">
          {ed && (
            <div className="left">
              <button type="button" className="btn small" onClick={() => copy(nextWorkday(ed.date), 'Gekopieerd naar volgende werkdag')}>
                Kopieer naar volgende werkdag
              </button>
              <button type="button" className="btn small" onClick={() => copy(addDays(ed.date, 7), 'Gekopieerd naar volgende week')}>
                Kopieer naar volgende week
              </button>
              <button type="button" className="btn small danger" onClick={del}>
                Verwijderen
              </button>
            </div>
          )}
          <button type="button" className="btn" onClick={ui.closeModal}>
            Annuleren
          </button>
          <button type="submit" className="btn primary">
            {warns.length ? (ed ? 'Toch opslaan' : 'Toch inplannen') : ed ? 'Opslaan' : 'Inplannen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- project ---------- */
export function ProjectModal({ id, kind, data, actions, ui }: Common & { id?: string; kind?: Kind }) {
  const ed = id ? data.projects.find((p) => p.id === id) : undefined;
  const [name, setName] = useState(ed?.name ?? '');
  const [number, setNumber] = useState(ed?.number ?? '');
  const [location, setLocation] = useState(ed?.location ?? '');
  const [start, setStart] = useState(ed?.start ?? '');
  const [end, setEnd] = useState(ed?.end ?? '');
  const [status, setStatus] = useState<Status>(ed?.status ?? 'Voorbereiding');
  const [color, setColor] = useState(ed?.color ?? COLORS[data.projects.length % COLORS.length]);
  const [desc, setDesc] = useState(ed?.desc ?? '');
  const [need, setNeed] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    [1, 2, 3, 4, 5].forEach((d) => {
      const v = ed?.need?.[String(d)];
      o[String(d)] = v ? String(v) : '';
    });
    return o;
  });
  const [err, setErr] = useState('');
  const k: Kind = ed?.kind ?? kind ?? 'project';
  const isKlus = k === 'klus';
  const palette = COLORS.includes(color) ? COLORS : [...COLORS, color];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr('Vul een naam in.');
    if (start && end && end < start) return setErr('De einddatum ligt voor de startdatum.');
    const nd: Record<string, number> = {};
    Object.keys(need).forEach((d) => {
      const n = parseInt(need[d], 10);
      if (n > 0) nd[d] = n;
    });
    const item: Project = { id: ed?.id ?? '', name: name.trim(), number, location, start, end, status, color, kind: k, desc, need: nd };
    ui.closeModal();
    ui.run(actions.save('projects', ed ? item : { ...item, id: undefined }), 'Opgeslagen');
  };
  const del = () => {
    if (!ed) return;
    const n = data.assignments.filter((a) => a.projId === ed.id).length;
    ui.confirm({
      title: isKlus ? 'Klus verwijderen' : 'Project verwijderen',
      lines: [n ? `${ed.name} wordt verwijderd, samen met ${n} planningsregels.` : `${ed.name} wordt verwijderd.`],
      okLabel: 'Verwijderen',
      onOk: () => {
        ui.run(actions.remove('projects', ed.id), 'Verwijderd');
      },
    });
  };

  return (
    <Modal title={ed ? (isKlus ? 'Klus aanpassen' : 'Project aanpassen') : isKlus ? 'Nieuwe losse klus' : 'Nieuw project'} onClose={ui.closeModal}>
      <form className="mb" onSubmit={submit} noValidate>
        <div className="row2">
          <label className="f">
            {isKlus ? 'Naam van de klus' : 'Projectnaam'}
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder={isKlus ? 'Bijvoorbeeld: Lekkage Vught' : 'Bijvoorbeeld: Esch'} />
          </label>
          {isKlus ? (
            <label className="f">
              Locatie
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
          ) : (
            <label className="f">
              Projectnummer
              <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="2026-000" />
            </label>
          )}
        </div>
        {!isKlus && (
          <label className="f">
            Locatie
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
        )}
        <div className="row3">
          <label className="f">
            Startdatum
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="f">
            Verwachte einddatum
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className="f">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset>
          <legend>Kleur in de planning</legend>
          <div className="colors">
            {palette.map((c) => (
              <label key={c} style={{ ['--c' as string]: c }}>
                <input type="radio" name="color" value={c} checked={c === color} onChange={() => setColor(c)} aria-label={`Kleur ${c}`} />
                <span style={{ ['--c' as string]: c }} />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="f">
          Omschrijving
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
        <fieldset>
          <legend>Benodigd aantal medewerkers per dag (leeg = geen behoefte)</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((d) => (
              <label className="f" key={d}>
                {DS[d - 1]}
                <input
                  type="number"
                  min={0}
                  max={99}
                  inputMode="numeric"
                  placeholder="0"
                  value={need[String(d)]}
                  onChange={(e) => setNeed({ ...need, [String(d)]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </fieldset>
        {err && (
          <div className="err" role="alert">
            {err}
          </div>
        )}
        <div className="mf">
          {ed && (
            <div className="left">
              <button type="button" className="btn small danger" onClick={del}>
                Verwijderen
              </button>
            </div>
          )}
          <button type="button" className="btn" onClick={ui.closeModal}>
            Annuleren
          </button>
          <button type="submit" className="btn primary">
            Opslaan
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- medewerker ---------- */
export function EmployeeModal({ id, data, actions, ui }: Common & { id?: string }) {
  const ed = id ? data.employees.find((e) => e.id === id) : undefined;
  const [name, setName] = useState(ed?.name ?? '');
  const [role, setRole] = useState(ed?.role ?? '');
  const [days, setDays] = useState<number[]>(ed?.days ?? [1, 2, 3, 4, 5]);
  const [avail, setAvail] = useState(ed?.avail ?? '');
  const [notes, setNotes] = useState(ed?.notes ?? '');
  const [err, setErr] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr('Vul een naam in.');
    const order = ed ? ed.order : data.employees.reduce((m, x) => Math.max(m, x.order), 0) + 1;
    const item = { ...(ed ? { id: ed.id } : {}), name: name.trim(), role, days: days.slice().sort(), avail, notes, order };
    ui.closeModal();
    ui.run(actions.save('employees', item), 'Opgeslagen');
  };
  const del = () => {
    if (!ed) return;
    const n = data.assignments.filter((a) => a.empId === ed.id).length;
    ui.confirm({
      title: 'Medewerker verwijderen',
      lines: [`${ed.name} wordt verwijderd, samen met ${n} planningsregels en alle afwezigheid.`],
      okLabel: 'Verwijderen',
      onOk: () => {
        ui.run(actions.remove('employees', ed.id), 'Verwijderd');
      },
    });
  };

  return (
    <Modal title={ed ? 'Medewerker aanpassen' : 'Nieuwe medewerker'} onClose={ui.closeModal}>
      <form className="mb" onSubmit={submit} noValidate>
        <div className="row2">
          <label className="f">
            Naam
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="f">
            Functie
            <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Bijvoorbeeld: Timmerman" />
          </label>
        </div>
        <fieldset>
          <legend>Standaard werkdagen</legend>
          <div className="chk">
            {DAYS.map((d, i) => (
              <label key={d}>
                <input
                  type="checkbox"
                  checked={days.includes(i + 1)}
                  onChange={(e) => setDays(e.target.checked ? [...days, i + 1] : days.filter((x) => x !== i + 1))}
                />
                {d}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="f">
          Beschikbaarheid
          <input type="text" value={avail} onChange={(e) => setAvail(e.target.value)} placeholder="Bijvoorbeeld: Vrijdag naar school" />
        </label>
        <label className="f">
          Opmerkingen
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {err && (
          <div className="err" role="alert">
            {err}
          </div>
        )}
        <div className="mf">
          {ed && (
            <div className="left">
              <button type="button" className="btn small danger" onClick={del}>
                Verwijderen
              </button>
            </div>
          )}
          <button type="button" className="btn" onClick={ui.closeModal}>
            Annuleren
          </button>
          <button type="submit" className="btn primary">
            Opslaan
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- afwezigheid ---------- */
export function AbsenceModal({ id, week, data, actions, ui }: Common & { id?: string; week: string }) {
  const ed = id ? data.absences.find((x) => x.id === id) : undefined;
  const [empId, setEmpId] = useState(ed?.empId ?? data.employees[0]?.id ?? '');
  const [type, setType] = useState<AbsType>(ed?.type ?? 'Vakantie');
  const [from, setFrom] = useState(ed?.from ?? week);
  const [to, setTo] = useState(ed?.to ?? week);
  const [note, setNote] = useState(ed?.note ?? '');
  const [err, setErr] = useState('');
  const planned = from && to ? data.assignments.filter((a) => a.empId === empId && a.date >= from && a.date <= to).length : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!from || !to || to < from) return setErr('Controleer de datums: "tot en met" mag niet voor "van" liggen.');
    ui.closeModal();
    ui.run(actions.save('absences', { ...(ed ? { id: ed.id } : {}), empId, type, from, to, note }), 'Opgeslagen');
  };
  const del = () => {
    if (!ed) return;
    ui.confirm({
      title: 'Afwezigheid verwijderen',
      lines: ['Deze afwezigheid wordt verwijderd.'],
      okLabel: 'Verwijderen',
      onOk: () => {
        ui.run(actions.remove('absences', ed.id), 'Verwijderd');
      },
    });
  };

  return (
    <Modal title={ed ? 'Afwezigheid aanpassen' : 'Afwezigheid toevoegen'} onClose={ui.closeModal}>
      <form className="mb" onSubmit={submit} noValidate>
        <div className="row2">
          <label className="f">
            Medewerker
            <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
              {data.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="f">
            Soort afwezigheid
            <select value={type} onChange={(e) => setType(e.target.value as AbsType)}>
              {ABS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row2">
          <label className="f">
            Van
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </label>
          <label className="f">
            Tot en met
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
          </label>
        </div>
        <label className="f">
          Opmerking
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {planned > 0 && (
          <div className="info">
            Let op: deze medewerker heeft in deze periode nog {planned} ingeplande {planned === 1 ? 'regel' : 'regels'}. Die krijgen een waarschuwing in de weekplanning.
          </div>
        )}
        {err && (
          <div className="err" role="alert">
            {err}
          </div>
        )}
        <div className="mf">
          {ed && (
            <div className="left">
              <button type="button" className="btn small danger" onClick={del}>
                Verwijderen
              </button>
            </div>
          )}
          <button type="button" className="btn" onClick={ui.closeModal}>
            Annuleren
          </button>
          <button type="submit" className="btn primary">
            Opslaan
          </button>
        </div>
      </form>
    </Modal>
  );
}
