-- Voeg de volgorde van medewerkers toe. Plak dit in Supabase > SQL Editor > New query en klik op Run.
-- Veilig om opnieuw uit te voeren.

alter table public.employees add column if not exists sort_order int not null default 0;

-- Bestaande medewerkers krijgen de volgorde waarin ze zijn aangemaakt.
update public.employees e
set sort_order = r.rn
from (select id, row_number() over (order by created_at) as rn from public.employees) r
where e.id = r.id and e.sort_order = 0;
