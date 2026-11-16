import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { usePlanningData } from './data';
import { mondayOf, todayISO } from './lib/dates';
import { Login } from './components/Login';
import { Board } from './components/Board';
import { AbsencesView, EmployeesView, ProjectsView } from './components/Lists';
import { AbsenceModal, AssignModal, ConfirmModal, EmployeeModal, ProjectModal } from './components/Modals';
import type { AssignOpts, ConfirmOpts, Kind, UI } from './types';

const TABS: [string, string][] = [
  ['weekplanning', 'Weekplanning'],
  ['projecten', 'Projecten'],
  ['medewerkers', 'Medewerkers'],
  ['afwezigheid', 'Afwezigheid'],
];

type ModalState =
  | null
  | { t: 'assign'; o: AssignOpts }
  | { t: 'project'; id?: string; kind?: Kind }
  | { t: 'employee'; id?: string }
  | { t: 'absence'; id?: string }
  | { t: 'confirm'; c: ConfirmOpts };

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div className="center">Laden…</div>;
  if (!session) return <Login />;
  return <Shell session={session} />;
}

function tabFromHash(): string {
  const h = window.location.hash.replace('#', '');
  return TABS.some((t) => t[0] === h) ? h : 'weekplanning';
}

function Shell({ session }: { session: Session }) {
  const { data, status, error, live, actions, reload } = usePlanningData();
  const [tab, setTab] = useState(tabFromHash);
  const [week, setWeek] = useState(() => mondayOf(todayISO()));
  const [modal, setModal] = useState<ModalState>(null);
  const [toastMsg, setToastMsg] = useState('');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const f = () => setTab(tabFromHash());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastMsg(''), 3000);
  }, []);

  const ui: UI = useMemo(
    () => ({
      openAssign: (o) => {
        if (!data.employees.length || !data.projects.length) {
          toast('Voeg eerst een medewerker en een project toe.');
          return;
        }
        setModal({ t: 'assign', o });
      },
      openProject: (id, kind) => setModal({ t: 'project', id, kind }),
      openEmployee: (id) => setModal({ t: 'employee', id }),
      openAbsence: (id) => {
        if (!data.employees.length) {
          toast('Voeg eerst een medewerker toe.');
          return;
        }
        setModal({ t: 'absence', id });
      },
      confirm: (c) => setModal({ t: 'confirm', c }),
      closeModal: () => setModal(null),
      toast,
      run: async (p, ok) => {
        try {
          await p;
          if (ok) toast(ok);
          return true;
        } catch (e) {
          toast('Opslaan is niet gelukt: ' + (e instanceof Error ? e.message : 'onbekende fout'));
          return false;
        }
      },
    }),
    [data.employees.length, data.projects.length, toast],
  );

  const go = (t: string) => {
    window.location.hash = t;
    setTab(t);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <b>Van Boven</b>
            <span>Aannemers</span>
          </div>
          <nav className="tabs" aria-label="Hoofdnavigatie">
            {TABS.map(([k, l]) => (
              <button key={k} className="tab" aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}>
                {l}
              </button>
            ))}
          </nav>
          <div className="userbox">
            <span className={'live' + (live ? '' : ' off')} title={live ? 'Wijzigingen van collega’s verschijnen direct' : 'Verbinding wordt hersteld'}>
              <i />
              {live ? 'Live' : 'Verbinden…'}
            </span>
            <span>{session.user.email}</span>
            <button className="btn small" onClick={() => supabase.auth.signOut()}>
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      <main className="wrap">
        {status === 'loading' && <div className="center">Planning laden…</div>}
        {status === 'error' && (
          <div className="banner" role="alert">
            De gegevens konden niet worden geladen: {error}{' '}
            <button className="btn small" onClick={reload}>
              Opnieuw proberen
            </button>
          </div>
        )}
        {status === 'ready' && tab === 'weekplanning' && (
          <Board data={data} week={week} setWeek={setWeek} thisWeek={mondayOf(todayISO())} actions={actions} ui={ui} />
        )}
        {status === 'ready' && tab === 'projecten' && <ProjectsView data={data} ui={ui} />}
        {status === 'ready' && tab === 'medewerkers' && <EmployeesView data={data} ui={ui} actions={actions} />}
        {status === 'ready' && tab === 'afwezigheid' && <AbsencesView data={data} ui={ui} />}
      </main>

      {modal?.t === 'assign' && <AssignModal opts={modal.o} data={data} actions={actions} ui={ui} />}
      {modal?.t === 'project' && <ProjectModal id={modal.id} kind={modal.kind} data={data} actions={actions} ui={ui} />}
      {modal?.t === 'employee' && <EmployeeModal id={modal.id} data={data} actions={actions} ui={ui} />}
      {modal?.t === 'absence' && <AbsenceModal id={modal.id} week={week} data={data} actions={actions} ui={ui} />}
      {modal?.t === 'confirm' && <ConfirmModal c={modal.c} onClose={ui.closeModal} />}
      {toastMsg && (
        <div className="toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </>
  );
}
