import { useCallback, useEffect, useState } from 'react'
import { signOutSubscriptionSession } from '../../services/subscriptionApi.js'
import {
  isSupabaseConfigured,
  supabaseClient,
} from '../../services/supabaseClient.js'

function clearAuthCallbackParameters() {
  const url = new URL(window.location.href)
  const authParameters = [
    'auth',
    'code',
    'error',
    'error_code',
    'error_description',
  ]
  const hasAuthParameters = authParameters.some((parameter) =>
    url.searchParams.has(parameter),
  )

  if (!hasAuthParameters) {
    return
  }

  authParameters.forEach((parameter) => url.searchParams.delete(parameter))
  window.history.replaceState({}, document.title, url.toString())
}

export function useSubscriptionSession() {
  const [sessionState, setSessionState] = useState(() => ({
    status: isSupabaseConfigured ? 'loading' : 'unconfigured',
    session: null,
  }))

  useEffect(() => {
    if (!supabaseClient) {
      return undefined
    }

    let isActive = true

    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!isActive) {
        return
      }

      setSessionState({
        status: error ? 'error' : 'ready',
        session: error ? null : data.session,
      })

      if (data.session) {
        clearAuthCallbackParameters()
      }
    })

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!isActive) {
        return
      }

      setSessionState({ status: 'ready', session })

      if (session) {
        clearAuthCallbackParameters()
      }
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await signOutSubscriptionSession()
  }, [])

  return {
    ...sessionState,
    isConfigured: isSupabaseConfigured,
    user: sessionState.session?.user ?? null,
    signOut,
  }
}
