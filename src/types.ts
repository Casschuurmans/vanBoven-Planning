export type Status = 'Voorbereiding' | 'In uitvoering' | 'Afgerond' | 'On hold';
export type AbsType = 'Vakantie' | 'Verlof' | 'Ziekte' | 'Overig';
export type Kind = 'project' | 'klus';

export interface Employee {
  id: string;
  name: string;
  role: string;
  days: number[]; // 1 = maandag ... 5 = vrijdag
  avail: string;
  notes: string;
}

export interface Project {
  id: string;
  name: string;
  number: string;
  location: string;
  start: string; // '' als leeg
  end: string;
  status: Status;
  color: string;
  kind: Kind;
  desc: string;
  need: Record<string, number>; // {"1": 5} = 5 medewerkers nodig op maandag
}

export interface Assignment {
  id: string;
  empId: string;
  projId: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;
  note: string;
}

export interface Absence {
  id: string;
  empId: string;
  type: AbsType;
  from: string;
  to: string;
  note: string;
}

export interface Data {
  employees: Employee[];
  projects: Project[];
  assignments: Assignment[];
  absences: Absence[];
}

export interface AssignOpts {
  id?: string;
  empId?: string;
  date?: string;
  projId?: string;
}

export interface ConfirmOpts {
  title: string;
  intro?: string;
  lines: string[];
  okLabel: string;
  onOk: () => void;
}

export interface UI {
  openAssign: (o: AssignOpts) => void;
  openProject: (id?: string, kind?: Kind) => void;
  openEmployee: (id?: string) => void;
  openAbsence: (id?: string) => void;
  confirm: (c: ConfirmOpts) => void;
  closeModal: () => void;
  toast: (m: string) => void;
  run: (p: Promise<unknown>, ok?: string) => Promise<boolean>;
}
