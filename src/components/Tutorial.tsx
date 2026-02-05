import { useState, useEffect } from 'react'
import './Tutorial.css'

interface TutorialStep {
  title: string
  description: string
  target?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface TutorialProps {
  isOpen: boolean
  onClose: () => void
  appVersion: string
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to KDM Settlement Manager!',
    description: 'This quick tutorial will show you how to manage your Kingdom Death: Monster survivors. You can skip this anytime by clicking "Skip Tutorial".',
    position: 'center'
  },
  {
    title: 'Survivor Sheets',
    description: 'Each quadrant shows a survivor. Click on any survivor sheet to zoom in and edit their details. On mobile, use the arrow buttons at the top to navigate between survivors. (Click a survivor to continue)',
    target: '.survivor-sheet',
    position: 'center'
  },
  {
    title: 'Incrementing Stats',
    description: 'Click on any stat number to reveal +1/-1 buttons. Use these to adjust stats like Survival, Movement, Accuracy, etc. Numbers update instantly and save automatically.',
    target: '.middle-column',
    position: 'center'
  },
  {
    title: 'Hunt XP Tracking',
    description: 'Check boxes to track Hunt XP. Age milestones (2, 6, 10, 15) are highlighted in yellow.',
    target: '.hunt-xp-section',
    position: 'bottom'
  },
  {
    title: 'Adding Fighting Arts & Disorders',
    description: 'Type a name and press Enter to create a pill. Click the × to remove. The 📖 icon means there\'s a glossary entry available - click the text to search!',
    target: '.fighting-arts',
    position: 'left'
  },
  {
    title: 'Return to Overview',
    description: 'Click the "↩️ Return to Overview" button at the top right to go back to viewing all four survivor sheets. (Click the button to continue)',
    target: '.return-button, .return-to-overview-button',
    position: 'center'
  },
  {
    title: 'Glossary Search',
    description: 'Click the "📖 Glossary" button to search 650+ Kingdom Death terms. Pills with the book icon have glossary entries - click them for instant lookup!',
    target: '.glossary-button',
    position: 'bottom'
  },
  {
    title: 'Managing Survivors',
    description: 'Click "👥 Manage Survivors" to create new survivors, move survivors between active/pool, or mark them as retired/deceased.',
    target: 'button:has-text("Manage Survivors")',
    position: 'center'
  },
  {
    title: 'Multiple Settlements',
    description: 'Use the settlement dropdown to switch between campaigns. Click "Manage Settlements..." to create, rename, or delete settlements.',
    target: '.settlement-selector',
    position: 'bottom'
  },
  {
    title: 'Auto-Save',
    description: 'All changes save automatically to your browser. Use ⬆️ Export to backup your data, or ⬇️ Import to restore from a file.',
    target: '.toolbar-right',
    position: 'bottom'
  },
  {
    title: 'You\'re All Set!',
    description: 'That\'s it! Your data is saved locally and persists between sessions. Happy hunting, and may the Lantern light your way! 🏮',
    position: 'center'
  }
]

export default function Tutorial({ isOpen, onClose, appVersion }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const [stepCompleted, setStepCompleted] = useState(false)

  const step = tutorialSteps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === tutorialSteps.length - 1

  // Reset to first step when tutorial is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
    }
  }, [isOpen])

  // Continuously update highlight position for animations/transitions
  useEffect(() => {
    if (!isOpen || !highlightedElement) return

    const updatePosition = () => {
      const rect = highlightedElement.getBoundingClientRect()
      setHighlightRect(rect)
    }

    updatePosition()
    const animationFrame = setInterval(updatePosition, 16) // ~60fps

    return () => clearInterval(animationFrame)
  }, [isOpen, highlightedElement])

  // Reset step completion when step changes
  useEffect(() => {
    setStepCompleted(false)
  }, [currentStep])

  // Handle spacebar to advance tutorial
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentStep, stepCompleted, isLastStep])

  // Listen for clicks on highlighted element (for step 2 - Focus a Survivor, step 6 - Return to Overview)
  useEffect(() => {
    if (!isOpen) return

    // Step 2: Focus a Survivor
    if (currentStep === 1) {
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        // Check if click is on quadrant or survivor sheet
        if (target.closest('.quadrant') || target.closest('.survivor-sheet')) {
          setStepCompleted(true)
        }
      }

      document.addEventListener('click', handleClick, true) // Use capture phase
      return () => document.removeEventListener('click', handleClick, true)
    }

    // Step 6: Return to Overview
    if (currentStep === 5) {
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        // Check if click is on return button
        if (target.closest('.return-button') || target.closest('.return-to-overview-button')) {
          setStepCompleted(true)
        }
      }

      document.addEventListener('click', handleClick, true)
      return () => document.removeEventListener('click', handleClick, true)
    }
  }, [isOpen, currentStep])

  useEffect(() => {
    if (!isOpen) return

    const findAndHighlightElement = () => {
      // Find and highlight the target element
      if (step.target) {
        // Handle special selector for "has-text"
        let element: HTMLElement | null = null

        if (step.target.includes('has-text')) {
          const text = step.target.match(/has-text\("([^"]+)"\)/)?.[1]
          if (text) {
            const buttons = Array.from(document.querySelectorAll('button'))
            element = buttons.find(btn => btn.textContent?.includes(text)) as HTMLElement || null
          }
        } else {
          // Find all matching elements
          const elements = Array.from(document.querySelectorAll(step.target)) as HTMLElement[]

          // Find the first visible element (not hidden, has dimensions)
          element = elements.find(el => {
            const rect = el.getBoundingClientRect()
            const style = window.getComputedStyle(el)
            return rect.width > 0 &&
                   rect.height > 0 &&
                   style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   style.opacity !== '0'
          }) || null

          if (!element && elements.length > 0) {
            // If no visible element found, just use the first one
            element = elements[0]
          }
        }

        if (element) {
          setHighlightedElement(element)
          // Scroll element into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          setHighlightedElement(null)
        }
      } else {
        setHighlightedElement(null)
      }
    }

    // Initial attempt
    findAndHighlightElement()

    // Retry after a short delay to handle DOM changes (like focusing a survivor)
    const timeoutId = setTimeout(findAndHighlightElement, 300)

    // Also set up a polling interval to keep checking for the element
    const intervalId = setInterval(findAndHighlightElement, 500)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [currentStep, step.target, isOpen])

  const handleNext = () => {
    // Check if step requires completion
    const requiresInteraction = currentStep === 1 || currentStep === 5 // Step 2: Focus a Survivor, Step 6: Return to Overview
    if (requiresInteraction && !stepCompleted) {
      return // Don't advance if step not completed
    }

    if (isLastStep) {
      handleClose()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleClose = () => {
    // Mark tutorial as completed for this version
    localStorage.setItem('tutorial-completed', appVersion)
    onClose()
  }

  const handleSkip = () => {
    handleClose()
  }

  if (!isOpen) return null

  // Calculate tooltip position based on highlighted element
  const getTooltipStyle = (): React.CSSProperties => {
    if (!highlightedElement || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }
    }

    const rect = highlightedElement.getBoundingClientRect()
    const style: React.CSSProperties = {}

    switch (step.position) {
      case 'top':
        style.left = `${rect.left + rect.width / 2}px`
        style.top = `${rect.top - 20}px`
        style.transform = 'translate(-50%, -100%)'
        break
      case 'bottom':
        style.left = `${rect.left + rect.width / 2}px`
        style.top = `${rect.bottom + 20}px`
        style.transform = 'translateX(-50%)'
        break
      case 'left':
        style.left = `${rect.left - 20}px`
        style.top = `${rect.top + rect.height / 2}px`
        style.transform = 'translate(-100%, -50%)'
        break
      case 'right':
        style.left = `${rect.right + 20}px`
        style.top = `${rect.top + rect.height / 2}px`
        style.transform = 'translateY(-50%)'
        break
      default:
        style.top = '50%'
        style.left = '50%'
        style.transform = 'translate(-50%, -50%)'
    }

    return style
  }

  return (
    <div className={`tutorial-overlay ${!highlightedElement ? 'no-highlight' : ''}`}>
      {highlightedElement && highlightRect && (
        <div
          className="tutorial-highlight"
          style={{
            top: `${highlightRect.top - 8}px`,
            left: `${highlightRect.left - 8}px`,
            width: `${highlightRect.width + 16}px`,
            height: `${highlightRect.height + 16}px`
          }}
        />
      )}

      <div className="tutorial-tooltip" style={getTooltipStyle()}>
        <div className="tutorial-header">
          <h3>{step.title}</h3>
          <button className="tutorial-close" onClick={handleSkip} aria-label="Skip tutorial">
            ×
          </button>
        </div>

        <div className="tutorial-body">
          <p>{step.description}</p>
        </div>

        <div className="tutorial-footer">
          <div className="tutorial-progress">
            Step {currentStep + 1} of {tutorialSteps.length}
          </div>
          <div className="tutorial-actions">
            {!isFirstStep && currentStep !== 6 && (
              <button className="tutorial-btn tutorial-btn-secondary" onClick={handlePrevious}>
                Previous
              </button>
            )}
            <button
              className="tutorial-btn tutorial-btn-primary"
              onClick={handleNext}
              disabled={(currentStep === 1 || currentStep === 5) && !stepCompleted}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
