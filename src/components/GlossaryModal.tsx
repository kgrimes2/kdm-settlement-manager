import { useState, useEffect, useRef, useCallback } from 'react'
import Tesseract from 'tesseract.js'
import './GlossaryModal.css'
import type { GlossaryTerm, WikiCategoryInfo } from '../types/glossary'
import { searchGlossary, searchCategories, type SearchResult } from '../utils/glossarySearch'

interface GlossaryModalProps {
  isOpen: boolean
  onClose: () => void
  glossaryTerms: GlossaryTerm[]
  initialQuery?: string
  lastUpdated?: string
  wikiCategories: WikiCategoryInfo[]
  loadedWikiTerms: GlossaryTerm[]
  onLoadCategory: (slug: string) => Promise<void>
  loadingCategory: string | null
  onSearchWiki: (query: string) => Promise<void>
}

type ViewMode = 'search' | 'categories' | 'category-detail' | 'scan'
type OcrStatus = 'idle' | 'processing' | 'done' | 'error'

export default function GlossaryModal({
  isOpen, onClose, glossaryTerms, initialQuery, lastUpdated,
  wikiCategories, loadedWikiTerms, onLoadCategory, loadingCategory,
  onSearchWiki,
}: GlossaryModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('search')
  const [selectedCategory, setSelectedCategory] = useState<WikiCategoryInfo | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [scanning, setScanning] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [ocrText, setOcrText] = useState('')
  const [ocrError, setOcrError] = useState('')
  const [ocrResults, setOcrResults] = useState<SearchResult[]>([])

  // All searchable terms = official glossary + loaded wiki terms
  const allTerms = [...glossaryTerms, ...loadedWikiTerms]

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setOcrError('')
      // Use 'ideal' so it prefers rear camera but falls back to any available camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      })
      streamRef.current = stream
      setScanning(true)
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError') {
        setOcrError('Camera permission was denied. Please allow camera access in your browser settings and try again.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setOcrError('No camera found on this device.')
      } else if (name === 'NotReadableError' || name === 'AbortError') {
        setOcrError('Camera is in use by another application. Close other apps using the camera and try again.')
      } else if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
        setOcrError('No compatible camera found. Try uploading a photo instead.')
      } else if (err instanceof TypeError) {
        setOcrError('Camera is not available. Make sure you are using HTTPS and a supported browser.')
      } else {
        setOcrError('Could not start camera. Try uploading a photo instead.')
      }
      setScanning(false)
    }
  }, [])

  const captureAndRecognize = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the current video frame
    ctx.drawImage(video, 0, 0)

    // Preprocess: convert to grayscale and boost contrast
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      // Boost contrast: stretch values away from midpoint
      const contrasted = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128))
      data[i] = contrasted
      data[i + 1] = contrasted
      data[i + 2] = contrasted
    }
    ctx.putImageData(imageData, 0, 0)

    await recognizeImage(canvas)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const recognizeImage = useCallback(async (source: HTMLCanvasElement | File) => {
    setOcrStatus('processing')
    setOcrText('')
    setOcrResults([])

    try {
      const result = await Tesseract.recognize(source, 'eng')
      const text = result.data.text.trim()
      setOcrText(text)

      if (text) {
        // Search using the raw OCR text and also individual words
        const directResults = searchGlossary(allTerms, text)
        const words = text.split(/\s+/).filter(w => w.length > 2)
        const wordResults = words.flatMap(word => searchGlossary(allTerms, word))

        // Deduplicate and sort by score
        const seen = new Set<string>()
        const combined: SearchResult[] = []
        for (const r of [...directResults, ...wordResults]) {
          if (!seen.has(r.term.term)) {
            seen.add(r.term.term)
            combined.push(r)
          }
        }
        combined.sort((a, b) => b.score - a.score)
        setOcrResults(combined.slice(0, 10))
      }

      setOcrStatus('done')
    } catch {
      setOcrStatus('error')
      setOcrError('OCR processing failed. Please try again.')
    }
  }, [allTerms])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset the input so the same file can be re-selected
    e.target.value = ''
    recognizeImage(file)
  }, [recognizeImage])

  // Connect stream to video element whenever it mounts
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node
    if (node && streamRef.current) {
      node.srcObject = streamRef.current
    }
  }, [])

  // Stop camera when leaving scan mode or closing modal
  useEffect(() => {
    if (!isOpen || viewMode !== 'scan') {
      stopCamera()
    }
  }, [isOpen, viewMode, stopCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '')
      setResults([])
      setSelectedTerm(null)
      setHighlightedIndex(0)
      setViewMode('search')
      setSelectedCategory(null)
      setOcrStatus('idle')
      setOcrText('')
      setOcrError('')
      setOcrResults([])
      setTimeout(() => inputRef.current?.focus(), 100)
      if (initialQuery) {
        onSearchWiki(initialQuery)
      }
    }
  }, [isOpen, initialQuery])

  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchGlossary(allTerms, query)
      setResults(searchResults)
      setHighlightedIndex(0)
    } else {
      setResults([])
      setHighlightedIndex(0)
    }
  }, [query, glossaryTerms, loadedWikiTerms])

  // Auto-load wiki categories that contain matching terms
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) return
    const timer = setTimeout(() => {
      onSearchWiki(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, onSearchWiki])

  // Category search results (shown alongside term results)
  const categoryResults = query.trim() ? searchCategories(wikiCategories, query) : []

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (selectedTerm) {
        setSelectedTerm(null)
      } else if (viewMode === 'scan') {
        setViewMode('search')
      } else if (viewMode === 'category-detail') {
        setViewMode('categories')
        setSelectedCategory(null)
      } else if (viewMode === 'categories') {
        setViewMode('search')
      } else {
        onClose()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      setSelectedTerm(results[highlightedIndex].term)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCategoryClick = async (cat: WikiCategoryInfo) => {
    setSelectedCategory(cat)
    setViewMode('category-detail')
    await onLoadCategory(cat.slug)
  }

  const getCategoryTerms = (category: string): GlossaryTerm[] => {
    return loadedWikiTerms.filter(t => t.category === category)
  }

  const getTermSource = (term: GlossaryTerm): 'official' | 'wiki' => {
    return glossaryTerms.some(t => t.term === term.term) ? 'official' : 'wiki'
  }

  if (!isOpen) return null

  return (
    <div className="glossary-modal-backdrop" onClick={handleBackdropClick}>
      <div className="glossary-modal">
        <div className="glossary-modal-header">
          <h2>Kingdom Death Glossary</h2>
          <div className="glossary-header-actions">
            <div className="glossary-view-toggle">
              <button
                className={`glossary-toggle-btn ${viewMode === 'search' ? 'active' : ''}`}
                onClick={() => { setViewMode('search'); setSelectedTerm(null) }}
              >
                Search
              </button>
              <button
                className={`glossary-toggle-btn ${viewMode === 'categories' || viewMode === 'category-detail' ? 'active' : ''}`}
                onClick={() => { setViewMode('categories'); setSelectedTerm(null); setSelectedCategory(null) }}
              >
                Browse
              </button>
              <button
                className={`glossary-toggle-btn ${viewMode === 'scan' ? 'active' : ''}`}
                onClick={() => { setViewMode('scan'); setSelectedTerm(null) }}
              >
                Scan
              </button>
            </div>
            <button className="glossary-close-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <div className="glossary-modal-content">
          {/* Search mode */}
          {viewMode === 'search' && !selectedTerm && (
            <>
              <div className="glossary-search-box">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search for a term..."
                  className="glossary-search-input"
                />
              </div>

              {/* Category matches */}
              {categoryResults.length > 0 && (
                <div className="glossary-category-matches">
                  {categoryResults.map(({ category }) => (
                    <button
                      key={category.slug}
                      className="glossary-category-pill"
                      onClick={() => handleCategoryClick(category)}
                    >
                      {category.category}
                      <span className="glossary-category-pill-count">{category.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {query && results.length === 0 && categoryResults.length === 0 && (
                <div className="glossary-no-results">
                  No terms found for "{query}"
                </div>
              )}

              {results.length > 0 && (
                <div className="glossary-results">
                  {results.map((result, index) => (
                    <div
                      key={`${result.term.term}-${index}`}
                      className={`glossary-result-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                      onClick={() => setSelectedTerm(result.term)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="glossary-result-term">
                        {result.term.term}
                        <span className={`glossary-source-badge ${getTermSource(result.term)}`}>
                          {getTermSource(result.term) === 'official' ? 'Official' : 'Wiki'}
                        </span>
                      </div>
                      <div className="glossary-result-preview">
                        {result.term.definition.substring(0, 100)}
                        {result.term.definition.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!query && (
                <div className="glossary-search-hint">
                  <p>Type to search {glossaryTerms.length.toLocaleString()} official terms
                    {loadedWikiTerms.length > 0 && ` + ${loadedWikiTerms.length.toLocaleString()} wiki terms`}
                  </p>
                  <p className="glossary-browse-hint">
                    Or switch to <button className="glossary-inline-link" onClick={() => setViewMode('categories')}>Browse</button> to explore {wikiCategories.length} wiki categories
                  </p>
                </div>
              )}
            </>
          )}

          {/* Category browse mode */}
          {viewMode === 'categories' && (
            <div className="glossary-categories-view">
              <div className="glossary-categories-header">
                <h3>Browse Wiki Categories</h3>
                <span className="glossary-categories-count">
                  {wikiCategories.reduce((sum, c) => sum + c.count, 0).toLocaleString()} terms across {wikiCategories.length} categories
                </span>
              </div>
              <div className="glossary-category-grid">
                {wikiCategories.map((cat) => (
                  <button
                    key={cat.slug}
                    className="glossary-category-card"
                    onClick={() => handleCategoryClick(cat)}
                  >
                    <div className="glossary-category-card-name">{cat.category}</div>
                    <div className="glossary-category-card-count">{cat.count} terms</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category detail mode */}
          {viewMode === 'category-detail' && selectedCategory && (
            <div className="glossary-category-detail">
              <button
                className="glossary-back-btn"
                onClick={() => { setViewMode('categories'); setSelectedCategory(null); setSelectedTerm(null) }}
              >
                ← Back to categories
              </button>
              <div className="glossary-category-detail-header">
                <h3>{selectedCategory.category}</h3>
                <span className="glossary-category-detail-count">{selectedCategory.count} terms</span>
              </div>

              {loadingCategory === selectedCategory.slug ? (
                <div className="glossary-loading">
                  <div className="glossary-spinner" />
                  Loading {selectedCategory.category}...
                </div>
              ) : selectedTerm ? (
                <div className="glossary-term-display">
                  <button
                    className="glossary-back-btn"
                    onClick={() => setSelectedTerm(null)}
                  >
                    ← Back to {selectedCategory.category}
                  </button>
                  {renderTermContent(selectedTerm, allTerms, setSelectedTerm, getTermSource)}
                </div>
              ) : (
                <div className="glossary-results">
                  {getCategoryTerms(selectedCategory.category).map((term, index) => (
                    <div
                      key={`${term.term}-${index}`}
                      className="glossary-result-item"
                      onClick={() => setSelectedTerm(term)}
                    >
                      <div className="glossary-result-term">{term.term}</div>
                      <div className="glossary-result-preview">
                        {term.definition.substring(0, 100)}
                        {term.definition.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                  {getCategoryTerms(selectedCategory.category).length === 0 && !loadingCategory && (
                    <div className="glossary-no-results">
                      No terms loaded for this category yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Scan mode */}
          {viewMode === 'scan' && !selectedTerm && (
            <div className="glossary-scan-view">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />

              {!scanning && ocrStatus === 'idle' && !ocrError && (
                <div className="glossary-scan-prompt">
                  <p>Scan a KDM card to look up its glossary entry.</p>
                  <div className="glossary-scan-actions">
                    <button className="glossary-capture-btn" onClick={startCamera}>
                      Start Camera
                    </button>
                    <button
                      className="glossary-capture-btn glossary-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>
              )}

              {ocrError && !scanning && (
                <div className="glossary-ocr-status error">
                  {ocrError}
                  <div className="glossary-scan-actions" style={{ marginTop: '1rem' }}>
                    <button className="glossary-capture-btn" onClick={startCamera}>
                      Try Camera Again
                    </button>
                    <button
                      className="glossary-capture-btn glossary-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>
              )}

              {scanning && (
                <>
                  <video
                    ref={videoCallbackRef}
                    autoPlay
                    playsInline
                    muted
                    className="glossary-camera-feed"
                    onLoadedMetadata={() => videoRef.current?.play()}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className="glossary-scan-actions">
                    <button
                      className="glossary-capture-btn"
                      onClick={captureAndRecognize}
                      disabled={ocrStatus === 'processing'}
                    >
                      {ocrStatus === 'processing' ? 'Processing...' : 'Capture'}
                    </button>
                    <button className="glossary-stop-camera-btn" onClick={stopCamera}>
                      Stop Camera
                    </button>
                  </div>
                </>
              )}

              {ocrStatus === 'processing' && (
                <div className="glossary-ocr-status">
                  <div className="glossary-spinner" />
                  Recognizing text...
                </div>
              )}

              {ocrStatus === 'done' && !ocrText && (
                <div className="glossary-ocr-status">
                  No text detected. Try again with the card text clearly visible.
                </div>
              )}

              {ocrResults.length > 0 && (
                <div className="glossary-results">
                  <div className="glossary-ocr-results-header">Matching glossary terms:</div>
                  {ocrResults.map((result, index) => (
                    <div
                      key={`${result.term.term}-${index}`}
                      className="glossary-result-item"
                      onClick={() => setSelectedTerm(result.term)}
                    >
                      <div className="glossary-result-term">
                        {result.term.term}
                        <span className={`glossary-source-badge ${getTermSource(result.term)}`}>
                          {getTermSource(result.term) === 'official' ? 'Official' : 'Wiki'}
                        </span>
                      </div>
                      <div className="glossary-result-preview">
                        {result.term.definition.substring(0, 100)}
                        {result.term.definition.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Term detail (from scan mode) */}
          {viewMode === 'scan' && selectedTerm && (
            <div className="glossary-term-display">
              <button
                className="glossary-back-btn"
                onClick={() => {
                  setSelectedTerm(null)
                  setOcrStatus('idle')
                  setOcrText('')
                  setOcrResults([])
                }}
              >
                ← Back to scan
              </button>
              {renderTermContent(selectedTerm, allTerms, setSelectedTerm, getTermSource)}
            </div>
          )}

          {/* Term detail (from search mode) */}
          {viewMode === 'search' && selectedTerm && (
            <div className="glossary-term-display">
              <button
                className="glossary-back-btn"
                onClick={() => setSelectedTerm(null)}
              >
                ← Back to search
              </button>
              {renderTermContent(selectedTerm, allTerms, setSelectedTerm, getTermSource)}
            </div>
          )}
        </div>

        <div className="glossary-modal-footer">
          <div className="glossary-footer-left">
            <span className="glossary-hint">
              {viewMode === 'search' && !selectedTerm && '↑↓ to navigate • Enter to select • Esc to close'}
            </span>
            <a
              href="https://kingdomdeath.com/rules/living-glossary"
              target="_blank"
              rel="noopener noreferrer"
              className="glossary-official-link"
            >
              Official KDM Glossary →
            </a>
          </div>
          {lastUpdated && (
            <span className="glossary-last-updated">
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function renderTermContent(
  term: GlossaryTerm,
  allTerms: GlossaryTerm[],
  setSelectedTerm: (t: GlossaryTerm | null) => void,
  getTermSource: (t: GlossaryTerm) => 'official' | 'wiki',
) {
  return (
    <div className="glossary-term-content">
      <h3 className="glossary-term-title">
        {term.term}
        <span className={`glossary-source-badge ${getTermSource(term)}`}>
          {getTermSource(term) === 'official' ? 'Official' : 'Wiki'}
        </span>
      </h3>
      {term.category && (
        <div className="glossary-term-category">{term.category}</div>
      )}
      <div className="glossary-term-definition">{term.definition}</div>

      {term.relatedTerms && term.relatedTerms.length > 0 && (
        <div className="glossary-related-terms">
          <strong>Related terms:</strong>{' '}
          {term.relatedTerms.map((related, idx) => (
            <span key={related}>
              <button
                className="glossary-related-link"
                onClick={() => {
                  const relatedTerm = allTerms.find(t => t.term === related)
                  if (relatedTerm) setSelectedTerm(relatedTerm)
                }}
              >
                {related}
              </button>
              {idx < term.relatedTerms!.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}

      {term.url && (
        <div className="glossary-term-link">
          <a href={term.url} target="_blank" rel="noopener noreferrer">
            {term.url.includes('fandom.com') ? 'View on KDM Wiki →' : 'View on kingdomdeath.com →'}
          </a>
        </div>
      )}
    </div>
  )
}
