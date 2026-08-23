# Moderation

The wall is the only place lenticard shows one person's images to strangers, so
it is the only place that needs moderating. Everything else is a private link
between two people.

## What is public and what is not

| Surface | Who can see it | Gate |
| --- | --- | --- |
| A card sent by link | Anyone holding the link | None. It is a message between two people. |
| The wall | Everyone | Google sign-in, then review. |

A sent card is not published anywhere. With the default store it never touches a
server at all — the whole card lives inside the URL fragment, which browsers do
not transmit. There is nothing to moderate because there is no shared surface.

## The default build cannot publish

Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, "post to the wall"
writes to that browser's own `localStorage` and nowhere else. Nobody else can
load it. A static deploy of this repo therefore has no route by which a stranger
can put an image in front of other people, which is the safe default.

## When a store is connected

Three layers, none of which run in the browser:

1. **Identity.** Posting requires a Google account through Supabase Auth. The
   insert is authorised with the user's own token, never the anon key, so every
   row is attributable to an account.
2. **Review.** Rows are inserted with `status = 'pending'`. The listing query
   filters on `status = 'approved'`, and row-level security must enforce the
   same thing so a crafted request cannot ask for pending rows. Nothing reaches
   the wall until something approves it.
3. **Reports.** Every published card carries a report control, writing to
   `card_reports`. That is the backstop for whatever gets through the first two.

Client-side image classification is deliberately **not** part of this list. Any
check that runs in the page can be skipped by not using the page, so it is worth
nothing as a control. If you want automated screening, run it where the upload
lands — a Supabase Edge Function or webhook on insert that calls an image
moderation API and sets `status` to `approved` or `rejected`. That is the only
place a check cannot be bypassed.

## Schema

```sql
create table cards_public (
  id          uuid primary key default gen_random_uuid(),
  author      uuid not null references auth.users (id),
  from_name   text,
  note        text,
  occasion    text,
  settings    jsonb not null default '{}',
  frames      jsonb not null,
  link        text,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);

alter table cards_public enable row level security;

-- Anyone may read approved cards, and nothing else.
create policy "read approved" on cards_public
  for select using (status = 'approved');

-- Signed-in users may post as themselves, and only as pending.
create policy "insert own pending" on cards_public
  for insert with check (auth.uid() = author and status = 'pending');

create table card_reports (
  id        uuid primary key default gen_random_uuid(),
  card_id   uuid not null references cards_public (id) on delete cascade,
  reason    text,
  created_at timestamptz not null default now()
);

alter table card_reports enable row level security;

create policy "anyone may report" on card_reports for insert with check (true);
```

Add a rate limit on inserts per account, and a cap on frame size, before opening
this to the public.

## Reviewing

Approving is a single update:

```sql
update cards_public set status = 'approved' where id = '...';
```

Rejected rows stay in the table so a repeat poster is visible.
