create extension if not exists "pgcrypto";

create table if not exists user_repository (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"("id") on delete cascade,
  provider text not null default 'github',
  repo_id text not null,
  name text not null,
  owner text not null,
  full_name text not null,
  description text,
  html_url text not null,
  default_branch text,
  visibility text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_repository_user_provider_repo_idx
  on user_repository(user_id, provider, repo_id);
