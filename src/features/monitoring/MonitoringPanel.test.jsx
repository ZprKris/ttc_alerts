import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSubscriptionSession } from '../auth/useSubscriptionSession.js'
import {
  deletePreference,
  loadPreferences,
  requestEmailLink,
  savePreferences,
} from '../../services/subscriptionApi.js'
import MonitoringPanel from './MonitoringPanel.jsx'

vi.mock('../auth/useSubscriptionSession.js', () => ({
  useSubscriptionSession: vi.fn(),
}))

vi.mock('../../services/subscriptionApi.js', () => ({
  deletePreference: vi.fn(),
  loadPreferences: vi.fn(),
  requestEmailLink: vi.fn(),
  savePreferences: vi.fn(),
}))

const station = { id: 'northgate', name: 'Northgate' }

function createProps(overrides = {}) {
  return {
    initialDraft: null,
    allStations: [station],
    selectedStations: [station],
    selectedCount: 1,
    onClearSelection: vi.fn(),
    onReplaceSelection: vi.fn(),
    ...overrides,
  }
}

describe('secure monitoring preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    window.sessionStorage.clear()
    loadPreferences.mockResolvedValue({
      subscriptionStatus: 'none',
      preferences: [],
    })
    requestEmailLink.mockResolvedValue(undefined)
    savePreferences.mockResolvedValue({ preferenceId: 'preference-id' })
    deletePreference.mockResolvedValue({ deleted: true, remainingCount: 0 })
    useSubscriptionSession.mockReturnValue({
      status: 'ready',
      isConfigured: true,
      user: null,
      signOut: vi.fn(),
    })
  })

  it('chooses monitoring times from half-hour select lists', async () => {
    const user = userEvent.setup()
    render(<MonitoringPanel {...createProps()} />)

    const startTime = screen.getByRole('combobox', { name: /start time/i })
    const endTime = screen.getByRole('combobox', { name: /end time/i })

    expect(startTime).toHaveValue('07:00')
    expect(endTime).toHaveValue('09:00')
    expect(startTime).toHaveTextContent('7:30 AM')
    expect(screen.queryByLabelText(/time zone/i)).not.toBeInTheDocument()

    await user.selectOptions(startTime, '07:30')
    await user.selectOptions(endTime, '10:00')

    expect(startTime).toHaveValue('07:30')
    expect(endTime).toHaveValue('10:00')
  })

  it('sends a verification link and stores no email or consent locally', async () => {
    const user = userEvent.setup()
    render(<MonitoringPanel {...createProps()} />)

    await user.type(
      screen.getByRole('textbox', { name: /email address/i }),
      'rider@example.com',
    )
    await user.click(
      screen.getByRole('checkbox', {
        name: /i consent to receive TTC monitoring emails/i,
      }),
    )
    await user.click(
      screen.getByRole('button', { name: /verify email & continue/i }),
    )

    await waitFor(() =>
      expect(requestEmailLink).toHaveBeenCalledWith('rider@example.com', {
        shouldCreateUser: true,
      }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Check your email for a secure verification link.',
    )
    const draft = window.localStorage.getItem(
      'ttc-alerts:pending-preference:v2',
    )
    expect(draft).not.toContain('rider@example.com')
    expect(draft).not.toContain('consent')
  })

  it('saves through the authenticated preference service', async () => {
    const user = userEvent.setup()
    const props = createProps()
    useSubscriptionSession.mockReturnValue({
      status: 'ready',
      isConfigured: true,
      user: { id: 'user-id', email: 'verified@example.com' },
      signOut: vi.fn(),
    })
    render(<MonitoringPanel {...props} />)

    await waitFor(() => expect(loadPreferences).toHaveBeenCalledOnce())
    await user.click(
      screen.getByRole('checkbox', {
        name: /i consent to receive TTC monitoring emails/i,
      }),
    )
    await user.click(
      screen.getByRole('button', { name: /save verified preferences/i }),
    )

    await waitFor(() =>
      expect(savePreferences).toHaveBeenCalledWith({
        startTime: '07:00',
        endTime: '09:00',
        timeZone: 'America/Toronto',
        isoWeekdays: [1, 2, 3, 4, 5],
        stationIds: ['northgate'],
        consent: true,
      }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'new verified alert was saved securely',
    )
    expect(props.onClearSelection).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('tab', { name: /set up/i }))
    expect(
      screen.getByRole('textbox', { name: /email address/i }),
    ).toHaveAttribute('readonly')
  })

  it('does not reveal whether an address has an existing subscription', async () => {
    const user = userEvent.setup()
    requestEmailLink.mockRejectedValue(new Error('No such user'))
    render(<MonitoringPanel {...createProps()} />)

    await user.type(
      screen.getByRole('textbox', { name: /email address/i }),
      'unknown@example.com',
    )
    await user.click(
      screen.getByRole('button', {
        name: /sign in to existing alerts/i,
      }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'If a subscription exists for that address',
    )
    expect(screen.queryByText('No such user')).not.toBeInTheDocument()
    expect(requestEmailLink).toHaveBeenCalledWith('unknown@example.com', {
      shouldCreateUser: false,
    })
    expect(
      JSON.parse(
        window.localStorage.getItem('ttc-alerts:pending-preference:v2'),
      ).stationIds,
    ).toEqual(['northgate'])
  })

  it('shows an actionable error when Supabase rate-limits sign-in email', async () => {
    const user = userEvent.setup()
    const deliveryError = new Error(
      'This email address requested a link recently. Wait 60 seconds, then try again.',
    )
    deliveryError.isEmailDeliveryFailure = true
    requestEmailLink.mockRejectedValue(deliveryError)
    render(<MonitoringPanel {...createProps()} />)

    await user.type(
      screen.getByRole('textbox', { name: /email address/i }),
      'rider@example.com',
    )
    await user.click(
      screen.getByRole('button', { name: /sign in to existing alerts/i }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Wait 60 seconds',
    )
  })

  it('prevents duplicate sign-in email requests during the cooldown', async () => {
    const user = userEvent.setup()
    render(<MonitoringPanel {...createProps()} />)

    await user.type(
      screen.getByRole('textbox', { name: /email address/i }),
      'rider@example.com',
    )
    await user.click(
      screen.getByRole('button', { name: /sign in to existing alerts/i }),
    )

    expect(
      screen.getByRole('button', {
        name: /sign-in email available in 60s/i,
      }),
    ).toBeDisabled()
    expect(requestEmailLink).toHaveBeenCalledOnce()
  })

  it('keeps the compact sign-in action without the existing-user prompt', () => {
    render(<MonitoringPanel {...createProps()} />)

    expect(screen.queryByText('Already have alerts?')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /sign in to existing alerts/i }),
    ).toBeInTheDocument()
  })

  it('shows the saved subscription tab only to authenticated users', async () => {
    const { rerender } = render(<MonitoringPanel {...createProps()} />)

    expect(
      screen.queryByRole('tab', { name: /my alerts/i }),
    ).not.toBeInTheDocument()

    useSubscriptionSession.mockReturnValue({
      status: 'ready',
      isConfigured: true,
      user: { id: 'user-id', email: 'verified@example.com' },
      signOut: vi.fn(),
    })
    loadPreferences.mockResolvedValue({
      subscriptionStatus: 'active',
      preferences: [
        {
          id: 'preference-1',
          startTime: '07:30',
          endTime: '10:00',
          timeZone: 'America/Toronto',
          isoWeekdays: [1, 3, 5],
          stationIds: ['northgate'],
        },
      ],
    })
    rerender(<MonitoringPanel {...createProps()} />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /my alerts/i }))
    await user.click(screen.getByRole('button', { name: /^alert 1/i }))

    expect(
      screen.getByRole('heading', { name: /subscribed alerts/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('7:30 AM–10:00 AM')).toBeInTheDocument()
    expect(screen.getByText('Mon, Wed, Fri')).toBeInTheDocument()
    expect(
      screen.getByRole('list', { name: /alert 1 stations/i }),
    ).toHaveTextContent('Northgate')
  })

  it('expands and deletes one numbered alert without removing the others', async () => {
    const user = userEvent.setup()
    const props = createProps()
    useSubscriptionSession.mockReturnValue({
      status: 'ready',
      isConfigured: true,
      user: { id: 'user-id', email: 'verified@example.com' },
      signOut: vi.fn(),
    })
    loadPreferences.mockResolvedValue({
      subscriptionStatus: 'active',
      preferences: [
        {
          id: 'preference-1',
          startTime: '07:30',
          endTime: '10:00',
          timeZone: 'America/Toronto',
          isoWeekdays: [1, 3, 5],
          stationIds: ['northgate'],
        },
        {
          id: 'preference-2',
          startTime: '12:00',
          endTime: '13:00',
          timeZone: 'America/Toronto',
          isoWeekdays: [2],
          stationIds: ['northgate'],
        },
      ],
    })
    render(<MonitoringPanel {...props} />)

    await user.click(await screen.findByRole('tab', { name: /my alerts/i }))
    expect(screen.getByRole('button', { name: /^alert 1/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    await user.click(screen.getByRole('button', { name: /^alert 1/i }))
    expect(screen.getByText('7:30 AM–10:00 AM')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: /open delete confirmation for alert 1/i,
      }),
    )
    expect(deletePreference).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: /^confirm delete alert 1$/i }),
    )

    await waitFor(() =>
      expect(deletePreference).toHaveBeenCalledWith('preference-1'),
    )
    expect(
      screen.queryByRole('button', { name: /^alert 2/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^alert 1/i }),
    ).toBeInTheDocument()
    expect(props.onClearSelection).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'selected alert subscription was removed',
    )
  })
})
