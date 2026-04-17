/**
 * PDF-based Survivor Sheet Component
 * Renders a PDF with form field overlays for survivor data
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { SurvivorData } from '../types/survivor'
import type { GlossaryTerm } from '../types/glossary'
import { survivorDataToPdfFields, pdfFieldsToSurvivorData } from '../utils/pdfFieldMapping'
import './PdfSurvivorSheet.css'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

interface PdfFormField {
  fieldName: string
  fieldType: string
  rect: number[]
  checkBox?: boolean
  fieldValue?: any
}

interface PdfSurvivorSheetProps {
  survivor: SurvivorData
  onUpdate: (survivor: SurvivorData) => void
  editable: boolean
  glossaryTerms: GlossaryTerm[]
  onOpenGlossary: (term: string) => void
  isEditingTemplate?: boolean
}

export default function PdfSurvivorSheet({
  survivor,
  onUpdate,
  editable,
  glossaryTerms: _glossaryTerms,
  onOpenGlossary: _onOpenGlossary,
  isEditingTemplate: _isEditingTemplate = false
}: PdfSurvivorSheetProps) {
  const [_pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pdfPage, setPdfPage] = useState<PDFPageProxy | null>(null)
  const [pdfFormFields, setPdfFormFields] = useState<PdfFormField[]>([])
  const [scale, setScale] = useState(1)
  const [viewport, setViewport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [pendingValues, setPendingValues] = useState<Record<string, any>>({})

  // Set mounted flag after first render
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Clear pending values when survivor changes externally (e.g., switching survivors)
  useEffect(() => {
    setPendingValues({})
  }, [survivor.createdAt]) // Use createdAt as stable identifier for survivor identity

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const overlaysRef = useRef<HTMLDivElement>(null)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load PDF document
  useEffect(() => {
    let isMounted = true

    const loadPdf = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const pdfPath = `${import.meta.env.BASE_URL}fillable.pdf`
        const loadingTask = pdfjsLib.getDocument(pdfPath)
        const doc = await loadingTask.promise

        if (!isMounted) return

        setPdfDoc(doc)

        // Get first page
        const page = await doc.getPage(1)

        if (!isMounted) return

        setPdfPage(page)

        // Extract form fields
        const annotations = await page.getAnnotations()
        const formFields = annotations
          .filter((ann: any) => ann.fieldType)
          .map((ann: any) => ({
            fieldName: ann.fieldName || '',
            fieldType: ann.fieldType,
            rect: ann.rect,
            checkBox: ann.checkBox,
            fieldValue: ann.fieldValue
          }))

        if (!isMounted) return

        setPdfFormFields(formFields)
      } catch (err) {
        console.error('Error loading PDF:', err)
        if (isMounted) {
          setError('Failed to load PDF. Please refresh the page.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPdf()

    return () => {
      isMounted = false
    }
  }, [])

  // Render PDF to canvas
  useEffect(() => {
    if (!isMounted || !pdfPage || isLoading) {
      return
    }

    if (!canvasRef.current || !containerRef.current) {
      return
    }

    const renderPdf = async () => {
      const canvas = canvasRef.current!
      const container = containerRef.current!

      // Calculate scale to fit container
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      console.log('📐 Container dimensions:', { containerWidth, containerHeight, editable })

      // If container has no dimensions yet, retry after a delay
      if (containerWidth === 0 || containerHeight === 0) {
        setTimeout(() => {
          if (containerRef.current && canvasRef.current) {
            renderPdf()
          }
        }, 100)
        return
      }

      const baseViewport = pdfPage.getViewport({ scale: 1 })
      console.log('📄 PDF base dimensions:', { width: baseViewport.width, height: baseViewport.height })

      const scaleX = containerWidth / baseViewport.width
      const scaleY = containerHeight / baseViewport.height

      // Scale proportionally to fill the container
      const calcScale = Math.min(scaleX, scaleY) * 0.99
      console.log('🔍 Calculated scale:', { scaleX, scaleY, calcScale })

      setScale(calcScale)

      const scaledViewport = pdfPage.getViewport({ scale: calcScale })
      setViewport(scaledViewport)

      // Set canvas to exact scaled dimensions (like prototype)
      const outputScale = window.devicePixelRatio || 2
      canvas.width = Math.floor(scaledViewport.width * outputScale)
      canvas.height = Math.floor(scaledViewport.height * outputScale)
      canvas.style.width = Math.floor(scaledViewport.width) + 'px'
      canvas.style.height = Math.floor(scaledViewport.height) + 'px'

      // Render PDF
      const ctx = canvas.getContext('2d')!

      ctx.save()
      ctx.scale(outputScale, outputScale)

      await pdfPage.render({
        canvasContext: ctx,
        viewport: scaledViewport
      }).promise

      ctx.restore()
    }

    renderPdf()
  }, [pdfPage, isMounted, isLoading, editable]) // Re-run when loading completes or mode changes

  // Get field value from survivor data (check pending values first for immediate feedback)
  const getFieldValue = useCallback((fieldName: string): any => {
    // If we have a pending value for this field, use it for immediate feedback
    if (fieldName in pendingValues) {
      return pendingValues[fieldName]
    }
    const pdfFields = survivorDataToPdfFields(survivor)
    const value = pdfFields[fieldName] ?? ''
    return value
  }, [survivor, pendingValues])

  // Update field value
  const updateField = useCallback((fieldName: string, value: any) => {
    // Immediately update pending values for instant feedback
    setPendingValues(prev => ({ ...prev, [fieldName]: value }))

    // Convert current survivor to PDF fields
    const pdfFields = survivorDataToPdfFields(survivor)

    // Update the field
    pdfFields[fieldName] = value

    // Convert back to SurvivorData
    const updatedSurvivor = pdfFieldsToSurvivorData(pdfFields, survivor)

    // Debounce update to survivor data
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(updatedSurvivor)
      // Clear this pending value after the update
      setPendingValues(prev => {
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    }, 300)
  }, [survivor, onUpdate])

  // Update text field - commit only on blur to avoid input issues on iPad
  const updateTextField = useCallback((fieldName: string, value: any) => {
    // Immediately update pending values for instant feedback
    setPendingValues(prev => ({ ...prev, [fieldName]: value }))
  }, [])

  const commitTextField = useCallback((fieldName: string) => {
    // Get the pending value
    const value = pendingValues[fieldName]
    if (value === undefined) return

    // Convert current survivor to PDF fields
    const pdfFields = survivorDataToPdfFields(survivor)

    // Update the field
    pdfFields[fieldName] = value

    // Convert back to SurvivorData
    const updatedSurvivor = pdfFieldsToSurvivorData(pdfFields, survivor)

    // Update immediately on blur
    onUpdate(updatedSurvivor)

    // Clear the pending value
    setPendingValues(prev => {
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }, [survivor, onUpdate, pendingValues])

  // Render overlays
  const renderOverlays = () => {
    if (!viewport || pdfFormFields.length === 0) return null

    const canvasDisplayWidth = canvasRef.current?.offsetWidth || viewport.width
    const canvasDisplayHeight = canvasRef.current?.offsetHeight || viewport.height

    // Get PDF natural dimensions
    const pdfWidth = viewport.width / scale
    const pdfHeight = viewport.height / scale

    return pdfFormFields.map((field, idx) => {
      const [x1, y1, x2, y2] = field.rect

      // Convert PDF coordinates to display coordinates
      const canvasX = (x1 / pdfWidth) * canvasDisplayWidth
      const canvasY = ((pdfHeight - y2) / pdfHeight) * canvasDisplayHeight
      const width = ((x2 - x1) / pdfWidth) * canvasDisplayWidth
      const height = ((y2 - y1) / pdfHeight) * canvasDisplayHeight

      const value = getFieldValue(field.fieldName)

      // Render based on editable mode
      if (editable) {
        // Interactive inputs
        if (field.fieldType === 'Tx') {
          // Text field
          const isNumeric = field.fieldName.includes('_num_')

          if (isNumeric) {
            // Numeric field with +/- buttons
            const numValue = parseInt(value) || 0
            return (
              <div
                key={`${field.fieldName}-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${canvasX}px`,
                  top: `${canvasY}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  display: 'flex',
                  alignItems: 'stretch'
                }}
              >
                <button
                  className="numeric-decrement"
                  onClick={() => updateField(field.fieldName, (numValue - 1).toString())}
                  style={{
                    width: '18%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    padding: '0'
                  }}
                  title="Decrease"
                >
                  -1
                </button>
                <input
                  type="text"
                  className="overlay-input"
                  data-field={field.fieldName}
                  value={value || '0'}
                  readOnly
                  style={{
                    width: '64%',
                    textAlign: 'center',
                    border: '1px solid rgba(52, 152, 219, 0.5)',
                    borderRadius: '2px',
                    fontSize: '9px',
                    padding: '2px 1px',
                    cursor: 'default'
                  }}
                  title={field.fieldName}
                />
                <button
                  className="numeric-increment"
                  onClick={() => updateField(field.fieldName, (numValue + 1).toString())}
                  style={{
                    width: '18%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    padding: '0'
                  }}
                  title="Increase"
                >
                  +1
                </button>
              </div>
            )
          } else {
            // Regular text field
            return (
              <input
                key={`${field.fieldName}-${idx}`}
                type="text"
                className="overlay-input"
                data-field={field.fieldName}
                value={value || ''}
                onChange={(e) => updateTextField(field.fieldName, e.target.value)}
                onBlur={() => commitTextField(field.fieldName)}
                style={{
                  position: 'absolute',
                  left: `${canvasX}px`,
                  top: `${canvasY}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  textAlign: 'left'
                }}
                title={field.fieldName}
              />
            )
          }
        } else if (field.fieldType === 'Btn' && field.checkBox) {
          // Checkbox
          return (
            <input
              key={`${field.fieldName}-${idx}`}
              type="checkbox"
              className="overlay-checkbox"
              data-field={field.fieldName}
              checked={Boolean(value)}
              onChange={(e) => updateField(field.fieldName, e.target.checked)}
              style={{
                position: 'absolute',
                left: `${canvasX}px`,
                top: `${canvasY}px`,
                width: `${width}px`,
                height: `${height}px`
              }}
              title={field.fieldName}
            />
          )
        }
      } else {
        // Static text overlays for overview mode
        if (value) {
          const isCheckbox = value === true
          const isNumeric = field.fieldName.includes('_num_')

          if (isCheckbox) {
            // Render filled black box for checkboxes
            return (
              <div
                key={`${field.fieldName}-${idx}`}
                className="overlay-static-text"
                style={{
                  position: 'absolute',
                  left: `${canvasX}px`,
                  top: `${canvasY}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  backgroundColor: '#000',
                  pointerEvents: 'none'
                }}
              />
            )
          } else {
            // Render text for other fields
            const displayValue = String(value)
            return (
              <div
                key={`${field.fieldName}-${idx}`}
                className="overlay-static-text"
                style={{
                  position: 'absolute',
                  left: `${canvasX}px`,
                  top: `${canvasY}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isNumeric ? 'center' : 'flex-start',
                  padding: '2px',
                  fontSize: '11px',
                  color: '#000',
                  fontWeight: 600,
                  pointerEvents: 'none',
                  overflow: 'hidden'
                }}
              >
                {displayValue}
              </div>
            )
          }
        }
      }

      return null
    })
  }

  if (error) {
    return (
      <div className="pdf-survivor-sheet-error">
        <p>{error}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="pdf-survivor-sheet-loading">
        <p>Loading survivor sheet...</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`pdf-survivor-sheet ${!editable ? 'non-editable' : ''}`}>
      <div className="pdf-wrapper">
        <canvas ref={canvasRef} className="pdf-canvas" />
        <div
          ref={overlaysRef}
          className="form-overlays"
          style={{
            width: `${canvasRef.current?.offsetWidth || 0}px`,
            height: `${canvasRef.current?.offsetHeight || 0}px`
          }}
        >
          {renderOverlays()}
        </div>
      </div>
    </div>
  )
}
