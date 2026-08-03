create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'ttc-alert-monitor'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end;
$$;

select cron.schedule(
  'ttc-alert-monitor',
  '*/2 * * * *',
  $cron$
    select net.http_post(
      url := 'https://qvlphhsgkrvcqvjhqkhg.supabase.co/functions/v1/monitor-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'ttc_cron_secret_key'
          limit 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 90000
    ) as request_id;
  $cron$
);

drop function public.configure_ttc_cron_secret(text);
