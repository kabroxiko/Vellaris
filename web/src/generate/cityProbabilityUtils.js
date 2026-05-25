// Utilities for converting between server `cityProbability` and
// UI `cityFrequency` (percent) using optional `maxCityProbability`.

function normalizeMax(maxCityProbability) {
  const m = Number(maxCityProbability)
  if (Number.isFinite(m) && m > 1) return m / 100
  return m
}

export function computeCityFrequencyPercentFromProbability(cityProbability, maxCityProbability) {
  if (!Number.isFinite(Number(cityProbability))) return undefined
  const maxVal = normalizeMax(maxCityProbability)
  const prob = Number(cityProbability)
  const percent = Number.isFinite(maxVal) && maxVal !== 0 ? (prob / maxVal) * 100 : prob * 100
  return Math.round(percent)
}

export function computeCityProbabilityFromFrequency(freqPercent, maxCityProbability) {
  if (!Number.isFinite(Number(freqPercent))) return undefined
  const frac = Number(freqPercent) / 100
  const maxVal = normalizeMax(maxCityProbability)
  return Number.isFinite(maxVal) && maxVal !== 0 ? frac * maxVal : frac
}
