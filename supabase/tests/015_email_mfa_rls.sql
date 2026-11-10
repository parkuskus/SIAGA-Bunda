-- Local-only, transactional RLS test. All test data is rolled back.
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values (
  'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998', 'authenticated', 'authenticated',
  'mfa-rls-test@local.test', crypt('synthetic-only', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb
);

insert into public.profiles (id, nama)
values ('e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998', 'MFA RLS Test');

insert into auth.sessions (id, user_id)
values ('f4a2b7be-bc78-486a-973b-35f72d10c5a9', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998');

insert into storage.objects (bucket_id, name, owner_id)
values ('profile-avatars', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998/avatar.webp', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998');

do $$
declare
  token_event jsonb;
begin
  token_event := public.custom_access_token_hook(jsonb_build_object(
    'user_id', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'authentication_method', 'password',
    'claims', jsonb_build_object('session_id', 'f4a2b7be-bc78-486a-973b-35f72d10c5a9', 'app_mfa_verified', true)
  ));
  if token_event -> 'claims' ->> 'app_mfa_verified' <> 'true' then raise exception 'confirmed password session did not receive the app claim'; end if;
  if not exists (select 1 from private.password_authenticated_sessions where session_id = 'f4a2b7be-bc78-486a-973b-35f72d10c5a9') then raise exception 'password session was not recorded'; end if;

  token_event := public.custom_access_token_hook(jsonb_build_object(
    'user_id', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'authentication_method', 'email/signup',
    'claims', jsonb_build_object('session_id', 'f4a2b7be-bc78-486a-973b-35f72d10c5a9')
  ));
  if token_event -> 'claims' ->> 'app_mfa_verified' <> 'true' then raise exception 'verified signup did not receive MFA claim'; end if;

  update auth.users set email_confirmed_at = null
  where id = 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998';
  token_event := public.custom_access_token_hook(jsonb_build_object(
    'user_id', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'authentication_method', 'email/signup',
    'claims', jsonb_build_object('session_id', 'f4a2b7be-bc78-486a-973b-35f72d10c5a9')
  ));
  if (token_event -> 'claims') ? 'app_mfa_verified' then raise exception 'unconfirmed signup received MFA claim'; end if;
  update auth.users set email_confirmed_at = now()
  where id = 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998';

  token_event := public.custom_access_token_hook(jsonb_build_object(
    'user_id', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'authentication_method', 'otp',
    'claims', jsonb_build_object('session_id', 'f4a2b7be-bc78-486a-973b-35f72d10c5a9')
  ));
  if (token_event -> 'claims') ? 'app_mfa_verified' then raise exception 'OTP-only auth received MFA claim'; end if;

  token_event := public.custom_access_token_hook(jsonb_build_object(
    'user_id', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'authentication_method', 'token_refresh',
    'claims', jsonb_build_object('session_id', 'f4a2b7be-bc78-486a-973b-35f72d10c5a9')
  ));
  if token_event -> 'claims' ->> 'app_mfa_verified' <> 'true' then raise exception 'password session refresh lost its app claim'; end if;
end $$;

do $$
declare
  result text;
begin
  result := public.start_email_mfa_challenge(
    'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'f4a2b7be-bc78-486a-973b-35f72d10c5a9',
    repeat('a', 64)
  );
  if result <> 'sent' then raise exception 'initial challenge was not created'; end if;

  result := public.start_email_mfa_challenge(
    'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'f4a2b7be-bc78-486a-973b-35f72d10c5a9',
    repeat('b', 64)
  );
  if result <> 'cooldown' then raise exception 'consecutive resend bypassed cooldown'; end if;

  for attempt in 1..4 loop
    result := public.verify_email_mfa_challenge(
      'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
      'f4a2b7be-bc78-486a-973b-35f72d10c5a9',
      repeat('c', 64)
    );
    if result <> 'invalid' then raise exception 'wrong OTP attempt % had unexpected status', attempt; end if;
  end loop;

  result := public.verify_email_mfa_challenge(
    'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'f4a2b7be-bc78-486a-973b-35f72d10c5a9',
    repeat('c', 64)
  );
  if result <> 'locked' then raise exception 'fifth wrong OTP did not lock challenge'; end if;

  update private.email_mfa_challenges set expires_at = now() - interval '1 second'
  where user_id = 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998'
    and session_id = 'f4a2b7be-bc78-486a-973b-35f72d10c5a9';
  result := public.verify_email_mfa_challenge(
    'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'f4a2b7be-bc78-486a-973b-35f72d10c5a9',
    repeat('a', 64)
  );
  if result <> 'expired' then raise exception 'expired challenge was not rejected'; end if;

  update private.email_mfa_challenges
  set digest = repeat('d', 64), attempts = 0, locked_until = null,
      consumed_at = null, invalidated_at = null,
      expires_at = now() + interval '5 minutes', last_sent_at = now() - interval '61 seconds'
  where user_id = 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998'
    and session_id = 'f4a2b7be-bc78-486a-973b-35f72d10c5a9';
  result := public.verify_email_mfa_challenge(
    'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'f4a2b7be-bc78-486a-973b-35f72d10c5a9',
    repeat('d', 64)
  );
  if result <> 'verified' then raise exception 'correct OTP was not accepted'; end if;
  result := public.verify_email_mfa_challenge(
    'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'f4a2b7be-bc78-486a-973b-35f72d10c5a9',
    repeat('d', 64)
  );
  if result <> 'used' then raise exception 'OTP replay was not rejected'; end if;
end $$;

do $$
declare
  token_event jsonb;
begin
  token_event := public.custom_access_token_hook(jsonb_build_object(
    'user_id', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'authentication_method', 'token_refresh',
    'claims', jsonb_build_object('session_id', 'f4a2b7be-bc78-486a-973b-35f72d10c5a9')
  ));
  if token_event -> 'claims' ->> 'app_mfa_verified' <> 'true' then raise exception 'verified session did not receive MFA claim'; end if;

  token_event := public.custom_access_token_hook(jsonb_build_object(
    'user_id', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'authentication_method', 'token_refresh',
    'claims', jsonb_build_object('session_id', 'f4a2b7be-bc78-486a-973b-35f72d10c5aa')
  ));
  if (token_event -> 'claims') ? 'app_mfa_verified' then raise exception 'different session received MFA claim'; end if;

  perform public.revoke_email_mfa_session(
    'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'f4a2b7be-bc78-486a-973b-35f72d10c5a9'
  );
  token_event := public.custom_access_token_hook(jsonb_build_object(
    'user_id', 'e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998',
    'authentication_method', 'token_refresh',
    'claims', jsonb_build_object('session_id', 'f4a2b7be-bc78-486a-973b-35f72d10c5a9')
  ));
  if (token_event -> 'claims') ? 'app_mfa_verified' then raise exception 'revoked session retained app claim'; end if;
end $$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998","role":"authenticated","session_id":"f4a2b7be-bc78-486a-973b-35f72d10c5a9"}',
  true
);

do $$
declare
  visible_rows integer;
  affected_rows integer;
begin
  select count(*) into visible_rows from public.profiles where id = auth.uid();
  if visible_rows <> 0 then raise exception 'password-only session read profile data'; end if;

  update public.profiles set nama = 'must remain unchanged' where id = auth.uid();
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'password-only session changed profile data'; end if;

  select count(*) into visible_rows from storage.objects
  where bucket_id = 'profile-avatars' and name = auth.uid()::text || '/avatar.webp';
  if visible_rows <> 0 then raise exception 'password-only session read avatar object'; end if;

  select count(*) into visible_rows from public.profiles
  where id = auth.uid() and current_setting('request.jwt.claims')::jsonb ->> 'app_mfa_verified' = 'true';
  if visible_rows <> 0 then raise exception 'test token unexpectedly contains the MFA claim'; end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"e3f0a3b8-6a9a-4f9b-8a31-5b921b53f998","role":"authenticated","session_id":"f4a2b7be-bc78-486a-973b-35f72d10c5a9","app_mfa_verified":true}',
    true
  );
  select count(*) into visible_rows from public.profiles where id = auth.uid();
  if visible_rows <> 1 then raise exception 'verified session could not read its profile'; end if;

  select count(*) into visible_rows from storage.objects
  where bucket_id = 'profile-avatars' and name = auth.uid()::text || '/avatar.webp';
  if visible_rows <> 1 then raise exception 'verified session could not read its avatar object'; end if;
end $$;

reset role;
rollback;
