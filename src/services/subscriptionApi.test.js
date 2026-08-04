import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthRedirectUrl, requireSupabaseClient } from './supabaseClient.js'
import { requestEmailLink } from './subscriptionApi.js'

vi.mock('./supabaseClient.js', () => ({
  getAuthRedirectUrl: vi.fn(() => 'https://example.com/?auth=callback'),
  requireSupabaseClient: vi.fn(),
}))

describe('subscription email links', () => {
  const signInWithOtp = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    requireSupabaseClient.mockReturnValue({ auth: { signInWithOtp } })
  })

  it('requests an existing-user magic link without creating an account', async () => {
    signInWithOtp.mockResolvedValue({ error: null })

    await requestEmailLink(' rider@example.com ', { shouldCreateUser: false })

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'rider@example.com',
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://example.com/?auth=callback',
      },
    })
    expect(getAuthRedirectUrl).toHaveBeenCalledOnce()
  })

  it('reports email rate limits as an actionable delivery failure', async () => {
    signInWithOtp.mockResolvedValue({
      error: { status: 429, code: 'over_email_send_rate_limit' },
    })

    await expect(
      requestEmailLink('rider@example.com', { shouldCreateUser: false }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/wait at least 60 seconds/i),
      isEmailDeliveryFailure: true,
      isRateLimited: true,
    })
  })

  it('keeps account-specific failures private', async () => {
    signInWithOtp.mockResolvedValue({
      error: { status: 400, code: 'user_not_found' },
    })

    await expect(
      requestEmailLink('unknown@example.com', { shouldCreateUser: false }),
    ).rejects.toMatchObject({ isEmailDeliveryFailure: false })
  })
})
