import { useState, useEffect, useRef } from 'react'
import './GlossaryModal.css'
import type { GlossaryTerm } from '../types/glossary'
import { searchGlossary, type SearchResult } from '../utils/glossarySearch'

interface GlossaryModalProps {
  isOpen: boolean
  onClose: () => void
  glossaryTerms: GlossaryTerm[]
  initialQuery?: string
  lastUpdated?: string
}

export default function GlossaryModal({ isOpen, onClose, glossaryTerms, initialQuery, lastUpdated }: GlossaryModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Reset modal state when opened
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(initialQuery || '')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTerm(null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightedIndex(0)
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, initialQuery])

  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchGlossary(glossaryTerms, query)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(searchResults)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightedIndex(0)
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightedIndex(0)
    }
  }, [query, glossaryTerms])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (selectedTerm) {
        setSelectedTerm(null)
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

  if (!isOpen) return null

  return (
    <div className="glossary-modal-backdrop" onClick={handleBackdropClick}>
      <div className="glossary-modal">
        <div className="glossary-modal-header">
          <h2>Kingdom Death Glossary</h2>
          <button className="glossary-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="glossary-modal-content">
          {!selectedTerm ? (
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

              {query && results.length === 0 && (
                <div className="glossary-no-results">
                  No terms found for "{query}"
                </div>
              )}

              {results.length > 0 && (
                <div className="glossary-results">
                  {results.map((result, index) => (
                    <div
                      key={result.term.term}
                      className={`glossary-result-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                      onClick={() => setSelectedTerm(result.term)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="glossary-result-term">{result.term.term}</div>
                      <div className="glossary-result-preview">
                        {result.term.definition.substring(0, 100)}
                        {result.term.definition.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="glossary-term-display">
              <button
                className="glossary-back-btn"
                onClick={() => setSelectedTerm(null)}
              >
                ← Back to search
              </button>

              <div className="glossary-term-content">
                <h3 className="glossary-term-title">{selectedTerm.term}</h3>
                {selectedTerm.category && (
                  <div className="glossary-term-category">{selectedTerm.category}</div>
                )}
                <div className="glossary-term-definition">{selectedTerm.definition}</div>

                {selectedTerm.relatedTerms && selectedTerm.relatedTerms.length > 0 && (
                  <div className="glossary-related-terms">
                    <strong>Related terms:</strong>{' '}
                    {selectedTerm.relatedTerms.map((related, idx) => (
                      <span key={related}>
                        <button
                          className="glossary-related-link"
                          onClick={() => {
                            const relatedTerm = glossaryTerms.find(t => t.term === related)
                            if (relatedTerm) setSelectedTerm(relatedTerm)
                          }}
                        >
                          {related}
                        </button>
                        {idx < selectedTerm.relatedTerms!.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {selectedTerm.url && (
                  <div className="glossary-term-link">
                    <a href={selectedTerm.url} target="_blank" rel="noopener noreferrer">
                      View on kingdomdeath.com →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="glossary-modal-footer">
          <div className="glossary-footer-left">
            <span className="glossary-hint">
              {!selectedTerm && '↑↓ to navigate • Enter to select • Esc to close'}
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
