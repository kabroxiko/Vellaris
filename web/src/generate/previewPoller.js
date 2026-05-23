import { buildPreviewPayload, fetchPreviewBlob } from './CustomizePreviewHelpers'

// Schedule a preview fetch with a small debounce and return a cleanup function.
export function schedulePreviewFetch({
  previewFields,
  textures,
  currentSource,
  setPreviewFromBlob,
  delay = 100,
}) {
  const controller = new AbortController()
  const timerId = setTimeout(async () => {
    if (controller.signal.aborted) return
    const payload = buildPreviewPayload(previewFields, textures, currentSource)
    const blob = await fetchPreviewBlob(payload, controller)
    await setPreviewFromBlob(blob)
  }, delay)

  return () => {
    clearTimeout(timerId)
    controller.abort()
  }
}

export default schedulePreviewFetch
