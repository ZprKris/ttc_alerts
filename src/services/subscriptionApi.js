import { getAuthRedirectUrl, requireSupabaseClient } from './supabaseClient.js'

const rateLimitCodes = new Set([
  'over_email_send_rate_limit',
  'over_request_rate_limit',
])
const unavailableCodes = new Set([
  'email_address_not_authorized',
  'email_provider_disabled',
  'otp_disabled',
  'unexpected_failure',
])

function createEmailLinkError(error) {
  let message = 'The verification email could not be sent. Try again.'
  let isEmailDeliveryFailure = false

  if (error?.code === 'over_email_send_rate_limit') {
    message =
      'This email address requested a link recently. Wait 60 seconds, then try again.'
    isEmailDeliveryFailure = true
  } else if (error?.code === 'over_request_rate_limit') {
    message =
      'Too many sign-in attempts came from this network. Wait a few minutes, then try again.'
    isEmailDeliveryFailure = true
  } else if (error?.status === 429) {
    message =
      'Sign-in email capacity was temporarily reached. Try again in a few minutes.'
    isEmailDeliveryFailure = true
  } else if (
    Number(error?.status) >= 500 ||
    unavailableCodes.has(error?.code)
  ) {
    message =
      'The sign-in email service is temporarily unavailable. Try again in a few minutes.'
    isEmailDeliveryFailure = true
  }

  const requestError = new Error(message)
  requestError.isEmailDeliveryFailure = isEmailDeliveryFailure
  requestError.isRateLimited =
    error?.status === 429 || rateLimitCodes.has(error?.code)
  return requestError
}

export async function requestEmailLink(email, { shouldCreateUser }) {
  const client = requireSupabaseClient()
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser,
      emailRedirectTo: getAuthRedirectUrl(),
    },
  })

  if (error) {
    throw createEmailLinkError(error)
  }
}

async function invokePreferences(method, body) {
  const client = requireSupabaseClient()
  const { data, error } = await client.functions.invoke('preferences', {
    method,
    body,
  })

  if (error) {
    let message = 'The secure preference service is unavailable.'

    if (error.context) {
      try {
        const errorBody = await error.context.json()
        message = errorBody.error || message
      } catch {
        // The generic message intentionally avoids leaking response internals.
      }
    }

    throw new Error(message)
  }

  return data
}

export function loadPreferences() {
  return invokePreferences('GET')
}

export function savePreferences(preferences) {
  return invokePreferences('PUT', preferences)
}

export function deletePreference(preferenceId) {
  return invokePreferences('DELETE', { preferenceId })
}

export async function signOutSubscriptionSession() {
  const client = requireSupabaseClient()
  const { error } = await client.auth.signOut()

  if (error) {
    throw new Error('The secure session could not be signed out.')
  }
}
