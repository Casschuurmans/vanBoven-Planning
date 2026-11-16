import type { Actions } from '../data';
import type { Data, UI } from '../types';

/** Verplaatst een medewerker een stap (dir) of naar de plek van een andere medewerker (targetId). */
export function reorderEmployees(ui: UI, data: Data, actions: Actions, id: string, targetId: string | null, dir?: -1 | 1): void {
  const list = data.employees;
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
}
