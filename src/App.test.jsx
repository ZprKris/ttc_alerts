import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { MAP_INTERACTION_OPTIONS } from './features/map/mapConfig.js'

describe('subway map', () => {
  it('renders the sample network and monitoring panel', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /pick your stations to receive alerts/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /interactive ttc subway map/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Finch')).toBeInTheDocument()
    expect(screen.getByText('Sheppard-Yonge')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeEnabled()
    expect(
      screen.getByRole('complementary', { name: /monitoring setup/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/0 stations selected/i)).toBeInTheDocument()
  })

  it('keeps map editing interactions disabled', () => {
    expect(MAP_INTERACTION_OPTIONS).toMatchObject({
      nodesDraggable: false,
      nodesConnectable: false,
      edgesReconnectable: false,
      elementsSelectable: false,
      deleteKeyCode: null,
      panOnDrag: true,
      zoomOnScroll: true,
      zoomOnPinch: true,
    })
  })

  it('selects and deselects an individual station', async () => {
    const user = userEvent.setup()
    render(<App />)
    const northgate = await screen.findByRole('button', {
      name: /finch station/i,
    })

    expect(northgate).toHaveAttribute('aria-pressed', 'false')

    await user.click(northgate)

    expect(northgate).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('1 station selected')).toHaveTextContent('1')
    expect(
      screen.queryByLabelText(/direction controls/i),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('list', { name: /selected stations/i }),
    ).toHaveTextContent('Finch')

    await user.click(northgate)

    expect(northgate).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('0 stations selected')).toHaveTextContent('0')
  })

  it('supports keyboard selection and clearing every station', async () => {
    const user = userEvent.setup()
    render(<App />)
    const northgate = await screen.findByRole('button', {
      name: /finch station/i,
    })
    const central = await screen.findByRole('button', {
      name: /sheppard-yonge station, interchange/i,
    })

    northgate.focus()
    await user.keyboard('{Enter}')

    expect(northgate).toHaveFocus()

    await user.click(central)

    expect(screen.getByLabelText('2 stations selected')).toHaveTextContent('2')

    await user.click(screen.getByRole('button', { name: /clear all/i }))

    expect(northgate).toHaveAttribute('aria-pressed', 'false')
    expect(central).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('0 stations selected')).toHaveTextContent('0')
    expect(screen.getByRole('button', { name: /clear all/i })).toBeDisabled()
  })

  it('uses arrow keys to select and focus the next ordered stations', async () => {
    const user = userEvent.setup()
    render(<App />)
    const northgate = await screen.findByRole('button', {
      name: /finch station/i,
    })

    await user.click(northgate)
    await user.keyboard('{ArrowDown}')

    const cedar = screen.getByRole('button', {
      name: /north york centre station/i,
    })
    expect(cedar).toHaveAttribute('aria-pressed', 'true')
    expect(cedar).toHaveFocus()

    await user.keyboard('{ArrowDown}')

    const central = screen.getByRole('button', {
      name: /sheppard-yonge station, interchange/i,
    })
    expect(central).toHaveAttribute('aria-pressed', 'true')
    expect(central).toHaveFocus()
    expect(screen.getByLabelText('3 stations selected')).toHaveTextContent('3')
  })

  it('does not move beyond a terminal station', async () => {
    const user = userEvent.setup()
    render(<App />)
    const northgate = await screen.findByRole('button', {
      name: /finch station/i,
    })

    await user.click(northgate)
    await user.keyboard('{ArrowUp}')

    expect(
      screen.getByText('No station in the up direction from Finch.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('1 station selected')).toHaveTextContent('1')
  })

  it('keeps the auxiliary route chooser out of the map interface', async () => {
    const user = userEvent.setup()
    render(<App />)
    const market = await screen.findByRole('button', {
      name: /st george station, interchange/i,
    })

    await user.click(market)
    await user.keyboard('{ArrowLeft}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('1 station selected')).toHaveTextContent('1')
    expect(
      screen.queryByLabelText(/direction controls/i),
    ).not.toBeInTheDocument()
  })

  it('shows understandable monitoring validation errors', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /verify email & continue/i }),
    )

    const errorSummary = screen.getByRole('alert')
    expect(errorSummary).toHaveTextContent(
      'Select at least one station to monitor.',
    )
    expect(errorSummary).toHaveTextContent('Enter a valid email address.')
    expect(errorSummary).toHaveTextContent(
      'Consent is required before monitoring emails can be sent.',
    )
  })

  it('does not claim to save when Supabase is unconfigured', async () => {
    const user = userEvent.setup()
    render(<App />)
    const northgate = await screen.findByRole('button', {
      name: /finch station/i,
    })

    await user.click(northgate)
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: '22:00' },
    })
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: '02:00' },
    })
    await user.type(
      screen.getByLabelText(/email address/i),
      'rider@example.com',
    )
    await user.click(
      screen.getByRole('checkbox', {
        name: /i consent to receive TTC monitoring emails/i,
      }),
    )

    expect(
      screen.getByText(/overnight schedule:/i).closest('.schedule-notice'),
    ).toHaveTextContent('continues into the following day until 02:00')

    await user.click(
      screen.getByRole('button', { name: /verify email & continue/i }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Supabase is not configured. Your preferences were validated but not saved.',
    )
  })
})
