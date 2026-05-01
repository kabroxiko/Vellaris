// Legacy compatibility helpers trimmed: server no longer supports the
// merged-settings return flag. Keep only functions needed for nortContent
// sanitization and form-building.

function appendOptionalField(form, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    form.append(key, String(value))
  }
}

function buildFormDataFromParsedJson(parsed) {
  const form = new FormData()
  const nortBlob = new Blob([parsed.nortContent], { type: 'text/plain' })
  form.append('nortFile', nortBlob, 'generated-settings.nort')
  appendOptionalField(form, 'width', parsed.width)
  appendOptionalField(form, 'height', parsed.height)
  appendOptionalField(form, 'randomSeed', parsed.randomSeed)
  if (parsed.saveNort) form.append('saveNort', 'true')
  return form
}

function buildFormDataFromFormData(original) {
  const form = new FormData()
  const allowedKeys = new Set(['nortFile', 'width', 'height', 'randomSeed', 'saveNort'])
  for (const [key, value] of original.entries()) {
    if (allowedKeys.has(key)) {
      form.append(key, value)
    }
  }
  return form
}

// Compatibility helpers removed per policy: fail-fast on invalid requests.
