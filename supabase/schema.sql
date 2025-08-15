-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customerName text,
  customerPhone text,
  customerEmail text,
  status text default 'OPEN',
  unreadForAdmin integer default 0,
  lastMessagePreview text,
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);
create index if not exists conversations_updatedat_idx on public.conversations (updatedAt desc);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversationId uuid references public.conversations(id) on delete cascade,
  sender text check (sender in ('CUSTOMER','ADMIN')) not null,
  content text,
  attachmentUrl text,
  attachmentType text,
  createdAt timestamptz default now()
);
create index if not exists messages_conversation_idx on public.messages (conversationId);
create index if not exists messages_createdat_idx on public.messages (createdAt asc);

-- Appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  fullName text not null,
  phone text not null,
  email text,
  note text,
  scheduledAt timestamptz not null,
  status text default 'unprocessed',
  createdAt timestamptz default now()
);
create index if not exists appointments_scheduled_idx on public.appointments (scheduledAt desc);

-- Realtime publication
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.appointments;

-- Row Level Security
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.appointments enable row level security;

-- Policies (relaxed: allow all authenticated; server uses service role)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'conversations' and policyname = 'allow read to authenticated'
  ) then
    create policy "allow read to authenticated" on public.conversations for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'messages' and policyname = 'allow read to authenticated'
  ) then
    create policy "allow read to authenticated" on public.messages for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'appointments' and policyname = 'allow read to authenticated'
  ) then
    create policy "allow read to authenticated" on public.appointments for select to authenticated using (true);
  end if;
end $$;

-- NOTE: Inserts/updates/deletes are performed by the server using the service role key.
-- No public insert/update policies are created here.


