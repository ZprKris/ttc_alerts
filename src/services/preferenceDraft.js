const draftStorageKey = 'ttc-alerts:pending-preference:v1'

function getSessionStorage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function savePendingPreferenceDraft(values, stationIds) {
  const storage = getSessionStorage()

  if (!storage) {
    return
  }

  const draft = {
    startTime: values.startTime,
    endTime: values.endTime,
    timeZone: values.timeZone,
    weekdays: values.weekdays,
    stationIds,
  }

  storage.setItem(draftStorageKey, JSON.stringify(draft))
}

export function readPendingPreferenceDraft() {
  const storage = getSessionStorage()

  if (!storage) {
    return null
  }

  try {
    const draft = JSON.parse(storage.getItem(draftStorageKey))

    if (
      !draft ||
      !Array.isArray(draft.weekdays) ||
      !Array.isArray(draft.stationIds)
    ) {
      return null
    }

    return draft
  } catch {
    storage.removeItem(draftStorageKey)
    return null
  }
}

export function clearPendingPreferenceDraft() {
  getSessionStorage()?.removeItem(draftStorageKey)
}
