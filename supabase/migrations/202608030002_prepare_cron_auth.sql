create or replace function public.configure_ttc_cron_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  if p_secret is null or char_length(p_secret) < 20 then
    raise exception using
      errcode = '22023',
      message = 'A valid cron authentication secret is required.';
  end if;

  select id
  into v_secret_id
  from vault.secrets
  where name = 'ttc_cron_secret_key';

  if v_secret_id is null then
    perform vault.create_secret(
      p_secret,
      'ttc_cron_secret_key',
      'Server key used only by the TTC alert pg_cron job.'
    );
  else
    perform vault.update_secret(
      v_secret_id,
      p_secret,
      'ttc_cron_secret_key',
      'Server key used only by the TTC alert pg_cron job.'
    );
  end if;
end;
$$;

revoke all on function public.configure_ttc_cron_secret(text)
from public, anon, authenticated;
grant execute on function public.configure_ttc_cron_secret(text)
to service_role;
