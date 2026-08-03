import { getAuthRedirectUrl, requireSupabaseClient } from './supabaseClient.js'

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
    throw new Error('The verification email could not be sent. Try again.')
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
