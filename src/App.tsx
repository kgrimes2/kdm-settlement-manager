import { useState, useEffect, useRef } from 'react'
import './App.css'
import SurvivorSheet, { type SurvivorData, initialSurvivorData } from './SurvivorSheet'
import {
  type AppState,
  type SettlementData,
  migrateData,
  validateAppState,
  createDefaultAppState,
  CURRENT_DATA_VERSION
} from './migrations'

const APP_VERSION = '1.0.1'

type QuadrantId = 1 | 2 | 3 | 4 | null

function App() {
  const [focusedQuadrant, setFocusedQuadrant] = useState<QuadrantId>(null)
  const [activeQuadrant, setActiveQuadrant] = useState<1 | 2 | 3 | 4>(1)

  const [appState, setAppState] = useState<AppState>(() => {
    // Try to load saved state from localStorage
    try {
      const savedState = localStorage.getItem('kdm-app-state')
      if (savedState) {
        const parsed = JSON.parse(savedState)
        const migrated = migrateData(parsed)

        // Validate the migrated data
        if (validateAppState(migrated)) {
          console.log(`Successfully loaded data (version ${migrated.version})`)
          return migrated
        } else {
          console.error('Migrated data failed validation')
        }
      }
    } catch (error) {
      console.error('Failed to load saved state:', error)
      // Don't throw - fall through to default state
    }

    // Default initial state if no saved state exists or migration failed
    console.log('Creating new default state')
    return createDefaultAppState()
  })
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showSurvivorList, setShowSurvivorList] = useState(false)
  const [isClosingDrawer, setIsClosingDrawer] = useState(false)
  const [showSurvivorPool, setShowSurvivorPool] = useState(false)
  const [showRetiredSection, setShowRetiredSection] = useState(false)
  const [showDeceasedSection, setShowDeceasedSection] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showActiveSurvivors, setShowActiveSurvivors] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hoveredQuadrant, setHoveredQuadrant] = useState<QuadrantId>(null)
  const [showHoverOverlay, setShowHoverOverlay] = useState<QuadrantId>(null)
  const hoverTimeoutRef = useRef<number | null>(null)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [showMobileToolbar, setShowMobileToolbar] = useState(false)
  const [showSettlementDropdown, setShowSettlementDropdown] = useState(false)
  const [showSettlementManagement, setShowSettlementManagement] = useState(false)
  const [isClosingSettlementDrawer, setIsClosingSettlementDrawer] = useState(false)
  const [settlementDialog, setSettlementDialog] = useState<{ type: 'create' | 'rename'; settlementId?: string; currentName?: string } | null>(null)
  const [settlementInputValue, setSettlementInputValue] = useState('')
  const [showSurvivalLimitDialog, setShowSurvivalLimitDialog] = useState(false)
  const [survivalLimitInputValue, setSurvivalLimitInputValue] = useState('')

  // Helper to get current settlement
  const getCurrentSettlement = (): SettlementData | undefined => {
    return appState.settlements.find(s => s.id === appState.currentSettlementId)
  }

  const currentSettlement = getCurrentSettlement()

  // Save state to localStorage with 1000ms debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('kdm-app-state', JSON.stringify(appState))
      } catch (error) {
        console.error('Failed to save state:', error)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [appState])

  // Detect mobile devices and small screens
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = /Android|webOS|iPhone|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth <= 1000
      setIsMobileDevice(isMobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-focus active quadrant on mobile devices
  useEffect(() => {
    if (isMobileDevice && focusedQuadrant === null) {
      setFocusedQuadrant(activeQuadrant)
    }
  }, [isMobileDevice, activeQuadrant, focusedQuadrant])

  // Reset mobile toolbar when focus changes
  useEffect(() => {
    setShowMobileToolbar(false)
  }, [focusedQuadrant])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape') {
        if (showSettlementManagement) {
          closeSettlementManagement()
        } else if (showSurvivorList) {
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
  }, [focusedQuadrant, showSurvivorList, showSettlementManagement, activeQuadrant])

  // Close settlement dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.settlement-selector')) {
        setShowSettlementDropdown(false)
      }
    }

    if (showSettlementDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettlementDropdown])

  // Auto-hide hover overlay after 5 seconds of no mouse movement
  useEffect(() => {
    if (hoveredQuadrant === null) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      return
    }

    const resetHoverTimer = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }

      // Show overlay on hover/movement
      setShowHoverOverlay(hoveredQuadrant)

      // Hide after 5 seconds of no movement
      hoverTimeoutRef.current = window.setTimeout(() => {
        setShowHoverOverlay(null)
      }, 5000)
    }

    // Start the timer
    resetHoverTimer()

    // Reset timer on mouse movement
    const handleMouseMove = () => {
      resetHoverTimer()
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [hoveredQuadrant])

  const handleQuadrantMouseEnter = (quadrant: QuadrantId) => {
    // Don't show overlay when a quadrant is focused (zoomed in) or on mobile devices
    if (focusedQuadrant !== null || isMobileDevice) return
    setHoveredQuadrant(quadrant)
    setShowHoverOverlay(quadrant)
  }

  const handleQuadrantMouseLeave = () => {
    setHoveredQuadrant(null)
    setShowHoverOverlay(null)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

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

  // Settlement management functions
  const switchSettlement = (settlementId: string) => {
    setAppState(prev => ({
      ...prev,
      version: CURRENT_DATA_VERSION,
      currentSettlementId: settlementId
    }))
  }

  const createSettlement = (name: string) => {
    const newSettlement: SettlementData = {
      id: `settlement-${Date.now()}`,
      name,
      survivors: { 1: null, 2: null, 3: null, 4: null },
      removedSurvivors: [],
      retiredSurvivors: [],
      deceasedSurvivors: []
    }
    setAppState(prev => ({
      ...prev,
      settlements: [...prev.settlements, newSettlement]
    }))
    return newSettlement.id
  }

  const renameSettlement = (settlementId: string, newName: string) => {
    setAppState(prev => ({
      ...prev,
      settlements: prev.settlements.map(s =>
        s.id === settlementId ? { ...s, name: newName } : s
      )
    }))
  }

  const deleteSettlement = (settlementId: string) => {
    setAppState(prev => {
      const filtered = prev.settlements.filter(s => s.id !== settlementId)
      // If deleting current settlement, switch to first remaining
      const newCurrentId = settlementId === prev.currentSettlementId
        ? filtered[0]?.id || prev.currentSettlementId
        : prev.currentSettlementId
      return {
        ...prev,
        settlements: filtered,
        currentSettlementId: newCurrentId
      }
    })
  }

  const updateSurvivor = (quadrant: 1 | 2 | 3 | 4, survivor: SurvivorData) => {
    setAppState(prev => ({
      ...prev,
      settlements: prev.settlements.map(s =>
        s.id === prev.currentSettlementId
          ? {
              ...s,
              survivors: {
                ...s.survivors,
                [quadrant]: survivor
              }
            }
          : s
      )
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

  const closeSettlementManagement = () => {
    if (isClosingSettlementDrawer) return
    setIsClosingSettlementDrawer(true)
    setTimeout(() => {
      setShowSettlementManagement(false)
      setIsClosingSettlementDrawer(false)
    }, 300)
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
    setAppState(prev => ({
      ...prev,
      settlements: prev.settlements.map(s => {
        if (s.id !== prev.currentSettlementId) return s

        const survivor = s.survivors[quadrant]
        if (!survivor) return s

        return {
          ...s,
          removedSurvivors: [...s.removedSurvivors, survivor],
          survivors: {
            ...s.survivors,
            [quadrant]: null
          }
        }
      })
    }))

    setShowSurvivorPool(true)
    showNotification(`Survivor ${quadrant} deactivated successfully`, 'success')
  }

  const findVacantQuadrant = (): 1 | 2 | 3 | 4 | null => {
    const settlement = getCurrentSettlement()
    if (!settlement) return null

    const quadrants: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4]
    for (const quadrant of quadrants) {
      if (settlement.survivors[quadrant] === null) {
        return quadrant
      }
    }
    return null
  }

  const handleActivateSurvivor = (index: number) => {
    const vacantQuadrant = findVacantQuadrant()
    const settlement = getCurrentSettlement()

    if (!settlement) return
    if (vacantQuadrant === null) {
      showNotification('All slots are full. Please deactivate a survivor first.', 'error')
      return
    }

    const survivorName = settlement.removedSurvivors[index]?.name || 'Survivor'

    setAppState(prev => ({
      ...prev,
      settlements: prev.settlements.map(s => {
        if (s.id !== prev.currentSettlementId) return s

        const survivor = s.removedSurvivors[index]
        const newRemovedSurvivors = s.removedSurvivors.filter((_, i) => i !== index)

        return {
          ...s,
          removedSurvivors: newRemovedSurvivors,
          survivors: {
            ...s.survivors,
            [vacantQuadrant]: survivor
          }
        }
      })
    }))

    showNotification(`${survivorName} activated successfully`, 'success')
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
        settlements: prev.settlements.map(s =>
          s.id === prev.currentSettlementId
            ? {
                ...s,
                survivors: {
                  ...s.survivors,
                  [vacantQuadrant]: newSurvivor
                }
              }
            : s
        )
      }))
      showNotification('New survivor created in vacant slot', 'success')
    } else {
      // Add to removed survivors (All Survivors section)
      setAppState(prev => ({
        ...prev,
        settlements: prev.settlements.map(s =>
          s.id === prev.currentSettlementId
            ? {
                ...s,
                removedSurvivors: [...s.removedSurvivors, newSurvivor]
              }
            : s
        )
      }))
      setShowSurvivorPool(true)
      showNotification('New survivor created in Survivor Pool', 'success')
    }
  }

  const handleRetireSurvivor = (index: number) => {
    const settlement = getCurrentSettlement()
    if (!settlement) return

    const survivorName = settlement.removedSurvivors[index].name || 'this survivor'

    setConfirmDialog({
      message: `Are you sure you want to retire ${survivorName}? This action is permanent and cannot be undone.`,
      onConfirm: () => {
        setAppState(prev => ({
          ...prev,
          settlements: prev.settlements.map(s => {
            if (s.id !== prev.currentSettlementId) return s

            const survivor = s.removedSurvivors[index]
            return {
              ...s,
              removedSurvivors: s.removedSurvivors.filter((_, i) => i !== index),
              retiredSurvivors: [...s.retiredSurvivors, survivor]
            }
          })
        }))
        setShowRetiredSection(true)
        showNotification(`${survivorName} retired`, 'success')
        setConfirmDialog(null)
      }
    })
  }

  const handleMarkDeceased = (index: number) => {
    const settlement = getCurrentSettlement()
    if (!settlement) return

    const survivorName = settlement.removedSurvivors[index].name || 'this survivor'

    setConfirmDialog({
      message: `Are you sure you want to mark ${survivorName} as deceased? This action is permanent and cannot be undone.`,
      onConfirm: () => {
        setAppState(prev => ({
          ...prev,
          settlements: prev.settlements.map(s => {
            if (s.id !== prev.currentSettlementId) return s

            const survivor = s.removedSurvivors[index]
            return {
              ...s,
              removedSurvivors: s.removedSurvivors.filter((_, i) => i !== index),
              deceasedSurvivors: [...s.deceasedSurvivors, survivor]
            }
          })
        }))
        setShowDeceasedSection(true)
        showNotification(`${survivorName} marked as deceased`, 'success')
        setConfirmDialog(null)
      }
    })
  }

  const handleHealAllWounds = () => {
    setConfirmDialog({
      message: 'Heal all wounds for all survivors? This will clear all injury checkboxes (brain, head, arms, body, waist, legs) for all active and inactive survivors.',
      onConfirm: () => {
        setAppState(prev => ({
          ...prev,
          settlements: prev.settlements.map(s => {
            if (s.id !== prev.currentSettlementId) return s

            const healSurvivor = (survivor: SurvivorData | null) => {
              if (!survivor) return null
              return {
                ...survivor,
                insane: false,
                bodyLocations: {
                  head: { ...survivor.bodyLocations.head, light: false, heavy: false },
                  arms: { ...survivor.bodyLocations.arms, light: false, heavy: false },
                  body: { ...survivor.bodyLocations.body, light: false, heavy: false },
                  waist: { ...survivor.bodyLocations.waist, light: false, heavy: false },
                  legs: { ...survivor.bodyLocations.legs, light: false, heavy: false },
                }
              }
            }

            return {
              ...s,
              survivors: {
                1: healSurvivor(s.survivors[1]),
                2: healSurvivor(s.survivors[2]),
                3: healSurvivor(s.survivors[3]),
                4: healSurvivor(s.survivors[4]),
              },
              removedSurvivors: s.removedSurvivors.map(survivor => healSurvivor(survivor)!),
              retiredSurvivors: s.retiredSurvivors.map(survivor => healSurvivor(survivor)!),
              deceasedSurvivors: s.deceasedSurvivors.map(survivor => healSurvivor(survivor)!),
            }
          })
        }))

        showNotification('All wounds healed successfully', 'success')
        setConfirmDialog(null)
      }
    })
  }

  const handleSetMaxSurvival = () => {
    setSurvivalLimitInputValue('')
    setShowSurvivalLimitDialog(true)
  }

  const handleClearGearBonuses = () => {
    setConfirmDialog({
      message: 'Clear all gear bonuses for all survivors? This will set all gear bonus stats to 0 for all active and inactive survivors.',
      onConfirm: () => {
        setAppState(prev => ({
          ...prev,
          settlements: prev.settlements.map(s => {
            if (s.id !== prev.currentSettlementId) return s

            const clearGearBonuses = (survivor: SurvivorData | null) => {
              if (!survivor) return null
              return {
                ...survivor,
                gearBonuses: {
                  movement: 0,
                  accuracy: 0,
                  strength: 0,
                  evasion: 0,
                  luck: 0,
                  speed: 0,
                }
              }
            }

            return {
              ...s,
              survivors: {
                1: clearGearBonuses(s.survivors[1]),
                2: clearGearBonuses(s.survivors[2]),
                3: clearGearBonuses(s.survivors[3]),
                4: clearGearBonuses(s.survivors[4]),
              },
              removedSurvivors: s.removedSurvivors.map(survivor => clearGearBonuses(survivor)!),
              retiredSurvivors: s.retiredSurvivors.map(survivor => clearGearBonuses(survivor)!),
              deceasedSurvivors: s.deceasedSurvivors.map(survivor => clearGearBonuses(survivor)!),
            }
          })
        }))

        showNotification('All gear bonuses cleared successfully', 'success')
        setConfirmDialog(null)
      }
    })
  }

  const confirmSetMaxSurvival = () => {
    const value = parseInt(survivalLimitInputValue, 10)
    if (isNaN(value) || value < 0) {
      showNotification('Invalid value. Please enter a positive number.', 'error')
      return
    }

    setAppState(prev => ({
      ...prev,
      settlements: prev.settlements.map(s => {
        if (s.id !== prev.currentSettlementId) return s

        const updateSurvivorLimit = (survivor: SurvivorData | null) => {
          if (!survivor) return null
          return {
            ...survivor,
            survivalLimit: value,
            survival: Math.min(survivor.survival, value)
          }
        }

        return {
          ...s,
          survivors: {
            1: updateSurvivorLimit(s.survivors[1]),
            2: updateSurvivorLimit(s.survivors[2]),
            3: updateSurvivorLimit(s.survivors[3]),
            4: updateSurvivorLimit(s.survivors[4]),
          },
          removedSurvivors: s.removedSurvivors.map(survivor => updateSurvivorLimit(survivor)!),
          retiredSurvivors: s.retiredSurvivors.map(survivor => updateSurvivorLimit(survivor)!),
          deceasedSurvivors: s.deceasedSurvivors.map(survivor => updateSurvivorLimit(survivor)!),
        }
      })
    }))

    showNotification(`Max survival set to ${value} for all survivors`, 'success')
    setShowSurvivalLimitDialog(false)
    setSurvivalLimitInputValue('')
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

        // Reset current settlement to default state
        const now = Date.now()
        setAppState(prev => ({
          ...prev,
          version: CURRENT_DATA_VERSION, // Ensure version is set
          settlements: prev.settlements.map(s => {
            if (s.id !== prev.currentSettlementId) return s

            return {
              ...s,
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
        }))

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

        // Use the migration system to handle all data formats
        const migrated = migrateData(data)

        // Validate the migrated data
        if (!validateAppState(migrated)) {
          throw new Error('Imported data failed validation')
        }

        // Completely replace the state with imported data
        setAppState(migrated)
        const versionInfo = migrated.version === CURRENT_DATA_VERSION
          ? ''
          : ` (upgraded from v${data.version || 'legacy'} to v${CURRENT_DATA_VERSION})`
        showNotification(`Data imported successfully${versionInfo}`, 'success')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        showNotification(`Failed to import: ${errorMessage}`, 'error')
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

      {settlementDialog && (
        <div className="confirm-overlay" onClick={() => {
          setSettlementDialog(null)
          setSettlementInputValue('')
        }}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">
              {settlementDialog.type === 'create' ? 'Create New Settlement' : 'Rename Settlement'}
            </p>
            <input
              type="text"
              className="settlement-name-input"
              value={settlementInputValue}
              onChange={(e) => setSettlementInputValue(e.target.value)}
              placeholder="Enter settlement name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && settlementInputValue.trim()) {
                  if (settlementDialog.type === 'create') {
                    createSettlement(settlementInputValue.trim())
                    showNotification(`Settlement "${settlementInputValue.trim()}" created`, 'success')
                  } else if (settlementDialog.settlementId) {
                    renameSettlement(settlementDialog.settlementId, settlementInputValue.trim())
                  }
                  setSettlementDialog(null)
                  setSettlementInputValue('')
                } else if (e.key === 'Escape') {
                  setSettlementDialog(null)
                  setSettlementInputValue('')
                }
              }}
            />
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => {
                  setSettlementDialog(null)
                  setSettlementInputValue('')
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-ok"
                onClick={() => {
                  if (settlementInputValue.trim()) {
                    if (settlementDialog.type === 'create') {
                      createSettlement(settlementInputValue.trim())
                      showNotification(`Settlement "${settlementInputValue.trim()}" created`, 'success')
                    } else if (settlementDialog.settlementId) {
                      renameSettlement(settlementDialog.settlementId, settlementInputValue.trim())
                    }
                    setSettlementDialog(null)
                    setSettlementInputValue('')
                  }
                }}
                disabled={!settlementInputValue.trim()}
              >
                {settlementDialog.type === 'create' ? 'Create' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSurvivalLimitDialog && (
        <div className="confirm-overlay" onClick={() => {
          setShowSurvivalLimitDialog(false)
          setSurvivalLimitInputValue('')
        }}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">
              Set Max Survival for All Survivors
            </p>
            <input
              type="number"
              className="settlement-name-input"
              value={survivalLimitInputValue}
              onChange={(e) => setSurvivalLimitInputValue(e.target.value)}
              placeholder="Enter survival limit"
              autoFocus
              min="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && survivalLimitInputValue.trim()) {
                  confirmSetMaxSurvival()
                } else if (e.key === 'Escape') {
                  setShowSurvivalLimitDialog(false)
                  setSurvivalLimitInputValue('')
                }
              }}
            />
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => {
                  setShowSurvivalLimitDialog(false)
                  setSurvivalLimitInputValue('')
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-ok"
                onClick={confirmSetMaxSurvival}
                disabled={!survivalLimitInputValue.trim()}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettlementManagement && (
        <div
          className={`settlement-management-overlay ${isClosingSettlementDrawer ? 'closing' : ''}`}
          onClick={() => closeSettlementManagement()}
        >
          <div
            className={`settlement-management-drawer ${isClosingSettlementDrawer ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settlement-management-header">
              <h2>Settlement Management</h2>
              <button
                className="close-button"
                onClick={() => closeSettlementManagement()}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="settlement-management-content">
              <div className="active-settlement-section">
                <h3>Active Settlement</h3>
                {currentSettlement && (
                  <div className="settlement-card active">
                    <div className="settlement-name">{currentSettlement.name}</div>
                    <div className="settlement-actions">
                      <button
                        className="settlement-action-button"
                        onClick={() => {
                          setSettlementInputValue(currentSettlement.name)
                          setSettlementDialog({ type: 'rename', settlementId: currentSettlement.id, currentName: currentSettlement.name })
                        }}
                      >
                        Rename
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="other-settlements-section">
                <div className="section-header-row">
                  <h3>Other Settlements</h3>
                  <button
                    className="create-settlement-button"
                    onClick={() => {
                      setSettlementInputValue('')
                      setSettlementDialog({ type: 'create' })
                    }}
                  >
                    + New Settlement
                  </button>
                </div>
                {appState.settlements.filter(s => s.id !== appState.currentSettlementId).length === 0 ? (
                  <div className="empty-settlements-message">
                    No other settlements. Click "+ New Settlement" to create one.
                  </div>
                ) : (
                  <div className="settlements-grid">
                    {appState.settlements
                      .filter(s => s.id !== appState.currentSettlementId)
                      .map((settlement) => (
                        <div key={settlement.id} className="settlement-card">
                          <div className="settlement-name">{settlement.name}</div>
                          <div className="settlement-actions">
                            <button
                              className="settlement-action-button"
                              onClick={() => {
                                switchSettlement(settlement.id)
                                showNotification(`Switched to ${settlement.name}`, 'success')
                              }}
                            >
                              Switch To
                            </button>
                            <button
                              className="settlement-action-button"
                              onClick={() => {
                                setSettlementInputValue(settlement.name)
                                setSettlementDialog({ type: 'rename', settlementId: settlement.id, currentName: settlement.name })
                              }}
                            >
                              Rename
                            </button>
                            <button
                              className="settlement-action-button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${settlement.name}?`)) {
                                  deleteSettlement(settlement.id)
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
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
        </div>
      )}

      <div className="top-toolbar">
        <button
          className={`mobile-menu-button ${focusedQuadrant !== null ? 'show-in-focus' : ''}`}
          onClick={() => setShowMobileToolbar(!showMobileToolbar)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <h1 className={`mobile-title ${focusedQuadrant !== null ? 'show-in-focus' : ''}`}>KDM:SM v{APP_VERSION}</h1>
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
        <div className={`toolbar-content ${focusedQuadrant !== null ? 'hide-in-focus' : ''} ${showMobileToolbar ? 'show-mobile' : ''}`}>
          <div className="toolbar-left">
            <div className="toolbar-title-group">
              <h1 className="toolbar-title">
                KDM Settlement Manager{' '}
                <a
                  href="https://github.com/kgrimes2/kdm-settlement-manager/blob/main/CHANGELOG.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="version-link"
                  title="View changelog"
                >
                  v{APP_VERSION}
                </a>
              </h1>
            </div>
          </div>
          <div className="toolbar-center">
          <div className="settlement-selector">
            <button
              className="settlement-dropdown-button"
              onClick={() => setShowSettlementDropdown(!showSettlementDropdown)}
            >
              {currentSettlement?.name || 'No Settlement'} ▼
            </button>
            {showSettlementDropdown && (
              <div className="settlement-dropdown-menu">
                {appState.settlements.map((settlement) => (
                  <div
                    key={settlement.id}
                    className={`settlement-dropdown-item ${settlement.id === appState.currentSettlementId ? 'active' : ''}`}
                    onClick={() => {
                      switchSettlement(settlement.id)
                      setShowSettlementDropdown(false)
                    }}
                  >
                    {settlement.name}
                  </div>
                ))}
                <div className="settlement-dropdown-divider" />
                <div
                  className="settlement-dropdown-item settlement-manage"
                  onClick={() => {
                    setShowSettlementDropdown(false)
                    setShowSettlementManagement(true)
                  }}
                >
                  Manage Settlements...
                </div>
              </div>
            )}
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
          {focusedQuadrant !== null && !isMobileDevice && (
            <button
              className="return-button"
              onClick={() => setFocusedQuadrant(null)}
            >
              Return to Overview
            </button>
          )}
          <button
            className="toolbar-button"
            onClick={toggleSurvivorList}
            aria-label="Manage survivors"
          >
            Manage Survivors
          </button>
        </div>
        {focusedQuadrant !== null && !isMobileDevice && (
          <button
            className="return-to-overview-button"
            onClick={() => setFocusedQuadrant(null)}
          >
            Return to Overview
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        </div>
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

            <div className="bulk-actions-section">
              <div
                className="bulk-actions-header"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                <span>Bulk Survivor Actions</span>
                <span className="expand-icon">{showBulkActions ? '▼' : '▶'}</span>
              </div>
              {showBulkActions && (
                <div className="bulk-actions-content">
                  <button
                    className="bulk-action-button heal-wounds-button"
                    onClick={handleHealAllWounds}
                  >
                    Heal All Wounds
                  </button>
                  <button
                    className="bulk-action-button set-survival-button"
                    onClick={handleSetMaxSurvival}
                  >
                    Set Max Survival
                  </button>
                  <button
                    className="bulk-action-button clear-gear-button"
                    onClick={handleClearGearBonuses}
                  >
                    Clear All Gear Bonuses
                  </button>
                </div>
              )}
            </div>

            <div className="active-survivors-section">
              <div
                className="active-survivors-header"
                onClick={() => setShowActiveSurvivors(!showActiveSurvivors)}
              >
                <span>Active Survivors ({currentSettlement && Object.values(currentSettlement.survivors).filter(s => s !== null).length || 0})</span>
                <span className="expand-icon">{showActiveSurvivors ? '▼' : '▶'}</span>
              </div>
              {showActiveSurvivors && (
                <div className="survivor-list">
                  {currentSettlement && Object.entries(currentSettlement.survivors)
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
              )}
            </div>

            <div className="survivor-pool-section">
              <div
                className="survivor-pool-header"
                onClick={() => setShowSurvivorPool(!showSurvivorPool)}
              >
                <span>Survivor Pool ({currentSettlement?.removedSurvivors.length || 0})</span>
                <span className="expand-icon">{showSurvivorPool ? '▼' : '▶'}</span>
              </div>
              {showSurvivorPool && currentSettlement && (
                <div className="survivor-pool-list">
                  {currentSettlement.removedSurvivors.length === 0 ? (
                    <div className="empty-message">No survivors in pool</div>
                  ) : (
                    currentSettlement.removedSurvivors.map((survivor, index) => (
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
                <span>Retired Survivors ({currentSettlement?.retiredSurvivors.length || 0})</span>
                <span className="expand-icon">{showRetiredSection ? '▼' : '▶'}</span>
              </div>
              {showRetiredSection && currentSettlement && (
                <div className="retired-list">
                  {currentSettlement.retiredSurvivors.length === 0 ? (
                    <div className="empty-message">No retired survivors</div>
                  ) : (
                    currentSettlement.retiredSurvivors.map((survivor, index) => (
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
                <span>Deceased Survivors ({currentSettlement?.deceasedSurvivors.length || 0})</span>
                <span className="expand-icon">{showDeceasedSection ? '▼' : '▶'}</span>
              </div>
              {showDeceasedSection && currentSettlement && (
                <div className="deceased-list">
                  {currentSettlement.deceasedSurvivors.length === 0 ? (
                    <div className="empty-message">No deceased survivors</div>
                  ) : (
                    currentSettlement.deceasedSurvivors.map((survivor, index) => (
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
          </div>
        </div>
      )}

      <div className="container" onClick={handleContainerClick}>
        <div
          className={getQuadrantClass(1)}
          onClick={(e) => handleQuadrantClick(1, e)}
          onMouseEnter={() => handleQuadrantMouseEnter(1)}
          onMouseLeave={handleQuadrantMouseLeave}
        >
          {showHoverOverlay === 1 && (
            <div className="quadrant-hover-overlay">
              <span>Click to edit</span>
            </div>
          )}
          {currentSettlement?.survivors[1] ? (
            <SurvivorSheet
              key={`survivor-1-${focusedQuadrant}-${activeQuadrant}`}
              survivor={currentSettlement.survivors[1]}
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
          onMouseEnter={() => handleQuadrantMouseEnter(2)}
          onMouseLeave={handleQuadrantMouseLeave}
        >
          {showHoverOverlay === 2 && (
            <div className="quadrant-hover-overlay">
              <span>Click to edit</span>
            </div>
          )}
          {currentSettlement?.survivors[2] ? (
            <SurvivorSheet
              key={`survivor-2-${focusedQuadrant}-${activeQuadrant}`}
              survivor={currentSettlement.survivors[2]}
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
          onMouseEnter={() => handleQuadrantMouseEnter(3)}
          onMouseLeave={handleQuadrantMouseLeave}
        >
          {showHoverOverlay === 3 && (
            <div className="quadrant-hover-overlay">
              <span>Click to edit</span>
            </div>
          )}
          {currentSettlement?.survivors[3] ? (
            <SurvivorSheet
              key={`survivor-3-${focusedQuadrant}-${activeQuadrant}`}
              survivor={currentSettlement.survivors[3]}
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
          onMouseEnter={() => handleQuadrantMouseEnter(4)}
          onMouseLeave={handleQuadrantMouseLeave}
        >
          {showHoverOverlay === 4 && (
            <div className="quadrant-hover-overlay">
              <span>Click to edit</span>
            </div>
          )}
          {currentSettlement?.survivors[4] ? (
            <SurvivorSheet
              key={`survivor-4-${focusedQuadrant}-${activeQuadrant}`}
              survivor={currentSettlement.survivors[4]}
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

      <div className="bottom-disclaimer-banner">
        Unofficial fan-made tool. Not affiliated with Kingdom Death LLC or Adam Poots Games.
      </div>
    </div>
  )
}

export default App
