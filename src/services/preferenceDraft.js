const draftStorageKey = 'ttc-alerts:pending-preference:v2'
const legacyDraftStorageKey = 'ttc-alerts:pending-preference:v1'
const draftLifetimeMs = 60 * 60 * 1000

function getLocalStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function removeDraft(storage) {
  try {
    storage?.removeItem(draftStorageKey)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function savePendingPreferenceDraft(values, stationIds) {
  const storage = getLocalStorage()

  if (!storage) {
    return
  }

  const draft = {
    startTime: values.startTime,
    endTime: values.endTime,
    timeZone: values.timeZone,
    weekdays: values.weekdays,
    stationIds,
    expiresAt: Date.now() + draftLifetimeMs,
  }

  try {
    storage.setItem(draftStorageKey, JSON.stringify(draft))
  } catch {
    // Draft persistence is a convenience and must not block authentication.
  }
}

export function readPendingPreferenceDraft() {
  const storage = getLocalStorage()

  if (!storage) {
    return null
  }

  try {
    const draft = JSON.parse(storage.getItem(draftStorageKey))

    if (
      !draft ||
      !Array.isArray(draft.weekdays) ||
      !Array.isArray(draft.stationIds) ||
      !Number.isFinite(draft.expiresAt) ||
      draft.expiresAt <= Date.now()
    ) {
      removeDraft(storage)
      return null
    }

    return draft
  } catch {
    removeDraft(storage)
    return null
  }
}

export function clearPendingPreferenceDraft() {
  removeDraft(getLocalStorage())

  try {
    window.sessionStorage.removeItem(legacyDraftStorageKey)
    window.sessionStorage.removeItem(draftStorageKey)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}
