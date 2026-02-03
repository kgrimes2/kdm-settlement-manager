import { useState, useEffect, useRef } from 'react'
import './App.css'
import SurvivorSheet, { type SurvivorData, initialSurvivorData } from './SurvivorSheet'

type QuadrantId = 1 | 2 | 3 | 4 | null

interface AppState {
  survivors: {
    1: SurvivorData | null
    2: SurvivorData | null
    3: SurvivorData | null
    4: SurvivorData | null
  }
  removedSurvivors: SurvivorData[]
  retiredSurvivors: SurvivorData[]
  deceasedSurvivors: SurvivorData[]
}

function App() {
  const [focusedQuadrant, setFocusedQuadrant] = useState<QuadrantId>(null)
  const [activeQuadrant, setActiveQuadrant] = useState<1 | 2 | 3 | 4>(1)
  const [appState, setAppState] = useState<AppState>(() => {
    // Try to load saved state from localStorage
    try {
      const savedState = localStorage.getItem('kdm-app-state')
      if (savedState) {
        return JSON.parse(savedState)
      }
    } catch (error) {
      console.error('Failed to load saved state:', error)
    }

    // Default initial state if no saved state exists
    const now = Date.now()
    return {
      survivors: {
        1: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Allister', gender: 'M', survival: 1, createdAt: new Date(now - 3000).toISOString() },
        2: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Erza', gender: 'F', survival: 1, createdAt: new Date(now - 2000).toISOString() },
        3: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Lucy', gender: 'F', survival: 1, createdAt: new Date(now - 1000).toISOString() },
        4: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Zachary', gender: 'M', survival: 1, createdAt: new Date(now).toISOString() },
      },
      removedSurvivors: [],
      retiredSurvivors: [],
      deceasedSurvivors: []
    }
  })
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showSurvivorList, setShowSurvivorList] = useState(false)
  const [isClosingDrawer, setIsClosingDrawer] = useState(false)
  const [showSurvivorPool, setShowSurvivorPool] = useState(false)
  const [showRetiredSection, setShowRetiredSection] = useState(false)
  const [showDeceasedSection, setShowDeceasedSection] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('kdm-app-state', JSON.stringify(appState))
    } catch (error) {
      console.error('Failed to save state:', error)
    }
  }, [appState])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape') {
        if (showSurvivorList) {
          closeSurvivorList()
        } else if (focusedQuadrant !== null) {
          setFocusedQuadrant(null)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePreviousQuadrant()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextQuadrant()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedQuadrant, showSurvivorList, activeQuadrant])

  const handleQuadrantClick = (quadrant: QuadrantId, e: React.MouseEvent) => {
    // Only toggle if clicking directly on the quadrant, not on child elements
    if (e.target === e.currentTarget) {
      setFocusedQuadrant(focusedQuadrant === quadrant ? null : quadrant)
    }
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    // Clicking on container (whitespace) zooms out
    if (e.target === e.currentTarget && focusedQuadrant !== null) {
      setFocusedQuadrant(null)
    }
  }

  const handlePreviousQuadrant = () => {
    const newQuadrant = (focusedQuadrant || activeQuadrant) === 1 ? 4 : ((focusedQuadrant || activeQuadrant) - 1) as 1 | 2 | 3 | 4
    setActiveQuadrant(newQuadrant)
    if (focusedQuadrant !== null) {
      setFocusedQuadrant(newQuadrant)
    }
  }

  const handleNextQuadrant = () => {
    const newQuadrant = (focusedQuadrant || activeQuadrant) === 4 ? 1 : ((focusedQuadrant || activeQuadrant) + 1) as 1 | 2 | 3 | 4
    setActiveQuadrant(newQuadrant)
    if (focusedQuadrant !== null) {
      setFocusedQuadrant(newQuadrant)
    }
  }

  const updateSurvivor = (quadrant: 1 | 2 | 3 | 4, survivor: SurvivorData) => {
    setAppState(prev => ({
      ...prev,
      survivors: {
        ...prev.survivors,
        [quadrant]: survivor
      }
    }))
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(appState, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kdm-survivors-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const closeSurvivorList = () => {
    if (isClosingDrawer) return // Prevent multiple clicks during animation
    setIsClosingDrawer(true)
    setTimeout(() => {
      setShowSurvivorList(false)
      setIsClosingDrawer(false)
    }, 300) // Match animation duration
  }

  const toggleSurvivorList = () => {
    if (isClosingDrawer) return // Prevent toggle during closing animation
    if (showSurvivorList) {
      closeSurvivorList()
    } else {
      setShowSurvivorList(true)
    }
  }

  const handleDeactivateSurvivor = (quadrant: 1 | 2 | 3 | 4) => {
    setAppState(prev => {
      const survivor = prev.survivors[quadrant]

      if (!survivor) return prev

      const newState = {
        ...prev,
        removedSurvivors: [...prev.removedSurvivors, survivor],
        survivors: {
          ...prev.survivors,
          [quadrant]: null
        }
      }

      return newState
    })

    setShowSurvivorPool(true)
    showNotification(`Survivor ${quadrant} deactivated successfully`, 'success')
  }

  const findVacantQuadrant = (): 1 | 2 | 3 | 4 | null => {
    const quadrants: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4]
    for (const quadrant of quadrants) {
      if (appState.survivors[quadrant] === null) {
        return quadrant
      }
    }
    return null
  }

  const handleActivateSurvivor = (index: number) => {
    const vacantQuadrant = findVacantQuadrant()

    if (vacantQuadrant === null) {
      showNotification('All slots are full. Please deactivate a survivor first.', 'error')
      return
    }

    setAppState(prev => {
      const survivor = prev.removedSurvivors[index]
      const newRemovedSurvivors = prev.removedSurvivors.filter((_, i) => i !== index)

      return {
        ...prev,
        removedSurvivors: newRemovedSurvivors,
        survivors: {
          ...prev.survivors,
          [vacantQuadrant]: survivor
        }
      }
    })

    showNotification(`${appState.removedSurvivors[index].name || 'Survivor'} activated successfully`, 'success')
  }

  const handleCreateNewSurvivor = () => {
    const vacantQuadrant = findVacantQuadrant()
    const newSurvivor = {
      ...JSON.parse(JSON.stringify(initialSurvivorData)),
      createdAt: new Date().toISOString()
    }

    if (vacantQuadrant !== null) {
      // Put in vacant slot
      setAppState(prev => ({
        ...prev,
        survivors: {
          ...prev.survivors,
          [vacantQuadrant]: newSurvivor
        }
      }))
      showNotification('New survivor created in vacant slot', 'success')
    } else {
      // Add to removed survivors (All Survivors section)
      setAppState(prev => ({
        ...prev,
        removedSurvivors: [...prev.removedSurvivors, newSurvivor]
      }))
      setShowSurvivorPool(true)
      showNotification('New survivor created in Survivor Pool', 'success')
    }
  }

  const handleRetireSurvivor = (index: number) => {
    const survivorName = appState.removedSurvivors[index].name || 'this survivor'

    setConfirmDialog({
      message: `Are you sure you want to retire ${survivorName}? This action is permanent and cannot be undone.`,
      onConfirm: () => {
        setAppState(prev => {
          const survivor = prev.removedSurvivors[index]
          return {
            ...prev,
            removedSurvivors: prev.removedSurvivors.filter((_, i) => i !== index),
            retiredSurvivors: [...prev.retiredSurvivors, survivor]
          }
        })
        setShowRetiredSection(true)
        showNotification(`${survivorName} retired`, 'success')
        setConfirmDialog(null)
      }
    })
  }

  const handleMarkDeceased = (index: number) => {
    const survivorName = appState.removedSurvivors[index].name || 'this survivor'

    setConfirmDialog({
      message: `Are you sure you want to mark ${survivorName} as deceased? This action is permanent and cannot be undone.`,
      onConfirm: () => {
        setAppState(prev => {
          const survivor = prev.removedSurvivors[index]
          return {
            ...prev,
            removedSurvivors: prev.removedSurvivors.filter((_, i) => i !== index),
            deceasedSurvivors: [...prev.deceasedSurvivors, survivor]
          }
        })
        setShowDeceasedSection(true)
        showNotification(`${survivorName} marked as deceased`, 'success')
        setConfirmDialog(null)
      }
    })
  }

  const handleClearAllData = () => {
    setConfirmDialog({
      message: 'Are you sure you want to clear ALL survivor data? This will delete everything including all survivors, pools, retired, and deceased. This action is permanent and cannot be undone.',
      onConfirm: () => {
        // Clear localStorage
        try {
          localStorage.removeItem('kdm-app-state')
        } catch (error) {
          console.error('Failed to clear localStorage:', error)
        }

        // Reset to default state
        const now = Date.now()
        setAppState({
          survivors: {
            1: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Allister', gender: 'M', survival: 1, createdAt: new Date(now - 3000).toISOString() },
            2: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Erza', gender: 'F', survival: 1, createdAt: new Date(now - 2000).toISOString() },
            3: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Lucy', gender: 'F', survival: 1, createdAt: new Date(now - 1000).toISOString() },
            4: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Zachary', gender: 'M', survival: 1, createdAt: new Date(now).toISOString() },
          },
          removedSurvivors: [],
          retiredSurvivors: [],
          deceasedSurvivors: []
        })

        showNotification('All data cleared successfully', 'success')
        setConfirmDialog(null)
      }
    })
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)

        // Validate the data structure
        if (!data.survivors || typeof data.survivors !== 'object') {
          throw new Error('Invalid data structure: missing survivors')
        }

        // Ensure all survivor arrays exist (for backwards compatibility)
        const newState: AppState = {
          survivors: data.survivors,
          removedSurvivors: data.removedSurvivors || data.archivedSurvivors || [],
          retiredSurvivors: data.retiredSurvivors || [],
          deceasedSurvivors: data.deceasedSurvivors || []
        }

        // Completely replace the state with imported data
        setAppState(newState)
        showNotification('Data imported successfully', 'success')
      } catch (error) {
        showNotification('Failed to load file. Please ensure it is a valid KDM survivor data file.', 'error')
        console.error('Import error:', error)
      }
    }
    reader.readAsText(file)

    // Reset input so the same file can be selected again
    event.target.value = ''
  }

  const getQuadrantClass = (quadrant: QuadrantId) => {
    const baseClass = `quadrant quadrant-${quadrant}`
    const isActive = activeQuadrant === quadrant ? 'active-mobile' : 'inactive-mobile'
    if (focusedQuadrant === null) return `${baseClass} ${isActive}`
    if (focusedQuadrant === quadrant) return `${baseClass} focused`
    return `${baseClass} unfocused`
  }

  return (
    <div className="app-layout">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {confirmDialog && (
        <div className="confirm-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">{confirmDialog.message}</p>
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                className="confirm-ok"
                onClick={confirmDialog.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="top-toolbar">
        <div className="toolbar-left">
          <h1 className="toolbar-title">Kingdom Death: Monster</h1>
          <div className={`mobile-nav ${focusedQuadrant !== null ? 'show-nav' : ''}`}>
            <button
              className="nav-button"
              onClick={handlePreviousQuadrant}
              aria-label="Previous survivor"
            >
              ←
            </button>
            <span className="quadrant-indicator">
              Survivor {focusedQuadrant || activeQuadrant}/4
            </span>
            <button
              className="nav-button"
              onClick={handleNextQuadrant}
              aria-label="Next survivor"
            >
              →
            </button>
          </div>
        </div>
        <div className="toolbar-right">
          <button
            className="toolbar-button"
            onClick={handleExport}
          >
            Export
          </button>
          <button
            className="toolbar-button"
            onClick={handleImport}
          >
            Import
          </button>
          {focusedQuadrant !== null && (
            <button
              className="return-button"
              onClick={() => setFocusedQuadrant(null)}
            >
              Return to Overview
            </button>
          )}
          <button
            className="burger-menu"
            onClick={toggleSurvivorList}
            aria-label="Toggle survivor list menu"
          >
            ☰
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {showSurvivorList && (
        <div
          className={`survivor-list-overlay ${isClosingDrawer ? 'closing' : ''}`}
          onClick={() => closeSurvivorList()}
        >
          <div
            className={`survivor-list-panel ${isClosingDrawer ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="survivor-list-header">
              <h2>Survivor Management</h2>
              <div className="header-actions">
                <button
                  className="create-survivor-button"
                  onClick={handleCreateNewSurvivor}
                >
                  + New Survivor
                </button>
                <button
                  className="close-button"
                  onClick={() => closeSurvivorList()}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="survivor-list">
              {Object.entries(appState.survivors)
                .filter(([_, survivor]) => survivor !== null)
                .map(([id, survivor]) => (
                  <div key={id} className="survivor-list-item">
                    <div className="survivor-info">
                      <div className="survivor-name">
                        {survivor!.name || `New Survivor`}
                      </div>
                      <div className="survivor-meta">
                        Created: {new Date(survivor!.createdAt).toLocaleDateString()} {new Date(survivor!.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      className="deactivate-button"
                      onClick={() => handleDeactivateSurvivor(Number(id) as 1 | 2 | 3 | 4)}
                    >
                      Deactivate
                    </button>
                  </div>
                ))}
            </div>

            <div className="survivor-pool-section">
              <div
                className="survivor-pool-header"
                onClick={() => setShowSurvivorPool(!showSurvivorPool)}
              >
                <span>Survivor Pool ({appState.removedSurvivors.length})</span>
                <span className="expand-icon">{showSurvivorPool ? '▼' : '▶'}</span>
              </div>
              {showSurvivorPool && (
                <div className="survivor-pool-list">
                  {appState.removedSurvivors.length === 0 ? (
                    <div className="empty-message">No survivors in pool</div>
                  ) : (
                    appState.removedSurvivors.map((survivor, index) => (
                      <div key={index} className="survivor-list-item deactivated">
                        <div className="survivor-info">
                          <div className="survivor-name">
                            {survivor.name || `New Survivor`}
                          </div>
                          <div className="survivor-meta">
                            Created: {new Date(survivor.createdAt).toLocaleDateString()} {new Date(survivor.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="survivor-actions">
                          <button
                            className="activate-button"
                            onClick={() => handleActivateSurvivor(index)}
                          >
                            Activate
                          </button>
                          <button
                            className="retire-button"
                            onClick={() => handleRetireSurvivor(index)}
                          >
                            Retire
                          </button>
                          <button
                            className="deceased-button"
                            onClick={() => handleMarkDeceased(index)}
                          >
                            Deceased
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="retired-section">
              <div
                className="retired-header"
                onClick={() => setShowRetiredSection(!showRetiredSection)}
              >
                <span>Retired Survivors ({appState.retiredSurvivors.length})</span>
                <span className="expand-icon">{showRetiredSection ? '▼' : '▶'}</span>
              </div>
              {showRetiredSection && (
                <div className="retired-list">
                  {appState.retiredSurvivors.length === 0 ? (
                    <div className="empty-message">No retired survivors</div>
                  ) : (
                    appState.retiredSurvivors.map((survivor, index) => (
                      <div key={index} className="survivor-list-item retired">
                        <div className="survivor-info">
                          <div className="survivor-name">
                            {survivor.name || `New Survivor`}
                          </div>
                          <div className="survivor-meta">
                            Created: {new Date(survivor.createdAt).toLocaleDateString()} {new Date(survivor.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="deceased-section">
              <div
                className="deceased-header"
                onClick={() => setShowDeceasedSection(!showDeceasedSection)}
              >
                <span>Deceased Survivors ({appState.deceasedSurvivors.length})</span>
                <span className="expand-icon">{showDeceasedSection ? '▼' : '▶'}</span>
              </div>
              {showDeceasedSection && (
                <div className="deceased-list">
                  {appState.deceasedSurvivors.length === 0 ? (
                    <div className="empty-message">No deceased survivors</div>
                  ) : (
                    appState.deceasedSurvivors.map((survivor, index) => (
                      <div key={index} className="survivor-list-item deceased">
                        <div className="survivor-info">
                          <div className="survivor-name">
                            {survivor.name || `New Survivor`}
                          </div>
                          <div className="survivor-meta">
                            Created: {new Date(survivor.createdAt).toLocaleDateString()} {new Date(survivor.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="danger-zone">
              <button
                className="clear-all-button"
                onClick={handleClearAllData}
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container" onClick={handleContainerClick}>
        <div
          className={getQuadrantClass(1)}
          onClick={(e) => handleQuadrantClick(1, e)}
        >
          <div className="quadrant-hover-overlay">
            <span>Click to edit</span>
          </div>
          {appState.survivors[1] ? (
            <SurvivorSheet
              key={`survivor-1-${focusedQuadrant}-${activeQuadrant}`}
              survivor={appState.survivors[1]}
              onUpdate={(survivor) => updateSurvivor(1, survivor)}
            />
          ) : (
            <div
              className="empty-survivor-slot"
              onClick={(e) => {
                e.stopPropagation()
                setShowSurvivorList(true)
              }}
            >
              <span>Empty Slot</span>
            </div>
          )}
        </div>

        <div
          className={getQuadrantClass(2)}
          onClick={(e) => handleQuadrantClick(2, e)}
        >
          <div className="quadrant-hover-overlay">
            <span>Click to edit</span>
          </div>
          {appState.survivors[2] ? (
            <SurvivorSheet
              key={`survivor-2-${focusedQuadrant}-${activeQuadrant}`}
              survivor={appState.survivors[2]}
              onUpdate={(survivor) => updateSurvivor(2, survivor)}
            />
          ) : (
            <div
              className="empty-survivor-slot"
              onClick={(e) => {
                e.stopPropagation()
                setShowSurvivorList(true)
              }}
            >
              <span>Empty Slot</span>
            </div>
          )}
        </div>

        <div
          className={getQuadrantClass(3)}
          onClick={(e) => handleQuadrantClick(3, e)}
        >
          <div className="quadrant-hover-overlay">
            <span>Click to edit</span>
          </div>
          {appState.survivors[3] ? (
            <SurvivorSheet
              key={`survivor-3-${focusedQuadrant}-${activeQuadrant}`}
              survivor={appState.survivors[3]}
              onUpdate={(survivor) => updateSurvivor(3, survivor)}
            />
          ) : (
            <div
              className="empty-survivor-slot"
              onClick={(e) => {
                e.stopPropagation()
                setShowSurvivorList(true)
              }}
            >
              <span>Empty Slot</span>
            </div>
          )}
        </div>

        <div
          className={getQuadrantClass(4)}
          onClick={(e) => handleQuadrantClick(4, e)}
        >
          <div className="quadrant-hover-overlay">
            <span>Click to edit</span>
          </div>
          {appState.survivors[4] ? (
            <SurvivorSheet
              key={`survivor-4-${focusedQuadrant}-${activeQuadrant}`}
              survivor={appState.survivors[4]}
              onUpdate={(survivor) => updateSurvivor(4, survivor)}
            />
          ) : (
            <div
              className="empty-survivor-slot"
              onClick={(e) => {
                e.stopPropagation()
                setShowSurvivorList(true)
              }}
            >
              <span>Empty Slot</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
