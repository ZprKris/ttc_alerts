import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSubscriptionSession } from '../auth/useSubscriptionSession.js'
import {
  loadPreferences,
  requestEmailLink,
  savePreferences,
  unsubscribePreferences,
} from '../../services/subscriptionApi.js'
import MonitoringPanel from './MonitoringPanel.jsx'

vi.mock('../auth/useSubscriptionSession.js', () => ({
  useSubscriptionSession: vi.fn(),
}))

vi.mock('../../services/subscriptionApi.js', () => ({
  loadPreferences: vi.fn(),
  requestEmailLink: vi.fn(),
  savePreferences: vi.fn(),
  unsubscribePreferences: vi.fn(),
}))

const station = { id: 'northgate', name: 'Northgate' }

function createProps(overrides = {}) {
  return {
    initialDraft: null,
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
    window.sessionStorage.clear()
    loadPreferences.mockResolvedValue({
      subscriptionStatus: 'none',
      preference: null,
    })
    requestEmailLink.mockResolvedValue(undefined)
    savePreferences.mockResolvedValue({ preferenceId: 'preference-id' })
    unsubscribePreferences.mockResolvedValue({ unsubscribed: true })
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
    const draft = window.sessionStorage.getItem(
      'ttc-alerts:pending-preference:v1',
    )
    expect(draft).not.toContain('rider@example.com')
    expect(draft).not.toContain('consent')
  })

  it('saves through the authenticated preference service', async () => {
    const user = userEvent.setup()
    useSubscriptionSession.mockReturnValue({
      status: 'ready',
      isConfigured: true,
      user: { id: 'user-id', email: 'verified@example.com' },
      signOut: vi.fn(),
    })
    render(<MonitoringPanel {...createProps()} />)

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
        timeZone: expect.any(String),
        isoWeekdays: [1, 2, 3, 4, 5],
        stationIds: ['northgate'],
        consent: true,
      }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'verified monitoring preferences were saved securely',
    )
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
        name: /manage an existing subscription/i,
      }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'If a subscription exists for that address',
    )
    expect(screen.queryByText('No such user')).not.toBeInTheDocument()
    expect(requestEmailLink).toHaveBeenCalledWith('unknown@example.com', {
      shouldCreateUser: false,
    })
  })

  it('requires confirmation before deleting saved preferences', async () => {
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
      preference: {
        startTime: '07:30',
        endTime: '10:00',
        timeZone: 'America/Toronto',
        isoWeekdays: [1, 3, 5],
        stationIds: ['northgate'],
      },
    })
    render(<MonitoringPanel {...props} />)

    await user.click(
      await screen.findByRole('button', {
        name: /unsubscribe and remove preferences/i,
      }),
    )
    expect(unsubscribePreferences).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: /confirm unsubscribe/i }),
    )

    await waitFor(() => expect(unsubscribePreferences).toHaveBeenCalledOnce())
    expect(props.onClearSelection).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent(
      'preferences were removed',
    )
  })
})
