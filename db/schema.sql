create extension if not exists pgcrypto;

create type ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type ticket_status as enum (
  'received',
  'triaging',
  'drafted',
  'waiting_for_approval',
  'resolved',
  'escalated'
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  subject text not null,
  body text not null,
  priority ticket_priority not null default 'normal',
  status ticket_status not null default 'received',
  workflow_run_id text,
  approval_event_id text,
  classification jsonb,
  draft_response text,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_status_idx
  on support_tickets (status);

create index if not exists support_tickets_created_at_idx
  on support_tickets (created_at desc);
