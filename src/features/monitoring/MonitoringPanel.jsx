import { useEffect, useMemo, useRef, useState } from 'react'
import { useSubscriptionSession } from '../auth/useSubscriptionSession.js'
import {
  clearPendingPreferenceDraft,
  savePendingPreferenceDraft,
} from '../../services/preferenceDraft.js'
import {
  loadPreferences,
  requestEmailLink,
  savePreferences,
  unsubscribePreferences,
} from '../../services/subscriptionApi.js'
import {
  WEEKDAYS,
  createInitialMonitoringValues,
  getScheduleKind,
  getTimeZoneOptions,
  isoWeekdaysToValues,
  validateEmailAddress,
  validateMonitoringValues,
  weekdayValuesToIso,
} from './monitoringForm.js'
import './monitoringPanel.css'

const timeZoneOptions = getTimeZoneOptions()
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2)
  const minute = index % 2 === 0 ? '00' : '30'
  const value = `${String(hour).padStart(2, '0')}:${minute}`
  const displayHour = hour % 12 || 12
  const period = hour < 12 ? 'AM' : 'PM'

  return { value, label: `${displayHour}:${minute} ${period}` }
})

function createValuesFromDraft(initialDraft) {
  const initialValues = createInitialMonitoringValues()

  if (!initialDraft) {
    return initialValues
  }

  return {
    ...initialValues,
    startTime: initialDraft.startTime || initialValues.startTime,
    endTime: initialDraft.endTime || initialValues.endTime,
    timeZone: initialDraft.timeZone || initialValues.timeZone,
    weekdays: initialDraft.weekdays?.length
      ? initialDraft.weekdays
      : initialValues.weekdays,
    email: '',
    consent: false,
  }
}

export default function MonitoringPanel({
  initialDraft,
  selectedStations,
  selectedCount,
  onClearSelection,
  onReplaceSelection,
}) {
  const [values, setValues] = useState(() =>
    createValuesFromDraft(initialDraft),
  )
  const [errors, setErrors] = useState({})
  const [submission, setSubmission] = useState({ kind: 'idle', message: '' })
  const [hasSubscription, setHasSubscription] = useState(false)
  const [confirmingUnsubscribe, setConfirmingUnsubscribe] = useState(false)
  const loadedUserId = useRef(null)
  const {
    status: authStatus,
    isConfigured,
    user,
    signOut,
  } = useSubscriptionSession()
  const stationIds = selectedStations.map((station) => station.id)
  const verifiedEmail = user?.email ?? ''
  const effectiveValues = {
    ...values,
    email: verifiedEmail || values.email,
  }
  const stationCountLabel = `${selectedCount} station${
    selectedCount === 1 ? '' : 's'
  } selected`
  const scheduleKind = getScheduleKind(values.startTime, values.endTime)
  const visibleErrors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(errors).filter(
          ([fieldName]) =>
            fieldName !== 'selectedStations' || selectedCount === 0,
        ),
      ),
    [errors, selectedCount],
  )

  useEffect(() => {
    if (!user?.id || initialDraft || loadedUserId.current === user.id) {
      return undefined
    }

    loadedUserId.current = user.id
    let isActive = true
    setSubmission({ kind: 'loading', message: 'Loading saved preferences…' })

    loadPreferences()
      .then((result) => {
        if (!isActive) {
          return
        }

        setHasSubscription(result.subscriptionStatus === 'active')

        if (result.preference) {
          setValues((currentValues) => ({
            ...currentValues,
            startTime: result.preference.startTime,
            endTime: result.preference.endTime,
            timeZone: result.preference.timeZone,
            weekdays: isoWeekdaysToValues(result.preference.isoWeekdays),
            consent: result.subscriptionStatus === 'active',
          }))
          onReplaceSelection(result.preference.stationIds)
        }

        setSubmission({ kind: 'idle', message: '' })
      })
      .catch((error) => {
        if (isActive) {
          setSubmission({ kind: 'error', message: error.message })
        }
      })

    return () => {
      isActive = false
    }
  }, [initialDraft, onReplaceSelection, user?.id])

  const updateValue = (fieldName, value) => {
    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }))
    setErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[fieldName]
      return nextErrors
    })
    setSubmission({ kind: 'idle', message: '' })
  }

  const toggleWeekday = (weekday) => {
    const nextWeekdays = values.weekdays.includes(weekday)
      ? values.weekdays.filter((selectedDay) => selectedDay !== weekday)
      : [...values.weekdays, weekday]
    updateValue('weekdays', nextWeekdays)
  }

  const handleClearSelection = () => {
    onClearSelection()
    setSubmission({ kind: 'idle', message: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateMonitoringValues(effectiveValues, selectedCount)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmission({ kind: 'idle', message: '' })
      return
    }

    if (!isConfigured) {
      setSubmission({
        kind: 'error',
        message:
          'Supabase is not configured. Your preferences were validated but not saved.',
      })
      return
    }

    if (authStatus === 'loading') {
      setSubmission({
        kind: 'error',
        message: 'The secure session is still loading. Try again shortly.',
      })
      return
    }

    if (!user) {
      savePendingPreferenceDraft(values, stationIds)
      setSubmission({ kind: 'sending-link', message: '' })

      try {
        await requestEmailLink(values.email, { shouldCreateUser: true })
        setSubmission({
          kind: 'link-sent',
          message:
            'Check your email for a secure verification link. Return in this browser to finish saving.',
        })
      } catch (error) {
        setSubmission({ kind: 'error', message: error.message })
      }
      return
    }

    setSubmission({ kind: 'saving', message: '' })

    try {
      await savePreferences({
        startTime: values.startTime,
        endTime: values.endTime,
        timeZone: values.timeZone,
        isoWeekdays: weekdayValuesToIso(values.weekdays),
        stationIds,
        consent: values.consent,
      })
      clearPendingPreferenceDraft()
      setHasSubscription(true)
      setSubmission({
        kind: 'saved',
        message: 'Your verified monitoring preferences were saved securely.',
      })
    } catch (error) {
      setSubmission({ kind: 'error', message: error.message })
    }
  }

  const handleManagementLink = async () => {
    const emailError = validateEmailAddress(values.email)

    if (emailError) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        email: emailError,
      }))
      return
    }

    if (!isConfigured) {
      setSubmission({
        kind: 'error',
        message:
          'Supabase must be configured before management links can be sent.',
      })
      return
    }

    setSubmission({ kind: 'sending-link', message: '' })

    try {
      await requestEmailLink(values.email, { shouldCreateUser: false })
    } catch {
      // Use the same response for unknown and known addresses to prevent account
      // enumeration through this public form.
    }

    setSubmission({
      kind: 'link-sent',
      message:
        'If a subscription exists for that address, a secure management link is on its way.',
    })
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      clearPendingPreferenceDraft()
      loadedUserId.current = null
      onReplaceSelection([])
      setValues(createInitialMonitoringValues())
      setHasSubscription(false)
      setSubmission({ kind: 'idle', message: '' })
    } catch (error) {
      setSubmission({ kind: 'error', message: error.message })
    }
  }

  const handleUnsubscribe = async () => {
    setSubmission({ kind: 'unsubscribing', message: '' })

    try {
      await unsubscribePreferences()
      clearPendingPreferenceDraft()
      onClearSelection()
      setValues(createInitialMonitoringValues())
      setHasSubscription(false)
      setConfirmingUnsubscribe(false)
      setSubmission({
        kind: 'unsubscribed',
        message:
          'Monitoring was unsubscribed and its preferences were removed.',
      })
    } catch (error) {
      setSubmission({ kind: 'error', message: error.message })
    }
  }

  const isSubmitting = [
    'loading',
    'sending-link',
    'saving',
    'unsubscribing',
  ].includes(submission.kind)

  return (
    <aside className="monitoring-card" aria-label="Monitoring setup">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Your alert</p>
          <h2>Monitoring setup</h2>
        </div>
        <div className="selection-actions">
          <span
            className="selection-count"
            aria-label={stationCountLabel}
            aria-live="polite"
          >
            {selectedCount}
          </span>
          <button
            className="clear-selection-button"
            type="button"
            disabled={selectedCount === 0}
            onClick={handleClearSelection}
          >
            Clear all
          </button>
        </div>
      </div>

      {selectedCount === 0 ? (
        <div className="selection-empty">
          <span className="empty-ring" aria-hidden="true" />
          <div>
            <strong>No stations selected</strong>
            <p>Select any station on the map to begin.</p>
          </div>
        </div>
      ) : (
        <div className="selection-summary">
          <p>Selected stations</p>
          <ul aria-label="Selected stations">
            {selectedStations.map((station) => (
              <li key={station.id}>
                <span aria-hidden="true">✓</span>
                {station.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="auth-status">
        {!isConfigured ? (
          <p>
            <strong>Backend setup required.</strong> Add the public Supabase
            environment variables to enable secure saving.
          </p>
        ) : null}
        {isConfigured && authStatus === 'loading' ? (
          <p>Checking secure session…</p>
        ) : null}
        {isConfigured && authStatus === 'error' ? (
          <p>A secure session could not be restored.</p>
        ) : null}
        {user ? (
          <div className="verified-session">
            <span aria-hidden="true">✓</span>
            <p>
              Verified as <strong>{user.email}</strong>
            </p>
            <button type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      <div className="panel-rule" />

      <form className="monitoring-form" noValidate onSubmit={handleSubmit}>
        {Object.keys(visibleErrors).length > 0 ? (
          <div className="form-error-summary" role="alert">
            <strong>Check the following:</strong>
            <ul>
              {Object.values(visibleErrors).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {visibleErrors.selectedStations ? (
          <p className="field-error station-error">
            {visibleErrors.selectedStations}
          </p>
        ) : null}

        <fieldset className="form-section schedule-section">
          <legend>Monitoring hours</legend>
          <div className="time-grid">
            <label htmlFor="start-time">
              <span>Start time</span>
              <select
                id="start-time"
                name="startTime"
                value={values.startTime}
                aria-describedby={
                  visibleErrors.startTime ? 'start-time-error' : undefined
                }
                aria-invalid={Boolean(visibleErrors.startTime)}
                onChange={(event) =>
                  updateValue('startTime', event.target.value)
                }
              >
                {timeOptions.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="end-time">
              <span>End time</span>
              <select
                id="end-time"
                name="endTime"
                value={values.endTime}
                aria-describedby={
                  visibleErrors.endTime ? 'end-time-error' : undefined
                }
                aria-invalid={Boolean(visibleErrors.endTime)}
                onChange={(event) => updateValue('endTime', event.target.value)}
              >
                {timeOptions.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {visibleErrors.startTime ? (
            <p className="field-error" id="start-time-error">
              {visibleErrors.startTime}
            </p>
          ) : null}
          {visibleErrors.endTime ? (
            <p className="field-error" id="end-time-error">
              {visibleErrors.endTime}
            </p>
          ) : null}
          {scheduleKind === 'overnight' ? (
            <p className="schedule-notice">
              <strong>Overnight schedule:</strong> each selected day begins at{' '}
              {values.startTime} and continues into the following day until{' '}
              {values.endTime}.
            </p>
          ) : null}
        </fieldset>

        <div className="form-field">
          <label htmlFor="time-zone">Time zone</label>
          <select
            id="time-zone"
            name="timeZone"
            value={values.timeZone}
            aria-describedby={`time-zone-help${
              visibleErrors.timeZone ? ' time-zone-error' : ''
            }`}
            aria-invalid={Boolean(visibleErrors.timeZone)}
            onChange={(event) => updateValue('timeZone', event.target.value)}
          >
            {timeZoneOptions.map((timeZone, index) => (
              <option key={timeZone} value={timeZone}>
                {timeZone}
                {index === 0 ? ' (detected)' : ''}
              </option>
            ))}
          </select>
          <p className="field-help" id="time-zone-help">
            Daylight-saving changes follow this IANA time zone automatically.
          </p>
          {visibleErrors.timeZone ? (
            <p className="field-error" id="time-zone-error">
              {visibleErrors.timeZone}
            </p>
          ) : null}
        </div>

        <fieldset
          className="form-section weekday-section"
          aria-describedby={`weekday-help${
            visibleErrors.weekdays ? ' weekday-error' : ''
          }`}
        >
          <legend>Monitoring days</legend>
          <div className="weekday-grid">
            {WEEKDAYS.map((weekday) => (
              <label key={weekday.value} title={weekday.label}>
                <input
                  type="checkbox"
                  aria-label={weekday.label}
                  checked={values.weekdays.includes(weekday.value)}
                  onChange={() => toggleWeekday(weekday.value)}
                />
                <span>{weekday.shortLabel}</span>
              </label>
            ))}
          </div>
          <p className="field-help" id="weekday-help">
            Days refer to when monitoring starts. Overnight windows finish the
            following day.
          </p>
          {visibleErrors.weekdays ? (
            <p className="field-error" id="weekday-error">
              {visibleErrors.weekdays}
            </p>
          ) : null}
        </fieldset>

        <div className="form-field">
          <label htmlFor="monitoring-email">Email address</label>
          <input
            id="monitoring-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            readOnly={Boolean(user)}
            value={verifiedEmail || values.email}
            aria-describedby={
              visibleErrors.email ? 'email-error' : 'email-help'
            }
            aria-invalid={Boolean(visibleErrors.email)}
            onChange={(event) => updateValue('email', event.target.value)}
          />
          <p className="field-help" id="email-help">
            {user
              ? 'This verified address owns and manages these preferences.'
              : 'We send a magic link before saving or showing preferences.'}
          </p>
          {visibleErrors.email ? (
            <p className="field-error" id="email-error">
              {visibleErrors.email}
            </p>
          ) : null}
        </div>

        <div className="consent-field">
          <label>
            <input
              type="checkbox"
              checked={values.consent}
              aria-describedby={
                visibleErrors.consent ? 'consent-error' : undefined
              }
              aria-invalid={Boolean(visibleErrors.consent)}
              onChange={(event) => updateValue('consent', event.target.checked)}
            />
            <span>
              I consent to receive TTC monitoring emails at this address.
            </span>
          </label>
          {visibleErrors.consent ? (
            <p className="field-error" id="consent-error">
              {visibleErrors.consent}
            </p>
          ) : null}
        </div>

        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting}
        >
          {submission.kind === 'sending-link'
            ? 'Sending verification link…'
            : submission.kind === 'saving'
              ? 'Saving securely…'
              : user
                ? 'Save verified preferences'
                : 'Verify email & continue'}
        </button>

        {!user ? (
          <button
            className="management-link-button"
            type="button"
            disabled={isSubmitting}
            onClick={handleManagementLink}
          >
            Manage an existing subscription
          </button>
        ) : null}

        {submission.message ? (
          <div
            className={
              submission.kind === 'error'
                ? 'submission-message is-error'
                : 'submission-message is-success'
            }
            role={submission.kind === 'error' ? 'alert' : 'status'}
          >
            {submission.message}
          </div>
        ) : null}

        {user && hasSubscription ? (
          <div className="unsubscribe-section">
            {!confirmingUnsubscribe ? (
              <button
                type="button"
                onClick={() => setConfirmingUnsubscribe(true)}
              >
                Unsubscribe and remove preferences
              </button>
            ) : (
              <div className="unsubscribe-confirmation">
                <strong>Remove this monitoring subscription?</strong>
                <p>
                  The saved schedule and station selections will be deleted.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setConfirmingUnsubscribe(false)}
                  >
                    Keep monitoring
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    disabled={submission.kind === 'unsubscribing'}
                    onClick={handleUnsubscribe}
                  >
                    Confirm unsubscribe
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <p className="panel-note">
          Passwords are not used. Saved preferences require access to the
          verification email.
        </p>
      </form>
    </aside>
  )
}
