import type { Actions } from '../data';
import { conflictsFor } from './planning';
import type { Assignment, Data, UI } from '../types';

export type AsgDraft = Omit<Assignment, 'id'> & { id?: string };

/** Plant een regel in en vraagt eerst bevestiging als er een waarschuwing is. */
export function place(ui: UI, data: Data, actions: Actions, item: AsgDraft, doneMsg: string): void {
  const c = conflictsFor(data, item.empId, item.date, item.start, item.end, item.id);
  const go = () => {
    ui.run(actions.save('assignments', item), doneMsg);
  };
  if (c.length) {
    ui.confirm({
      title: 'Controleer de planning',
      lines: c,
      okLabel: item.id ? 'Toch verplaatsen' : 'Toch inplannen',
      onOk: go,
    });
  } else {
    go();
  }
}
