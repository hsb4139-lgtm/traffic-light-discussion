-- 001_init.sql — 신호등 토론 웹앱 기본 테이블, RLS, Realtime
-- 같은 Supabase 프로젝트를 다른 앱과 함께 쓰므로 모든 테이블·함수 이름을 sd_ 로 시작한다.
-- Supabase SQL Editor에 전부 붙여 넣고 Run 하세요. (한 번만)

-- ───────────── 테이블 ─────────────
create table sd_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  join_code text not null unique,          -- 6자리, 헷갈리는 글자(0/O, 1/I/L) 제외 대문자+숫자
  created_at timestamptz default now()
);

create table sd_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references sd_classes(id) on delete cascade,
  number int not null,
  name text not null,
  group_no int check (group_no between 1 and 6),
  is_group_leader boolean not null default false,
  pin_hash text not null,                  -- bcrypt. 평문 PIN은 저장하지 않음
  failed_attempts int not null default 0,
  locked_until timestamptz,
  unique (class_id, number)
);

create table sd_debates (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references sd_classes(id) on delete cascade,
  title text not null,
  phase text not null default 'draft'
    check (phase in ('draft','group','personal','revote','criteria','closed')),
  show_names boolean not null default false,
  featured_opinion_id uuid,                -- 전광판 크게 보기 중인 의견
  created_at timestamptz default now()
);
-- 한 학급에 진행 중인 토론은 하나만
create unique index sd_one_active_debate on sd_debates(class_id)
  where phase not in ('draft','closed');

create table sd_cards (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references sd_debates(id) on delete cascade,
  label text not null,                     -- 'A'~'D'
  title text not null,
  body text not null default '' check (length(body) <= 500),
  position int not null default 0,
  personal_open boolean not null default false
);

create table sd_group_votes (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references sd_debates(id) on delete cascade,  -- Realtime 필터용 비정규화
  card_id uuid not null references sd_cards(id) on delete cascade,
  group_no int not null check (group_no between 1 and 6),
  color text not null check (color in ('green','yellow','red')),
  reason text not null default '' check (length(reason) <= 100),
  updated_by uuid references sd_students(id) on delete set null,
  updated_at timestamptz default now(),
  unique (card_id, group_no)
);

create table sd_opinions (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references sd_debates(id) on delete cascade,  -- Realtime 필터용 비정규화
  card_id uuid not null references sd_cards(id) on delete cascade,
  student_id uuid not null references sd_students(id) on delete cascade,
  first_color text not null check (first_color in ('green','yellow','red')),
  first_reason text not null check (length(first_reason) <= 100),
  yellow_type text check (yellow_type in ('condition','curious')),
  current_color text not null check (current_color in ('green','yellow','red')),
  change_reason text check (length(change_reason) <= 100),
  keep_reason text check (length(keep_reason) <= 100),
  revoted boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz default now(),
  changed_at timestamptz,
  unique (card_id, student_id),
  check (current_color = first_color or coalesce(length(trim(change_reason)),0) > 0)
);

create table sd_criteria (                    -- 다음 단계 기능
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references sd_debates(id) on delete cascade,
  student_id uuid not null references sd_students(id) on delete cascade,
  text text not null check (length(text) <= 100),
  created_at timestamptz default now(),
  unique (debate_id, student_id)
);

create index on sd_students(class_id);
create index on sd_debates(class_id);
create index on sd_cards(debate_id);
create index on sd_group_votes(debate_id);
create index on sd_opinions(debate_id);
create index on sd_opinions(student_id);

-- ───────────── 헬퍼 함수 ─────────────
create or replace function public.sd_owns_class(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from sd_classes where id = cid and teacher_id = auth.uid());
$$;

create or replace function public.sd_owns_debate(did uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from sd_debates d join sd_classes c on c.id = d.class_id
    where d.id = did and c.teacher_id = auth.uid()
  );
$$;

revoke all on function public.sd_owns_class(uuid) from public, anon;
revoke all on function public.sd_owns_debate(uuid) from public, anon;
grant execute on function public.sd_owns_class(uuid) to authenticated;
grant execute on function public.sd_owns_debate(uuid) to authenticated;

-- ───────────── RLS ─────────────
-- 학생은 Supabase에 직접 접근하지 않는다(서버 API만). anon에는 아무 정책도 주지 않는다.
alter table sd_classes     enable row level security;
alter table sd_students    enable row level security;
alter table sd_debates     enable row level security;
alter table sd_cards       enable row level security;
alter table sd_group_votes enable row level security;
alter table sd_opinions    enable row level security;
alter table sd_criteria    enable row level security;

revoke all on sd_classes, sd_students, sd_debates, sd_cards, sd_group_votes, sd_opinions, sd_criteria from anon;

create policy teacher_all on sd_classes for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy teacher_all on sd_students for all to authenticated
  using (sd_owns_class(class_id)) with check (sd_owns_class(class_id));

create policy teacher_all on sd_debates for all to authenticated
  using (sd_owns_class(class_id)) with check (sd_owns_class(class_id));

create policy teacher_all on sd_cards for all to authenticated
  using (sd_owns_debate(debate_id)) with check (sd_owns_debate(debate_id));

create policy teacher_all on sd_group_votes for all to authenticated
  using (sd_owns_debate(debate_id)) with check (sd_owns_debate(debate_id));

create policy teacher_all on sd_opinions for all to authenticated
  using (sd_owns_debate(debate_id)) with check (sd_owns_debate(debate_id));

create policy teacher_all on sd_criteria for all to authenticated
  using (sd_owns_debate(debate_id)) with check (sd_owns_debate(debate_id));

-- ───────────── Realtime ─────────────
alter publication supabase_realtime add table sd_debates, sd_cards, sd_group_votes, sd_opinions;
