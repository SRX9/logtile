create table if not exists changelog_job (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"("id") on delete cascade,
  repository_id uuid not null references user_repository("id") on delete cascade,
  repo_id text not null,
  repo_name text not null,
  repo_owner text not null,
  repo_full_name text not null,
  github_token text, -- Encrypted token for lambda access
  selected_commits jsonb not null default '[]'::jsonb, -- Array of commit objects with metadata
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  logs jsonb not null default '[]'::jsonb,
  date_range_start text,
  date_range_end text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
stage_result jsonb,
final_changelog_result jsonb,
changelog_title jsonb,
);

-- Add index for efficient lookups by status and user
create index if not exists changelog_job_status_user_idx
  on changelog_job(status, user_id);

-- Add index for repository jobs
create index if not exists changelog_job_repository_idx
  on changelog_job(repository_id);

-- Add trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_changelog_job_updated_at
  before update on changelog_job
  for each row execute function update_updated_at_column();
