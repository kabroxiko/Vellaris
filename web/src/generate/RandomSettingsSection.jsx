import React from 'react'
import PropTypes from 'prop-types'
import { DIMENSIONS } from './constants'

export default function RandomSettingsSection({ values, handlers, options, ui }) {
  const {
    dimension,
    worldSize,
    landShape,
    regionCount,
    landColoringMethod,
    artPack,
    cityIconType,
    cityFrequency,
    selectedBooks,
    randomSeed,
    fileName,
  } = values

  const {
    setDimension,
    setWorldSize,
    setLandShape,
    setRegionCount,
    setLandColoringMethod,
    setArtPack,
    setCityIconType,
    setCityFrequency,
    setSelectedBooks,
    setRandomSeed,
    handleRandomMap,
    handleFileInput,
    onDrop,
  } = handlers

  const { artPacks, cityIconTypes, allBooks } = options
  const { loading, dropRef } = ui

  return (
    <section className="generator-section">
      <h3>Create or Load Settings</h3>
      <p className="section-hint">Start from random settings, or load a settings file.</p>
      <form className="section-fields" onSubmit={handleRandomMap}>
        <div className="fields-grid two-col-layout">
          <div className="fields-column">
            <label htmlFor="dimension-input">Aspect ratio</label>
            <select
              id="dimension-input"
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
            >
              {DIMENSIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <label htmlFor="world-size-input">World size: {worldSize.toLocaleString()}</label>
            <input
              id="world-size-input"
              type="range"
              min={2000}
              max={32000}
              step={1000}
              value={worldSize}
              onChange={(e) => setWorldSize(Number(e.target.value))}
            />

            <label htmlFor="land-shape-input">Land shape</label>
            <select
              id="land-shape-input"
              value={landShape}
              onChange={(e) => setLandShape(e.target.value)}
            >
              <option value="">Random</option>
              <option value="Continents">Continents</option>
              <option value="Inland_Sea">Inland sea</option>
              <option value="Scattered">Scattered</option>
            </select>

            <label htmlFor="region-count-input">Number of regions: {regionCount}</label>
            <input
              id="region-count-input"
              type="range"
              min={2}
              max={20}
              step={1}
              value={regionCount}
              onChange={(e) => setRegionCount(Number(e.target.value))}
            />

            <label htmlFor="land-coloring-input">Land coloring method</label>
            <select
              id="land-coloring-input"
              value={landColoringMethod}
              onChange={(e) => setLandColoringMethod(e.target.value)}
            >
              <option value="">Random</option>
              <option value="SingleColor">Single color</option>
              <option value="ColorPoliticalRegions">Color political regions</option>
            </select>

            {artPacks.length > 0 && (
              <>
                <label htmlFor="art-pack-input">Art pack</label>
                <select
                  id="art-pack-input"
                  value={artPack}
                  onChange={(e) => setArtPack(e.target.value)}
                >
                  <option value="">Random</option>
                  {artPacks.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </>
            )}

            {cityIconTypes.length > 0 && (
              <>
                <label htmlFor="city-icon-type-input">City icon type</label>
                <select
                  id="city-icon-type-input"
                  value={cityIconType}
                  onChange={(e) => setCityIconType(e.target.value)}
                >
                  <option value="">Random</option>
                  {cityIconTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label htmlFor="city-frequency-input">City frequency: {cityFrequency}%</label>
            <input
              id="city-frequency-input"
              type="range"
              min={0}
              max={100}
              step={1}
              value={cityFrequency}
              onChange={(e) => setCityFrequency(Number(e.target.value))}
            />
          </div>

          <div className="fields-column">
            {allBooks.length > 0 && (
              <fieldset className="books-widget">
                <legend>Books for generating text</legend>
                <div className="books-actions">
                  <button type="button" onClick={() => setSelectedBooks(new Set(allBooks))}>
                    Check all
                  </button>
                  <button type="button" onClick={() => setSelectedBooks(new Set())}>
                    Uncheck all
                  </button>
                </div>
                <div className="books-list">
                  {allBooks.map((book) => (
                    <label key={book} className="book-item">
                      <input
                        type="checkbox"
                        checked={selectedBooks.has(book)}
                        onChange={(e) => {
                          const next = new Set(selectedBooks)
                          if (e.target.checked) next.add(book)
                          else next.delete(book)
                          setSelectedBooks(next)
                        }}
                      />
                      {book}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <label htmlFor="random-seed-input">Seed (optional)</label>
            <input
              id="random-seed-input"
              type="text"
              value={randomSeed}
              onChange={(e) => setRandomSeed(e.target.value)}
              placeholder="e.g. 12345"
            />
          </div>
        </div>

        <div className="section-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Generating…' : 'Generate Random Map'}
          </button>
        </div>

        <div className="section-divider">
          <span>or</span>
        </div>

        <div className="upload-group">
          <input
            id="nort-file-input"
            type="file"
            accept=".json,.txt,.nort,text/plain,application/json"
            onChange={handleFileInput}
          />
          <button
            ref={dropRef}
            type="button"
            className="dropzone"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('nort-file-input')?.click()}
            aria-label="Upload or drop settings file"
          >
            {fileName ? (
              <span>Loaded: {fileName}</span>
            ) : (
              <span>Drag and drop a settings file here</span>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}

RandomSettingsSection.propTypes = {
  values: PropTypes.shape({
    dimension: PropTypes.string.isRequired,
    worldSize: PropTypes.number.isRequired,
    landShape: PropTypes.string.isRequired,
    regionCount: PropTypes.number.isRequired,
    landColoringMethod: PropTypes.string.isRequired,
    artPack: PropTypes.string.isRequired,
    cityIconType: PropTypes.string.isRequired,
    cityFrequency: PropTypes.number.isRequired,
    selectedBooks: PropTypes.instanceOf(Set).isRequired,
    randomSeed: PropTypes.string.isRequired,
    fileName: PropTypes.string.isRequired,
  }).isRequired,
  handlers: PropTypes.shape({
    setDimension: PropTypes.func.isRequired,
    setWorldSize: PropTypes.func.isRequired,
    setLandShape: PropTypes.func.isRequired,
    setRegionCount: PropTypes.func.isRequired,
    setLandColoringMethod: PropTypes.func.isRequired,
    setArtPack: PropTypes.func.isRequired,
    setCityIconType: PropTypes.func.isRequired,
    setCityFrequency: PropTypes.func.isRequired,
    setSelectedBooks: PropTypes.func.isRequired,
    setRandomSeed: PropTypes.func.isRequired,
    handleRandomMap: PropTypes.func.isRequired,
    handleFileInput: PropTypes.func.isRequired,
    onDrop: PropTypes.func.isRequired,
  }).isRequired,
  options: PropTypes.shape({
    artPacks: PropTypes.arrayOf(PropTypes.string).isRequired,
    cityIconTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
    allBooks: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  ui: PropTypes.shape({
    loading: PropTypes.bool.isRequired,
    dropRef: PropTypes.shape({ current: PropTypes.any }),
  }).isRequired,
}
