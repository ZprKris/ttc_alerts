update public.alert_notification_candidates
set status = 'pending',
    processing_started_at = null,
    last_error = null
where status = 'failed';

update public.subscription_email_events
set status = 'pending',
    processing_started_at = null,
    last_error = null
where status = 'failed';
