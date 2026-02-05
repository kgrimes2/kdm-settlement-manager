import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './NumericInput.css'

interface NumericInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  min?: number
  max?: number
}

export default function NumericInput({ value, onChange, className = '', min, max }: NumericInputProps) {
  const [showButtons, setShowButtons] = useState(false)
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonsRef = useRef<HTMLDivElement>(null)

  const updateButtonPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setButtonPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 4 // 0.25rem spacing
      })
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedOutsideContainer = containerRef.current && !containerRef.current.contains(target)
      const clickedOutsideButtons = buttonsRef.current && !buttonsRef.current.contains(target)

      if (clickedOutsideContainer && clickedOutsideButtons) {
        setShowButtons(false)
      }
    }

    if (showButtons) {
      updateButtonPosition()
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside as any)
      window.addEventListener('scroll', updateButtonPosition, true)
      window.addEventListener('resize', updateButtonPosition)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside as any)
      window.removeEventListener('scroll', updateButtonPosition, true)
      window.removeEventListener('resize', updateButtonPosition)
    }
  }, [showButtons])

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newValue = value + 1
    if (max === undefined || newValue <= max) {
      onChange(newValue)
    }
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newValue = value - 1
    if (min === undefined || newValue >= min) {
      onChange(newValue)
    }
  }

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowButtons(true)
  }

  return (
    <>
      <div ref={containerRef} className="numeric-input-container">
        <input
          ref={inputRef}
          type="number"
          value={value}
          onClick={handleInputClick}
          className={className}
          readOnly
        />
      </div>
      {showButtons && createPortal(
        <div
          ref={buttonsRef}
          className="numeric-buttons"
          style={{
            position: 'fixed',
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <button
            className="numeric-button decrement"
            onClick={handleDecrement}
            onTouchEnd={(e) => {
              e.preventDefault()
              handleDecrement(e as any)
            }}
            disabled={min !== undefined && value <= min}
          >
            -1
          </button>
          <button
            className="numeric-button increment"
            onClick={handleIncrement}
            onTouchEnd={(e) => {
              e.preventDefault()
              handleIncrement(e as any)
            }}
            disabled={max !== undefined && value >= max}
          >
            +1
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
