create table if not exists private.password_authenticated_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  authenticated_at timestamptz not null default now()
);

alter table private.password_authenticated_sessions enable row level security;
revoke all on private.password_authenticated_sessions from public, anon, authenticated;
grant select, insert, update on private.password_authenticated_sessions to supabase_auth_admin;
grant select, insert, update, delete on private.password_authenticated_sessions to service_role;
grant select (id, encrypted_password, email_confirmed_at) on auth.users to supabase_auth_admin;
grant select (id, user_id, not_after) on auth.sessions to supabase_auth_admin;

create or replace function public.revoke_email_mfa_session(p_user_id uuid, p_session_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.email_mfa_verified_sessions where user_id = p_user_id and session_id = p_session_id;
  delete from private.password_authenticated_sessions where user_id = p_user_id and session_id = p_session_id;
  delete from private.email_mfa_challenges where user_id = p_user_id and session_id = p_session_id;
$$;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb) - 'app_mfa_verified';
  method text := event ->> 'authentication_method';
  v_user_id uuid := (event ->> 'user_id')::uuid;
  v_session_id uuid := (event -> 'claims' ->> 'session_id')::uuid;
  verified boolean := false;
begin
  if method in ('email/signup', 'password') then
    select exists (
      select 1
      from auth.users u
      join auth.sessions s on s.id = v_session_id and s.user_id = u.id
      where u.id = v_user_id
        and coalesce(u.encrypted_password, '') <> ''
        and u.email_confirmed_at is not null
        and (s.not_after is null or s.not_after > now())
    ) into verified;

    if verified then
      insert into private.password_authenticated_sessions (session_id, user_id)
      values (v_session_id, v_user_id)
      on conflict (session_id) do update set user_id = excluded.user_id, authenticated_at = now();
    end if;
  elsif method = 'token_refresh' then
    select exists (
      select 1
      from private.password_authenticated_sessions p
      join auth.sessions s on s.id = p.session_id and s.user_id = p.user_id
      join auth.users u on u.id = p.user_id
      where p.user_id = v_user_id and p.session_id = v_session_id
        and coalesce(u.encrypted_password, '') <> ''
        and u.email_confirmed_at is not null
        and (s.not_after is null or s.not_after > now())
    ) or exists (
      select 1
      from private.email_mfa_verified_sessions v
      join auth.sessions s on s.id = v.session_id and s.user_id = v.user_id
      where v.user_id = v_user_id and v.session_id = v_session_id
        and (s.not_after is null or s.not_after > now())
    ) into verified;
  end if;

  if verified then claims := jsonb_set(claims, '{app_mfa_verified}', 'true'::jsonb, true); end if;
  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
