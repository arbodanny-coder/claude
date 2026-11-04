-- Secure data collection (SSN / banking / full application) sent to clients by agents.
-- Sensitive payload is AES-GCM encrypted in the edge functions; the DB never holds plaintext.
create table if not exists public.data_collection_requests (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,              -- sha256 of the link token (token itself is never stored)
  agent_id uuid not null references auth.users(id),
  lead_id uuid,                                  -- TODO: add FK to your leads table once its name is confirmed
  client_name text,
  client_contact text,                           -- phone or email the link was sent to
  channel text check (channel in ('sms','email','copy')) default 'copy',
  form_type text not null check (form_type in ('ssn','banking','full')),
  status text not null default 'pending' check (status in ('pending','completed','expired','revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  completed_at timestamptz,
  attempts int not null default 0,
  last4_ssn text,                                -- for masked display
  bank_name text,                                -- not secret enough to hide; routing/account stay encrypted
  payload_enc text,                              -- base64(iv || ciphertext) of the submitted JSON
  created_at timestamptz not null default now()
);

create table if not exists public.data_collection_reveals (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.data_collection_requests(id) on delete cascade,
  agent_id uuid not null,
  revealed_at timestamptz not null default now()
);

alter table public.data_collection_requests enable row level security;
alter table public.data_collection_reveals enable row level security;

create policy "agents read own requests" on public.data_collection_requests
  for select to authenticated using (agent_id = auth.uid());
create policy "agents read own reveal log" on public.data_collection_reveals
  for select to authenticated using (agent_id = auth.uid());

-- Agents can never read token_hash or the encrypted payload directly; only edge functions (service role) can.
revoke all on public.data_collection_requests from anon, authenticated;
grant select (id, agent_id, lead_id, client_name, client_contact, channel, form_type, status,
              expires_at, completed_at, last4_ssn, bank_name, created_at)
  on public.data_collection_requests to authenticated;
revoke all on public.data_collection_reveals from anon, authenticated;
grant select on public.data_collection_reveals to authenticated;

create index if not exists dcr_agent_idx on public.data_collection_requests(agent_id, created_at desc);
create index if not exists dcr_lead_idx on public.data_collection_requests(lead_id);
