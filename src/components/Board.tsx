import { useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import type { Actions } from '../data';
import { DAYS, DS, addDays, fmtShort, todayISO, weekLabel } from '../lib/dates';
import { absFor, asgFor, blockLabel, conflictsFor, projectById, textOn } from '../lib/planning';
import { place } from '../lib/place';
import type { Data, UI } from '../types';

interface Props {
  data: Data;
  week: string;
  setWeek: (w: string) => void;
  thisWeek: string;
  actions: Actions;
  ui: UI;
}

type Drag = { type: 'proj' | 'asg'; id: string } | null;

const WarnIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" width="13" height="13">
    <path d="M8 1.5 15 14H1z" fill="#fff" stroke="#b0261b" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M8 6v4" stroke="#b0261b" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="8" cy="11.6" r=".9" fill="#b0261b" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export function Board({ data, week, setWeek, thisWeek, actions, ui }: Props) {
  const days = [0, 1, 2, 3, 4].map((i) => addDays(week, i));
  const today = todayISO();
  const drag = useRef<Drag>(null);
  const [dropKey, setDropKey] = useState('');

  const active = data.projects.filter((p) => p.status !== 'Afgerond');

  /* ---- slepen ---- */
  const startDrag = (e: DragEvent, d: NonNullable<Drag>) => {
    drag.current = d;
    e.dataTransfer.effectAllowed = 'copyMove';
    try {
      e.dataTransfer.setData('text/plain', d.id);
    } catch {
      /* sommige browsers weigeren dit */
    }
  };
  const endDrag = () => {
    drag.current = null;
    setDropKey('');
  };
  const onDrop = (e: DragEvent, empId: string, date: string) => {
    const d = drag.current;
    if (!d) return;
    e.preventDefault();
    endDrag();
    if (d.type === 'proj') {
      ui.openAssign({ empId, date, projId: d.id });
      return;
    }
    const a = data.assignments.find((x) => x.id === d.id);
    if (!a) return;
    const copy = e.altKey || e.ctrlKey || e.metaKey;
    if (!copy && a.empId === empId && a.date === date) return;
    const item = { empId, projId: a.projId, date, start: a.start, end: a.end, note: a.note };
    if (copy) place(ui, data, actions, item, 'Planning gekopieerd');
    else place(ui, data, actions, { ...item, id: a.id }, 'Planning verplaatst');
  };

  /* ---- week kopiëren ---- */
  const copyWeek = () => {
    const mine = data.assignments.filter((a) => days.includes(a.date));
    const fresh = mine.filter(
      (x) =>
        !data.assignments.some(
          (y) => y.empId === x.empId && y.date === addDays(x.date, 7) && y.projId === x.projId && y.start === x.start && y.end === x.end,
        ),
    );
    if (!fresh.length) {
      ui.toast('Er is niets nieuws om te kopiëren.');
      return;
    }
    const warns = fresh.filter((x) => conflictsFor(data, x.empId, addDays(x.date, 7), x.start, x.end, null).length).length;
    const lines = [`${fresh.length} planningsregels worden gekopieerd naar ${weekLabel(addDays(week, 7)).toLowerCase()}.`];
    if (warns) lines.push(`${warns} van deze regels krijgen een waarschuwing (afwezigheid, overlap of geen werkdag).`);
    ui.confirm({
      title: 'Week kopiëren',
      lines,
      okLabel: 'Kopiëren',
      onOk: async () => {
        const ok = await ui.run(
          actions.saveMany(
            'assignments',
            fresh.map((x) => ({ empId: x.empId, projId: x.projId, date: addDays(x.date, 7), start: x.start, end: x.end, note: x.note })),
          ),
          `${fresh.length} regels gekopieerd`,
        );
        if (ok) setWeek(addDays(week, 7));
      },
    });
  };

  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ui.openAssign({ id });
    }
  };

  return (
    <>
      <div className="print-head">
        <b>Van Boven Aannemers</b> · Weekplanning · {weekLabel(week)}
      </div>
      <div className="page-head">
        <div>
          <h1>Weekplanning</h1>
          <p className="sub">{weekLabel(week)}</p>
        </div>
        <div className="tools">
          <button className="btn icon" onClick={() => setWeek(addDays(week, -7))} aria-label="Vorige week">
            ‹
          </button>
          <button className="btn" onClick={() => setWeek(thisWeek)}>
            Deze week
          </button>
          <button className="btn icon" onClick={() => setWeek(addDays(week, 7))} aria-label="Volgende week">
            ›
          </button>
          <button className="btn" onClick={copyWeek}>
            Kopieer week naar volgende week
          </button>
          <button className="btn" onClick={() => window.print()}>
            Afdrukken / PDF
          </button>
          <button className="btn primary" onClick={() => ui.openAssign({ date: week })}>
            + Inplannen
          </button>
        </div>
      </div>

      <div className="palette">
        <span className="pal-l">Sleep een project naar een medewerker en dag:</span>
        {active.length ? (
          active.map((p) => (
            <div
              key={p.id}
              className="chip pchip"
              draggable
              onDragStart={(e) => startDrag(e, { type: 'proj', id: p.id })}
              onDragEnd={endDrag}
              style={{ ['--c' as string]: p.color, ['--t' as string]: textOn(p.color) }}
              title="Sleep naar een dag in het bord"
            >
              <span className="nm">{p.name}</span>
            </div>
          ))
        ) : (
          <span className="muted">Nog geen actieve projecten. Voeg ze toe onder Projecten.</span>
        )}
        <span className="pal-hint">Houd Alt (Option) ingedrukt om een planning te kopiëren in plaats van te verplaatsen.</span>
      </div>

      {!data.employees.length ? (
        <div className="board-scroll">
          <div className="empty">Nog geen medewerkers. Voeg ze toe onder Medewerkers.</div>
        </div>
      ) : (
        <div className="board-scroll">
          <table className="board">
            <thead>
              <tr>
                <th className="corner" scope="col">
                  Medewerker
                </th>
                {days.map((d, i) => (
                  <th key={d} scope="col" className={d === today ? 'today' : ''}>
                    {DAYS[i]}
                    <small>{fmtShort(d)}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.employees.map((e) => (
                <tr key={e.id}>
                  <th scope="row" className="who">
                    <div>{e.name}</div>
                    <div className="rl">{e.role}</div>
                  </th>
                  {days.map((d, i) => {
                    const ab = absFor(data, e.id, d);
                    const as = asgFor(data, e.id, d);
                    const nw = !e.days.includes(i + 1);
                    const key = e.id + '|' + d;
                    const cls = 'cell' + (d === today ? ' today' : '') + (nw ? ' nonwork' : '') + (dropKey === key ? ' drop' : '');
                    return (
                      <td
                        key={d}
                        className={cls}
                        onDragOver={(ev) => {
                          if (!drag.current) return;
                          ev.preventDefault();
                          ev.dataTransfer.dropEffect = drag.current.type === 'proj' || ev.altKey || ev.ctrlKey ? 'copy' : 'move';
                          if (dropKey !== key) setDropKey(key);
                        }}
                        onDrop={(ev) => onDrop(ev, e.id, d)}
                      >
                        {ab.map((x) => (
                          <div key={x.id} className={'abs abs-' + x.type} title={x.note}>
                            {x.type}
                          </div>
                        ))}
                        {as.map((a) => {
                          const p = projectById(data, a.projId);
                          if (!p) return null;
                          const cf = conflictsFor(data, e.id, d, a.start, a.end, a.id);
                          return (
                            <div
                              key={a.id}
                              className={'chip' + (cf.length ? ' issue' : '')}
                              draggable
                              tabIndex={0}
                              role="button"
                              onDragStart={(ev) => startDrag(ev, { type: 'asg', id: a.id })}
                              onDragEnd={endDrag}
                              onClick={() => ui.openAssign({ id: a.id })}
                              onKeyDown={(ev) => onKey(ev, a.id)}
                              style={{ ['--c' as string]: p.color, ['--t' as string]: textOn(p.color) }}
                              title={(cf.length ? 'Let op: ' + cf.join(' ') + ' ' : '') + (a.note || '')}
                            >
                              <span className="nm">
                                {cf.length > 0 && <WarnIcon />}
                                {p.name}
                              </span>
                              <span className="tm">{blockLabel(a)}</span>
                            </div>
                          );
                        })}
                        {!as.length && !ab.length && (nw ? <div className="nw-l">Vrij</div> : <span className="free">Beschikbaar</span>)}
                        <button
                          className="add"
                          onClick={() => ui.openAssign({ empId: e.id, date: d })}
                          aria-label={`${e.name} inplannen op ${DAYS[i].toLowerCase()}`}
                        >
                          <PlusIcon />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Nog beschikbaar</th>
                {days.map((d, i) => {
                  const fr = data.employees.filter((e) => e.days.includes(i + 1) && !absFor(data, e.id, d).length && !asgFor(data, e.id, d).length);
                  return (
                    <td key={d}>
                      <b>{fr.length}</b> {fr.length === 1 ? 'medewerker vrij' : 'medewerkers vrij'}
                      <small>{fr.map((e) => e.name.split(' ')[0]).join(', ') || ' '}</small>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="legend">
        <span>
          <i style={{ background: 'var(--abs-vakantie-bg)' }} />
          Vakantie
        </span>
        <span>
          <i style={{ background: 'var(--abs-verlof-bg)' }} />
          Verlof
        </span>
        <span>
          <i style={{ background: 'var(--abs-ziekte-bg)' }} />
          Ziekte
        </span>
        <span>
          <i style={{ background: 'var(--abs-overig-bg)' }} />
          Overig
        </span>
        <span>
          <i style={{ background: 'var(--nonwork)' }} />
          Geen standaard werkdag
        </span>
        <span>
          <WarnIcon /> Overlap, afwezigheid of geen werkdag
        </span>
      </div>

      <div className="no-print">
        <Needs data={data} days={days} />
      </div>
    </>
  );
}

function Needs({ data, days }: { data: Data; days: string[] }) {
  const np = data.projects.filter((p) => p.status !== 'Afgerond' && Object.keys(p.need || {}).length);
  return (
    <>
      <div className="section-h">
        <h2>Personeelsbehoefte</h2>
        <p>Aantal ingepland ten opzichte van wat het project nodig heeft. Afwezige medewerkers tellen niet mee. Alleen ter controle, er wordt niets automatisch ingepland.</p>
      </div>
      {!np.length ? (
        <div className="tbl-scroll">
          <div className="empty">Geen behoefte ingesteld. Vul die in bij het project.</div>
        </div>
      ) : (
        <div className="tbl-scroll">
          <table className="list">
            <thead>
              <tr>
                <th>Project</th>
                {days.map((d, i) => (
                  <th key={d}>
                    {DS[i]} {fmtShort(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {np.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="sw" style={{ ['--c' as string]: p.color }} />
                    <b>{p.name}</b>
                  </td>
                  {days.map((d, i) => {
                    const n = p.need?.[String(i + 1)];
                    const out = (p.start && d < p.start) || (p.end && d > p.end);
                    if (!n || out)
                      return (
                        <td key={d}>
                          <span className="need na">{out ? 'buiten looptijd' : '–'}</span>
                        </td>
                      );
                    const seen = new Set<string>();
                    data.assignments.forEach((a) => {
                      if (a.projId === p.id && a.date === d && !absFor(data, a.empId, d).length && data.employees.some((e) => e.id === a.empId)) seen.add(a.empId);
                    });
                    const got = seen.size;
                    const diff = got - n;
                    return (
                      <td key={d}>
                        <span className={'need ' + (diff < 0 ? 'short' : diff > 0 ? 'over' : 'ok')}>
                          {got} / {n} <small>{diff < 0 ? `tekort ${-diff}` : diff > 0 ? `+${diff} extra` : 'compleet'}</small>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

