import { useState, useEffect, useRef, useCallback } from 'react'
import Tesseract from 'tesseract.js'
import './InventoryModal.css'
import type { GlossaryTerm } from '../types/glossary'
import type { SettlementInventory } from '../migrations'
import { searchGlossary, type SearchResult } from '../utils/glossarySearch'

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  inventory: SettlementInventory
  onUpdateInventory: (inventory: SettlementInventory) => void
  glossaryTerms: GlossaryTerm[]
  loadedWikiTerms: GlossaryTerm[]
  onSearchWiki: (query: string) => Promise<void>
  onLoadCategory: (slug: string) => Promise<void>
}

type SectionType = 'gear' | 'materials'
type OcrStatus = 'idle' | 'processing' | 'done' | 'error'

export default function InventoryModal({
  isOpen, onClose, inventory, onUpdateInventory,
  glossaryTerms, loadedWikiTerms, onSearchWiki, onLoadCategory,
}: InventoryModalProps) {
  const [activeSection, setActiveSection] = useState<SectionType>('gear')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // OCR state
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [ocrText, setOcrText] = useState('')
  const [ocrError, setOcrError] = useState('')
  const [ocrResults, setOcrResults] = useState<SearchResult[]>([])
  const [showScan, setShowScan] = useState(false)
  const ocrBusyRef = useRef(false)

  const gearCategories = new Set(['Gear', 'Weapons', 'Armor'])
  const materialsCategories = new Set(['Resources'])

  const sectionTerms = loadedWikiTerms.filter(t => {
    if (!t.category) return false
    return activeSection === 'gear'
      ? gearCategories.has(t.category)
      : materialsCategories.has(t.category)
  })

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    ocrBusyRef.current = false
    setScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setOcrError('')
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
      } else if (err instanceof TypeError) {
        setOcrError('Camera is not available. Make sure you are using HTTPS and a supported browser.')
      } else {
        setOcrError('Could not start camera. Try uploading a photo instead.')
      }
      setScanning(false)
    }
  }, [])

  const matchTermsInText = useCallback((text: string): SearchResult[] => {
    // Split OCR text into individual words for matching
    const ocrWords = text.toLowerCase().split(/\s+/).filter(w => w.length > 0)
    const matched: SearchResult[] = []

    const fuzzyWordMatch = (ocrWord: string, termWord: string): boolean => {
      if (ocrWord === termWord) return true
      if (termWord.length < 3) return false
      // Allow up to ~40% character errors to handle OCR noise
      const maxErrors = Math.max(1, Math.ceil(termWord.length * 0.4))
      if (Math.abs(ocrWord.length - termWord.length) > maxErrors) return false
      // Levenshtein distance
      const m = ocrWord.length
      const n = termWord.length
      const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
        const row = new Array(n + 1).fill(0)
        row[0] = i
        return row
      })
      for (let j = 0; j <= n; j++) dp[0][j] = j
      for (let i = 1; i <= m; i++) {
        let rowMin = dp[i][0]
        for (let j = 1; j <= n; j++) {
          dp[i][j] = ocrWord[i - 1] === termWord[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
          rowMin = Math.min(rowMin, dp[i][j])
        }
        if (rowMin > maxErrors) return false
      }
      return dp[m][n] <= maxErrors
    }

    for (const term of sectionTerms) {
      const termWords = term.term.toLowerCase().split(/\s+/)
      if (termWords.length === 0) continue

      // Check if every word in the term name has a fuzzy match in the OCR words
      let allFound = true
      let exactMatches = 0
      for (const tw of termWords) {
        const found = ocrWords.some(ow => fuzzyWordMatch(ow, tw))
        if (!found) { allFound = false; break }
        if (ocrWords.some(ow => ow === tw)) exactMatches++
      }

      if (allFound) {
        // Score: prefer more words (longer term names) and exact matches
        const score = termWords.length * 10 + exactMatches * 5
        matched.push({ term, score })
      }
    }

    matched.sort((a, b) => b.score - a.score)
    return matched.slice(0, 10)
  }, [sectionTerms])

  const captureFrame = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return null

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const w = canvas.width
    const h = canvas.height

    // Convert to grayscale
    const gray = new Float64Array(w * h)
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    }

    // Build integral image for fast local mean computation
    const integral = new Float64Array((w + 1) * (h + 1))
    for (let y = 1; y <= h; y++) {
      let rowSum = 0
      for (let x = 1; x <= w; x++) {
        rowSum += gray[(y - 1) * w + (x - 1)]
        integral[y * (w + 1) + x] = rowSum + integral[(y - 1) * (w + 1) + x]
      }
    }

    // Adaptive threshold using local mean (block radius ~4% of image width)
    const radius = Math.max(7, Math.round(w * 0.04))
    const bias = 10 // bias toward detecting darker (faint) text

    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - radius)
      const y1 = Math.min(h, y + radius + 1)
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - radius)
        const x1 = Math.min(w, x + radius + 1)
        const area = (y1 - y0) * (x1 - x0)
        const sum = integral[y1 * (w + 1) + x1]
          - integral[y0 * (w + 1) + x1]
          - integral[y1 * (w + 1) + x0]
          + integral[y0 * (w + 1) + x0]
        const threshold = sum / area - bias
        const val = gray[y * w + x] < threshold ? 0 : 255
        const pi = (y * w + x) * 4
        data[pi] = val
        data[pi + 1] = val
        data[pi + 2] = val
      }
    }

    ctx.putImageData(imageData, 0, 0)
    return canvas
  }, [])

  const recognizeImage = useCallback(async (source: HTMLCanvasElement | File) => {
    setOcrStatus('processing')
    setOcrText('')
    setOcrResults([])

    try {
      const result = await Tesseract.recognize(source, 'eng')
      const text = result.data.text.trim()
      setOcrText(text)

      if (text) {
        setOcrResults(matchTermsInText(text))
      }

      setOcrStatus('done')
    } catch {
      setOcrStatus('error')
      setOcrError('OCR processing failed. Please try again.')
    }
  }, [matchTermsInText])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    recognizeImage(file)
  }, [recognizeImage])

  // Connect stream to video element once it mounts
  useEffect(() => {
    if (scanning && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [scanning])

  // Auto-capture: periodically grab frames and run OCR while camera is active
  useEffect(() => {
    if (!scanning) return

    const tryAutoCapture = async () => {
      if (ocrBusyRef.current) return
      const frame = captureFrame()
      if (!frame) return

      ocrBusyRef.current = true
      try {
        const result = await Tesseract.recognize(frame, 'eng')
        const text = result.data.text.trim()
        if (text) {
          setOcrText(text)
          const matches = matchTermsInText(text)
          if (matches.length > 0) {
            setOcrText(text)
            setOcrResults(matches)
            setOcrStatus('done')
            stopCamera()
            return
          }
        }
      } catch {
        // Silently retry on next interval
      } finally {
        ocrBusyRef.current = false
      }
    }

    // Start first attempt after a short delay to let the camera stabilize
    const initialTimeout = setTimeout(tryAutoCapture, 1000)
    const interval = setInterval(tryAutoCapture, 2500)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [scanning, captureFrame, matchTermsInText, stopCamera])

  // Stop camera when closing modal or hiding scan
  useEffect(() => {
    if (!isOpen || !showScan) {
      stopCamera()
    }
  }, [isOpen, showScan, stopCamera])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  // Pre-load inventory-relevant wiki categories when modal opens
  useEffect(() => {
    if (isOpen) {
      const slugs = ['gear', 'weapons', 'armor', 'resources']
      slugs.forEach(slug => onLoadCategory(slug))
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSearchResults([])
      setHighlightedIndex(0)
      setShowScan(false)
      setOcrStatus('idle')
      setOcrText('')
      setOcrError('')
      setOcrResults([])
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Search as user types
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchGlossary(sectionTerms, searchQuery)
      setSearchResults(results)
      setHighlightedIndex(0)
    } else {
      setSearchResults([])
      setHighlightedIndex(0)
    }
  }, [searchQuery, glossaryTerms, loadedWikiTerms, activeSection])

  // Auto-load wiki categories for search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return
    const timer = setTimeout(() => {
      onSearchWiki(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, onSearchWiki])

  const addItem = (name: string) => {
    const section = inventory[activeSection]
    const newSection = { ...section, [name]: (section[name] || 0) + 1 }
    onUpdateInventory({ ...inventory, [activeSection]: newSection })
    setSearchQuery('')
    setSearchResults([])
  }

  const incrementItem = (name: string) => {
    const section = inventory[activeSection]
    const newSection = { ...section, [name]: (section[name] || 0) + 1 }
    onUpdateInventory({ ...inventory, [activeSection]: newSection })
  }

  const decrementItem = (name: string) => {
    const section = inventory[activeSection]
    const current = section[name] || 0
    if (current <= 1) {
      const { [name]: _, ...rest } = section
      onUpdateInventory({ ...inventory, [activeSection]: rest })
    } else {
      const newSection = { ...section, [name]: current - 1 }
      onUpdateInventory({ ...inventory, [activeSection]: newSection })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showScan) {
        setShowScan(false)
      } else {
        onClose()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.min(prev + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault()
      addItem(searchResults[highlightedIndex].term.term)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const currentItems = inventory[activeSection]
  const sortedItems = Object.entries(currentItems).sort(([a], [b]) => a.localeCompare(b))

  if (!isOpen) return null

  return (
    <div className="inventory-modal-backdrop" onClick={handleBackdropClick}>
      <div className="inventory-modal">
        <div className="inventory-modal-header">
          <h2>Settlement Inventory</h2>
          <button className="inventory-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="inventory-section-tabs">
          <button
            className={`inventory-tab-btn ${activeSection === 'gear' ? 'active' : ''}`}
            onClick={() => setActiveSection('gear')}
          >
            Gear
          </button>
          <button
            className={`inventory-tab-btn ${activeSection === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveSection('materials')}
          >
            Materials
          </button>
        </div>

        <div className="inventory-modal-content">
          {!showScan && (
            <div className="inventory-search-row">
              <div className="inventory-search-wrapper">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search to add..."
                  className="inventory-search-input"
                />
                {searchQuery && searchResults.length > 0 && (
                  <div className="inventory-autocomplete">
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.term.term}-${index}`}
                        className={`inventory-autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                        onClick={() => addItem(result.term.term)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        {result.term.term}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="inventory-scan-btn"
                onClick={() => {
                  setShowScan(true)
                  setOcrStatus('idle')
                  setOcrText('')
                  setOcrError('')
                  setOcrResults([])
                }}
              >
                Scan Card
              </button>
            </div>
          )}

          {showScan && (
            <div className="inventory-scan-view">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />

              <button
                className="inventory-back-btn"
                onClick={() => setShowScan(false)}
              >
                ← Back to search
              </button>

              {!scanning && ocrStatus === 'idle' && !ocrError && (
                <div className="inventory-scan-prompt">
                  <p>Scan a card to add it to your {activeSection} inventory.</p>
                  <div className="inventory-scan-actions">
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
                  <div className="inventory-scan-actions" style={{ marginTop: '1rem' }}>
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
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="glossary-camera-feed"
                    onLoadedMetadata={() => videoRef.current?.play()}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className="glossary-ocr-status">
                    <div className="glossary-spinner" />
                    Scanning for card...
                  </div>
                  <div className="inventory-scan-actions">
                    <button className="glossary-stop-camera-btn" onClick={stopCamera}>
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {ocrStatus === 'done' && ocrText && (
                <div className="glossary-ocr-raw">
                  <strong>Detected text:</strong> {ocrText}
                </div>
              )}

              {ocrStatus === 'done' && !ocrText && (
                <div className="glossary-ocr-status">
                  No text detected. Try again with the card text clearly visible.
                </div>
              )}

              {ocrStatus === 'done' && !scanning && (
                <div className="inventory-scan-actions" style={{ marginTop: '0.5rem' }}>
                  <button className="glossary-capture-btn" onClick={startCamera}>
                    Start Camera
                  </button>
                  <button
                    className="glossary-capture-btn glossary-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Another
                  </button>
                </div>
              )}

              {ocrResults.length > 0 && (
                <div className="inventory-ocr-results">
                  <div className="inventory-ocr-results-header">Tap a match to add to {activeSection}:</div>
                  {ocrResults.map((result, index) => (
                    <div
                      key={`${result.term.term}-${index}`}
                      className="inventory-ocr-result-item"
                      onClick={() => addItem(result.term.term)}
                    >
                      {result.term.term}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!showScan && (
            <div className="inventory-item-list">
              {sortedItems.length === 0 ? (
                <div className="inventory-empty">No items yet</div>
              ) : (
                sortedItems.map(([name, count]) => (
                  <div key={name} className="inventory-item-row">
                    <span className="inventory-item-name">{name}</span>
                    <span className="inventory-item-count">x{count}</span>
                    <button
                      className="inventory-item-btn inventory-item-plus"
                      onClick={() => incrementItem(name)}
                      aria-label={`Add one ${name}`}
                    >
                      +
                    </button>
                    <button
                      className="inventory-item-btn inventory-item-minus"
                      onClick={() => decrementItem(name)}
                      aria-label={`Remove one ${name}`}
                    >
                      -
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
