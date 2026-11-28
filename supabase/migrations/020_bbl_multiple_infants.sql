alter table public.bbl_profiles
  add column if not exists nama text,
  add column if not exists berat_lahir_gram integer,
  add column if not exists panjang_lahir_cm numeric(4,1);
