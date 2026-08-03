import { useEffect, useMemo, useRef, useState } from 'react'
import { useSubscriptionSession } from '../auth/useSubscriptionSession.js'
import {
  clearPendingPreferenceDraft,
  savePendingPreferenceDraft,
} from '../../services/preferenceDraft.js'
import {
  deletePreference,
  loadPreferences,
  requestEmailLink,
  savePreferences,
} from '../../services/subscriptionApi.js'
import {
  WEEKDAYS,
  createInitialMonitoringValues,
  getScheduleKind,
  validateEmailAddress,
  validateMonitoringValues,
  weekdayValuesToIso,
} from './monitoringForm.js'
import './monitoringPanel.css'

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
    weekdays: initialDraft.weekdays?.length
      ? initialDraft.weekdays
      : initialValues.weekdays,
    email: '',
    consent: false,
  }
}

function timeLabel(value) {
  return timeOptions.find((option) => option.value === value)?.label ?? value
}

function weekdayLabels(isoWeekdays = []) {
  return isoWeekdays
    .map((isoWeekday) => WEEKDAYS[isoWeekday - 1]?.shortLabel)
    .filter(Boolean)
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7m4-7v7" />
    </svg>
  )
}

export default function MonitoringPanel({
  initialDraft,
  allStations = [],
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
  const [savedPreferences, setSavedPreferences] = useState([])
  const [activeTab, setActiveTab] = useState('setup')
  const [expandedPreferenceId, setExpandedPreferenceId] = useState(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
  const loadedUserId = useRef(null)
  const emailInputRef = useRef(null)
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
    if (!user?.id || loadedUserId.current === user.id) {
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

        setSavedPreferences(result.preferences ?? [])

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
  }, [user?.id])

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

  const handleTabKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      return
    }

    event.preventDefault()
    const nextTab = activeTab === 'setup' ? 'alerts' : 'setup'
    setActiveTab(nextTab)
    requestAnimationFrame(() => {
      document.getElementById(`monitoring-${nextTab}-tab`)?.focus()
    })
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
            'Check your email for a secure verification link. Open it in this browser to restore your selected stations and finish saving.',
        })
      } catch (error) {
        setSubmission({ kind: 'error', message: error.message })
      }
      return
    }

    setSubmission({ kind: 'saving', message: '' })

    try {
      const result = await savePreferences({
        startTime: values.startTime,
        endTime: values.endTime,
        timeZone: values.timeZone,
        isoWeekdays: weekdayValuesToIso(values.weekdays),
        stationIds,
        consent: values.consent,
      })
      clearPendingPreferenceDraft()
      const savedPreference = {
        id: result.preferenceId,
        startTime: values.startTime,
        endTime: values.endTime,
        timeZone: values.timeZone,
        isoWeekdays: weekdayValuesToIso(values.weekdays),
        stationIds,
      }
      setSavedPreferences((currentPreferences) => [
        ...currentPreferences,
        savedPreference,
      ])
      onClearSelection()
      setExpandedPreferenceId(result.preferenceId)
      setActiveTab('alerts')
      setSubmission({
        kind: 'saved',
        message: 'Your new verified alert was saved securely.',
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
    savePendingPreferenceDraft(values, stationIds)

    try {
      await requestEmailLink(values.email, { shouldCreateUser: false })
    } catch {
      // Use the same response for unknown and known addresses to prevent account
      // enumeration through this public form.
    }

    setSubmission({
      kind: 'link-sent',
      message:
        'If a subscription exists for that address, a secure sign-in link is on its way. Your selected stations will be restored when it opens in this browser.',
    })
  }

  const handleStartSignIn = () => {
    setSubmission({ kind: 'idle', message: '' })
    emailInputRef.current?.focus()
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      clearPendingPreferenceDraft()
      loadedUserId.current = null
      onReplaceSelection([])
      setValues(createInitialMonitoringValues())
      setSavedPreferences([])
      setActiveTab('setup')
      setSubmission({ kind: 'idle', message: '' })
    } catch (error) {
      setSubmission({ kind: 'error', message: error.message })
    }
  }

  const handleDeletePreference = async (preferenceId) => {
    setSubmission({ kind: 'deleting', message: '' })

    try {
      await deletePreference(preferenceId)
      setSavedPreferences((currentPreferences) =>
        currentPreferences.filter(
          (preference) => preference.id !== preferenceId,
        ),
      )
      setConfirmingDeleteId(null)
      setExpandedPreferenceId((currentId) =>
        currentId === preferenceId ? null : currentId,
      )
      setSubmission({
        kind: 'deleted',
        message: 'The selected alert subscription was removed.',
      })
    } catch (error) {
      setSubmission({ kind: 'error', message: error.message })
    }
  }

  const isSubmitting = [
    'loading',
    'sending-link',
    'saving',
    'deleting',
  ].includes(submission.kind)
  const showSetup = !user || activeTab === 'setup'

  return (
    <aside className="monitoring-card" aria-label="Monitoring setup">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Your alert</p>
          <h2>Monitoring setup</h2>
        </div>
        {showSetup ? (
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
        ) : null}
      </div>

      {showSetup && selectedCount === 0 ? (
        <div className="selection-empty">
          <span className="empty-ring" aria-hidden="true" />
          <div>
            <strong>No stations selected</strong>
            <p>Select any station on the map to begin.</p>
          </div>
        </div>
      ) : showSetup ? (
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
      ) : null}

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
        {isConfigured && authStatus === 'ready' && !user ? (
          <div className="existing-user-prompt">
            <div>
              <strong>Already have alerts?</strong>
              <p>
                Sign in with your email to view, add, or delete subscriptions.
                No password is needed.
              </p>
            </div>
            <button type="button" onClick={handleStartSignIn}>
              Sign in
            </button>
          </div>
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

      {user ? (
        <div
          className="monitoring-tabs"
          role="tablist"
          aria-label="Monitoring views"
        >
          <button
            id="monitoring-setup-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === 'setup'}
            aria-controls="monitoring-setup-panel"
            tabIndex={activeTab === 'setup' ? 0 : -1}
            onKeyDown={handleTabKeyDown}
            onClick={() => setActiveTab('setup')}
          >
            Set up
          </button>
          <button
            id="monitoring-alerts-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === 'alerts'}
            aria-controls="monitoring-alerts-panel"
            tabIndex={activeTab === 'alerts' ? 0 : -1}
            onKeyDown={handleTabKeyDown}
            onClick={() => setActiveTab('alerts')}
          >
            My alerts
            {savedPreferences.length > 0 ? (
              <span
                aria-label={`${savedPreferences.length} active subscriptions`}
              >
                {savedPreferences.length}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {user && activeTab === 'alerts' ? (
        <section
          id="monitoring-alerts-panel"
          className="subscriptions-panel"
          role="tabpanel"
          aria-labelledby="monitoring-alerts-tab"
        >
          <header className="subscriptions-heading">
            <h3>Subscribed alerts</h3>
            <p>Expand an alert to review its stations and schedule.</p>
          </header>

          {savedPreferences.length > 0 ? (
            <div className="subscription-list">
              {savedPreferences.map((preference, index) => {
                const alertNumber = index + 1
                const isExpanded = expandedPreferenceId === preference.id
                const savedStations = (preference.stationIds ?? []).map(
                  (stationId) =>
                    allStations.find((station) => station.id === stationId) ?? {
                      id: stationId,
                      name: stationId,
                    },
                )
                const savedWeekdays = weekdayLabels(preference.isoWeekdays)

                return (
                  <article className="subscription-card" key={preference.id}>
                    <div className="subscription-row">
                      <button
                        className="subscription-expand-button"
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`alert-details-${preference.id}`}
                        onClick={() =>
                          setExpandedPreferenceId(
                            isExpanded ? null : preference.id,
                          )
                        }
                      >
                        <span className="alert-number">
                          Alert {alertNumber}
                        </span>
                        <span className="alert-row-summary">
                          {savedStations.length} station
                          {savedStations.length === 1 ? '' : 's'}
                        </span>
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="m6 8 4 4 4-4" />
                        </svg>
                      </button>
                      <button
                        className="trash-subscription-button"
                        type="button"
                        title={`Delete Alert ${alertNumber}`}
                        aria-label={`Open delete confirmation for Alert ${alertNumber}`}
                        onClick={() => setConfirmingDeleteId(preference.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    {isExpanded ? (
                      <div
                        id={`alert-details-${preference.id}`}
                        className="subscription-card-details"
                      >
                        <span className="subscription-status">Active</span>
                        <dl className="subscription-details">
                          <div>
                            <dt>Hours</dt>
                            <dd>
                              {timeLabel(preference.startTime)}–
                              {timeLabel(preference.endTime)}
                            </dd>
                          </div>
                          <div>
                            <dt>Days</dt>
                            <dd>{savedWeekdays.join(', ')}</dd>
                          </div>
                        </dl>

                        <div className="subscription-stations">
                          <p>Stations ({savedStations.length})</p>
                          <ul aria-label={`Alert ${alertNumber} stations`}>
                            {savedStations.map((station) => (
                              <li key={station.id}>{station.name}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null}

                    {confirmingDeleteId === preference.id ? (
                      <div className="unsubscribe-confirmation">
                        <strong>Delete Alert {alertNumber}?</strong>
                        <p>
                          Its schedule and station selections will be removed.
                        </p>
                        <div>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="danger-button"
                            type="button"
                            disabled={submission.kind === 'deleting'}
                            onClick={() =>
                              handleDeletePreference(preference.id)
                            }
                          >
                            {submission.kind === 'deleting'
                              ? 'Deleting…'
                              : `Confirm delete Alert ${alertNumber}`}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="subscriptions-empty">
              <span className="empty-ring" aria-hidden="true" />
              <strong>No active alerts</strong>
              <p>Save a station schedule to see it here.</p>
              <button type="button" onClick={() => setActiveTab('setup')}>
                Set up monitoring
              </button>
            </div>
          )}

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
        </section>
      ) : null}

      <form
        id="monitoring-setup-panel"
        className="monitoring-form"
        role={user ? 'tabpanel' : undefined}
        aria-labelledby={user ? 'monitoring-setup-tab' : undefined}
        hidden={!showSetup}
        noValidate
        onSubmit={handleSubmit}
      >
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
            ref={emailInputRef}
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

        {!user ? (
          <button
            className="management-link-button"
            type="button"
            disabled={isSubmitting}
            onClick={handleManagementLink}
          >
            Sign in to existing alerts
          </button>
        ) : null}

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

        <p className="panel-note">
          Passwords are not used. Saved preferences require access to the
          verification email.
        </p>
      </form>
    </aside>
  )
}
