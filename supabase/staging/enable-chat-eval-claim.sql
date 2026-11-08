-- Apply only to Supabase staging project gjizoreqciqelmkakluz.
-- The test bypass is held in trusted app_metadata and never changes RLS policies.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
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
  if method in ('password', 'token_refresh') and exists (
    select 1 from auth.users u
    where u.id = v_user_id
      and u.raw_app_meta_data ->> 'chat_eval_bypass' = 'true'
  ) then
    verified := true;
  elsif method = 'email/signup' then
    select exists (
      select 1 from auth.users u
      where u.id = v_user_id
        and coalesce(u.encrypted_password, '') <> ''
        and u.email_confirmed_at is not null
    ) into verified;
  elsif method = 'token_refresh' then
    select exists (
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
