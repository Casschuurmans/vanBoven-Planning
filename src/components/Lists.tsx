import { useRef, useState } from 'react';
import type { Actions } from '../data';
import { DS, fmtLong, fmtShort, todayISO } from '../lib/dates';
import type { Data, UI } from '../types';

const slug = (s: string) => s.replace(/\s+/g, '-');

type Filter = 'actief' | 'hold' | 'afgerond' | 'alles';

export function ProjectsView({ data, ui }: { data: Data; ui: UI }) {
  const [f, setF] = useState<Filter>('actief');
  const list = data.projects.filter((p) =>
    f === 'alles' ? true : f === 'actief' ? p.status === 'Voorbereiding' || p.status === 'In uitvoering' : f === 'afgerond' ? p.status === 'Afgerond' : p.status === 'On hold',
  );
  const seg: [Filter, string][] = [
    ['actief', 'Actief'],
    ['hold', 'On hold'],
    ['afgerond', 'Afgerond'],
    ['alles', 'Alles'],
  ];
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Projecten</h1>
          <p className="sub">{data.projects.length} projecten en losse klussen</p>
        </div>
        <div className="tools">
          <div className="seg" role="group" aria-label="Filter op status">
            {seg.map(([v, l]) => (
              <button key={v} onClick={() => setF(v)} aria-pressed={f === v}>
                {l}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => ui.openProject(undefined, 'klus')}>
            + Losse klus
          </button>
          <button className="btn primary" onClick={() => ui.openProject(undefined, 'project')}>
            + Nieuw project
          </button>
        </div>
      </div>
      {!list.length ? (
        <div className="tbl-scroll">
          <div className="empty">Geen projecten in dit overzicht.</div>
        </div>
      ) : (
        <div className="tbl-scroll">
          <table className="list">
            <thead>
              <tr>
                <th>Project</th>
                <th>Nummer</th>
                <th>Locatie</th>
                <th>Looptijd</th>
                <th>Status</th>
                <th>Behoefte ma–vr</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const nd = [1, 2, 3, 4, 5].map((d) => p.need?.[String(d)] || 0);
                return (
                  <tr key={p.id} className={p.status === 'Afgerond' ? 'dim' : ''}>
                    <td>
                      <span className="sw" style={{ ['--c' as string]: p.color }} />
                      <b>{p.name}</b>
                      {p.kind === 'klus' && <span className="tag">Klus</span>}
                      {p.desc && (
                        <div className="muted" style={{ marginLeft: 20, maxWidth: 340 }}>
                          {p.desc}
                        </div>
                      )}
                    </td>
                    <td>{p.number || '–'}</td>
                    <td>{p.location || '–'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {p.start ? fmtShort(p.start) : '–'} → {p.end ? fmtShort(p.end) : '–'}
                    </td>
                    <td>
                      <span className={'pill s-' + slug(p.status)}>{p.status}</span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {nd.some(Boolean) ? nd.join(' · ') : <span className="muted">–</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn small" onClick={() => ui.openProject(p.id)}>
                        Aanpassen
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function EmployeesView({ data, ui, actions }: { data: Data; ui: UI; actions: Actions }) {
  const dragId = useRef<string | null>(null);
  const [over, setOver] = useState('');
  const list = data.employees;

  /** Verplaatst een medewerker een stap (dir) of naar de plek van een andere medewerker (targetId). */
  const reorder = (id: string, targetId: string | null, dir?: -1 | 1) => {
    const ids = list.map((e) => e.id);
    const from = ids.indexOf(id);
    if (from < 0) return;
    let to: number;
    if (dir) {
      to = from + dir;
      if (to < 0 || to >= ids.length) return;
    } else {
      to = ids.indexOf(targetId ?? '');
      if (to < 0 || to === from) return;
    }
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    const changed = ids
      .map((eid, i) => ({ e: list.find((x) => x.id === eid)!, order: i + 1 }))
      .filter((x) => x.e.order !== x.order);
    ui.run(Promise.all(changed.map((x) => actions.save('employees', { ...x.e, order: x.order }))));
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Medewerkers</h1>
          <p className="sub">{list.length} medewerkers. Sleep een rij of gebruik de pijltjes om de volgorde in de weekplanning te bepalen.</p>
        </div>
        <div className="tools">
          <button className="btn primary" onClick={() => ui.openEmployee()}>
            + Nieuwe medewerker
          </button>
        </div>
      </div>
      {!list.length ? (
        <div className="tbl-scroll">
          <div className="empty">Nog geen medewerkers. Voeg de eerste toe.</div>
        </div>
      ) : (
        <div className="tbl-scroll">
          <table className="list">
            <thead>
              <tr>
                <th>Volgorde</th>
                <th>Naam</th>
                <th>Functie</th>
                <th>Werkdagen</th>
                <th>Beschikbaarheid</th>
                <th>Opmerkingen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((e, i) => (
                <tr
                  key={e.id}
                  draggable
                  onDragStart={(ev) => {
                    dragId.current = e.id;
                    ev.dataTransfer.effectAllowed = 'move';
                    try {
                      ev.dataTransfer.setData('text/plain', e.id);
                    } catch {
                      /* sommige browsers weigeren dit */
                    }
                  }}
                  onDragOver={(ev) => {
                    if (!dragId.current) return;
                    ev.preventDefault();
                    if (over !== e.id) setOver(e.id);
                  }}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    const d = dragId.current;
                    dragId.current = null;
                    setOver('');
                    if (d) reorder(d, e.id);
                  }}
                  onDragEnd={() => {
                    dragId.current = null;
                    setOver('');
                  }}
                  style={over === e.id ? { outline: '2px solid var(--gold)', outlineOffset: -2 } : undefined}
                >
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ cursor: 'grab', color: 'var(--muted)', marginRight: 6 }} aria-hidden="true" title="Sleep om te verplaatsen">
                      ⠿
                    </span>
                    <button className="btn small icon" disabled={i === 0} onClick={() => reorder(e.id, null, -1)} aria-label={`${e.name} een plek omhoog`}>
                      ▲
                    </button>{' '}
                    <button className="btn small icon" disabled={i === list.length - 1} onClick={() => reorder(e.id, null, 1)} aria-label={`${e.name} een plek omlaag`}>
                      ▼
                    </button>
                  </td>
                  <td>
                    <b>{e.name}</b>
                  </td>
                  <td>{e.role || '–'}</td>
                  <td>
                    <span className="days-pills">
                      {DS.map((d, k) => (
                        <span key={d} className={e.days.includes(k + 1) ? 'on' : ''}>
                          {d}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td>{e.avail || '–'}</td>
                  <td className="muted">{e.notes}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn small" onClick={() => ui.openEmployee(e.id)}>
                      Aanpassen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function AbsencesView({ data, ui }: { data: Data; ui: UI }) {
  const today = todayISO();
  const list = data.absences.slice().sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Afwezigheid</h1>
          <p className="sub">Vakantie, verlof, ziekte en overige afwezigheid. Zichtbaar in de weekplanning.</p>
        </div>
        <div className="tools">
          <button className="btn primary" onClick={() => ui.openAbsence()}>
            + Afwezigheid toevoegen
          </button>
        </div>
      </div>
      {!list.length ? (
        <div className="tbl-scroll">
          <div className="empty">Geen afwezigheid geregistreerd.</div>
        </div>
      ) : (
        <div className="tbl-scroll">
          <table className="list">
            <thead>
              <tr>
                <th>Medewerker</th>
                <th>Soort</th>
                <th>Van</th>
                <th>Tot en met</th>
                <th>Opmerking</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((x) => {
                const e = data.employees.find((m) => m.id === x.empId);
                if (!e) return null;
                const t = x.type.toLowerCase();
                return (
                  <tr key={x.id} className={x.to < today ? 'dim' : ''}>
                    <td>
                      <b>{e.name}</b>
                    </td>
                    <td>
                      <span className="pill" style={{ background: `var(--abs-${t}-bg)`, color: `var(--abs-${t}-fg)`, borderColor: 'transparent' }}>
                        {x.type}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtLong(x.from)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtLong(x.to)}</td>
                    <td className="muted">{x.note}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn small" onClick={() => ui.openAbsence(x.id)}>
                        Aanpassen
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
