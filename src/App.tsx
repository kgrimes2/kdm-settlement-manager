import { useState, useEffect, useCallback } from 'react'
import './App.css'
import SurvivorSheet, { type SurvivorData, initialSurvivorData } from './SurvivorSheet'
import {
  type AppState,
  type SettlementData,
  type SettlementInventory,
  migrateData,
  validateAppState,
  createDefaultAppState,
  CURRENT_DATA_VERSION
} from './migrations'
import GlossaryModal from './components/GlossaryModal'
import InventoryModal from './components/InventoryModal'
import Tutorial from './components/Tutorial'
import glossaryData from './data/glossary.json'
import wikiIndex from './data/wiki-index.json'
import type { GlossaryTerm, WikiCategoryInfo } from './types/glossary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginModal from './components/LoginModal'

const APP_VERSION = '1.2.0'

type QuadrantId = 1 | 2 | 3 | 4 | null

function AppContent() {
  const { signOut, user, dataService } = useAuth()
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
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [showMobileToolbar, setShowMobileToolbar] = useState(false)
  type MarkerState = { state: 'dashed' | 'solid'; color: string; id: string }
  const [markers, setMarkers] = useState<Map<1 | 2 | 3 | 4, MarkerState[]>>(new Map())
  const [showMarkerMode, setShowMarkerMode] = useState(false)
  const [markerModeType, setMarkerModeType] = useState<'2-state' | '3-state'>('2-state')
  const [markerColor2State, setMarkerColor2State] = useState('#f97316') // default orange
  const [markerColor3State, setMarkerColor3State] = useState('#22c55e') // default green
  const [show2StateDropdown, setShow2StateDropdown] = useState(false)
  const [show3StateDropdown, setShow3StateDropdown] = useState(false)
  const [showSettlementDropdown, setShowSettlementDropdown] = useState(false)
  const [showSavesDropdown, setShowSavesDropdown] = useState(false)
  const [showSettlementManagement, setShowSettlementManagement] = useState(false)
  const [showGlossaryModal, setShowGlossaryModal] = useState(false)
   const [showInventoryModal, setShowInventoryModal] = useState(false)
   const [glossaryInitialQuery, setGlossaryInitialQuery] = useState<string | undefined>(undefined)
   const [showLoginModal, setShowLoginModal] = useState(false)
   const [mergeDialog, setMergeDialog] = useState<{ cloudData: any; localData: any; cloudSettlements: any[] } | null>(null)
  const [showTutorial, setShowTutorial] = useState(() => {
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth <= 1000
    // Don't show tutorial on mobile
    if (isMobile) return false

    const completed = localStorage.getItem('tutorial-completed')
    return completed !== APP_VERSION
  })
  const [isClosingSettlementDrawer, setIsClosingSettlementDrawer] = useState(false)
  const [settlementDialog, setSettlementDialog] = useState<{ type: 'create' | 'rename'; settlementId?: string; currentName?: string } | null>(null)
  const [settlementInputValue, setSettlementInputValue] = useState('')
  const [showSurvivalLimitDialog, setShowSurvivalLimitDialog] = useState(false)
  const [survivalLimitInputValue, setSurvivalLimitInputValue] = useState('')

  // Wiki state
  const [loadedWikiTerms, setLoadedWikiTerms] = useState<GlossaryTerm[]>([])
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set())
  const [collapsedInjuries, setCollapsedInjuries] = useState<Set<string>>(new Set())

  const toggleInjuryCollapse = (location: string) => {
    setCollapsedInjuries(prev => {
      const next = new Set(prev)
      next.has(location) ? next.delete(location) : next.add(location)
      return next
    })
  }
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null)

  const wikiCategories = (wikiIndex.categories || []) as WikiCategoryInfo[]
  const termsBySlug = (wikiIndex.termsBySlug || {}) as Record<string, string[]>

  const handleLoadCategory = useCallback(async (slug: string) => {
    if (loadedCategories.has(slug)) return
    setLoadingCategory(slug)
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}wiki/${slug}.json`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const terms = data.terms || []
      setLoadedWikiTerms(prev => [...prev, ...terms])
      setLoadedCategories(prev => new Set(prev).add(slug))
    } catch (error) {
      console.error(`Failed to load wiki category "${slug}":`, error)
    } finally {
      setLoadingCategory(null)
    }
  }, [loadedCategories])

  // Search the wiki index for a query and auto-load matching categories
  const searchAndLoadWikiTerms = useCallback(async (query: string) => {
    if (!query.trim()) return
    const q = query.toLowerCase().trim()
    const slugsToLoad = new Set<string>()
    for (const [slug, terms] of Object.entries(termsBySlug)) {
      if (loadedCategories.has(slug)) continue
      for (const term of terms) {
        const termLower = term.toLowerCase()
        const baseTerm = termLower.replace(/\s*\(.*?\)\s*$/, '')
        if (baseTerm === q || baseTerm.startsWith(q) || termLower.startsWith(q) || termLower.includes(q)) {
          slugsToLoad.add(slug)
          break
        }
      }
    }
    for (const slug of slugsToLoad) {
      await handleLoadCategory(slug)
    }
  }, [termsBySlug, loadedCategories, handleLoadCategory])

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

  // Reset scroll position when mobile keyboard dismisses
  useEffect(() => {
    if (!isMobileDevice) return
    const viewport = window.visualViewport
    if (!viewport) return

    let keyboardOpen = false
    const onResize = () => {
      const isOpen = viewport.height < window.innerHeight * 0.75
      if (keyboardOpen && !isOpen) {
        window.scrollTo(0, 0)
      }
      keyboardOpen = isOpen
    }

    viewport.addEventListener('resize', onResize)
    return () => viewport.removeEventListener('resize', onResize)
  }, [isMobileDevice])

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
      } else if (e.key === ' ' && focusedQuadrant !== null && !showTutorial) {
        e.preventDefault()
        handleNextQuadrant()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedQuadrant, showSurvivorList, showSettlementManagement, activeQuadrant, showTutorial])

  // Check for cloud data after user logs in
  useEffect(() => {
    if (!user || !dataService) return

    const checkCloudData = async () => {
      try {
        const cloudData = await dataService.getAllUserData()
        if (cloudData && cloudData.length > 0) {
          // There's cloud data - show merge dialog
          setMergeDialog({
            cloudData: cloudData,
            localData: appState,
            cloudSettlements: cloudData.map((d: any) => d.settlements || []).flat()
          })
        }
      } catch (error) {
        console.error('Error checking cloud data:', error)
        // Silently fail - user can still use local data
      }
    }

    checkCloudData()
  }, [user, dataService])

  // Handle swipe gestures on mobile for cycling survivors in focus mode
  useEffect(() => {
    if (!isMobileDevice || focusedQuadrant === null) return

    let touchStartX = 0
    let touchStartY = 0
    let touchEndX = 0
    let touchEndY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX
      touchStartY = e.changedTouches[0].screenY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX
      touchEndY = e.changedTouches[0].screenY
      handleSwipe()
    }

    const handleSwipe = () => {
      const deltaX = touchEndX - touchStartX
      const deltaY = touchEndY - touchStartY

      // Only trigger if horizontal swipe is more significant than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // Swipe right - go to previous
          handlePreviousQuadrant()
        } else {
          // Swipe left - go to next
          handleNextQuadrant()
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobileDevice, focusedQuadrant])

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

  // Close saves dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.saves-selector')) {
        setShowSavesDropdown(false)
      }
    }

    if (showSavesDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSavesDropdown])

  // Close marker dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.marker-button-group')) {
        setShow2StateDropdown(false)
        setShow3StateDropdown(false)
      }
    }

    if (show2StateDropdown || show3StateDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [show2StateDropdown, show3StateDropdown])

  const addMarker = (quadrant: 1 | 2 | 3 | 4, e: React.MouseEvent) => {
    e.stopPropagation()
    setMarkers(prev => {
      const newMarkers = new Map(prev)
      const existingMarkers = newMarkers.get(quadrant) || []
      const color = markerModeType === '2-state' ? markerColor2State : markerColor3State
      const id = `${quadrant}-${Date.now()}`

      const newMarker: MarkerState = markerModeType === '2-state'
        ? { state: 'solid', color, id }
        : { state: 'dashed', color, id }

      newMarkers.set(quadrant, [...existingMarkers, newMarker])
      setShowMarkerMode(false)
      return newMarkers
    })
  }

  const toggleMarker = (quadrant: 1 | 2 | 3 | 4, markerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setMarkers(prev => {
      const newMarkers = new Map(prev)
      const existingMarkers = newMarkers.get(quadrant) || []

      const updatedMarkers = existingMarkers.map(marker => {
        if (marker.id !== markerId) return marker

        // Cycle through states
        if (marker.state === 'dashed') {
          return { ...marker, state: 'solid' as const }
        } else {
          // Remove marker by filtering it out
          return null
        }
      }).filter((m): m is MarkerState => m !== null)

      if (updatedMarkers.length === 0) {
        newMarkers.delete(quadrant)
      } else {
        newMarkers.set(quadrant, updatedMarkers)
      }

      return newMarkers
    })
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
      deceasedSurvivors: [],
      inventory: { gear: {}, materials: {} }
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

  const handleOpenGlossary = (searchTerm?: string) => {
    setGlossaryInitialQuery(searchTerm)
    setShowGlossaryModal(true)
  }

  const handleUpdateInventory = (inventory: SettlementInventory) => {
    setAppState(prev => ({
      ...prev,
      settlements: prev.settlements.map(s =>
        s.id === prev.currentSettlementId
          ? { ...s, inventory }
          : s
      )
    }))
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
    // Clear marker for this quadrant
    setMarkers(prev => {
      const newMarkers = new Map(prev)
      newMarkers.delete(quadrant)
      return newMarkers
    })

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

  const handleRetireFocused = () => {
    if (focusedQuadrant === null) return
    const settlement = getCurrentSettlement()
    if (!settlement) return

    const survivor = settlement.survivors[focusedQuadrant]
    if (!survivor) return

    const survivorName = survivor.name || 'this survivor'
    const quadrant = focusedQuadrant

    setConfirmDialog({
      message: `Are you sure you want to retire ${survivorName}? This action is permanent and cannot be undone.`,
      onConfirm: () => {
        setMarkers(prev => {
          const newMarkers = new Map(prev)
          newMarkers.delete(quadrant)
          return newMarkers
        })

        setAppState(prev => ({
          ...prev,
          settlements: prev.settlements.map(s => {
            if (s.id !== prev.currentSettlementId) return s

            const surv = s.survivors[quadrant]
            if (!surv) return s

            return {
              ...s,
              survivors: {
                ...s.survivors,
                [quadrant]: null
              },
              retiredSurvivors: [...s.retiredSurvivors, surv]
            }
          })
        }))
        setFocusedQuadrant(null)
        showNotification(`${survivorName} retired`, 'success')
        setConfirmDialog(null)
      }
    })
  }

  const handleDeceasedFocused = () => {
    if (focusedQuadrant === null) return
    const settlement = getCurrentSettlement()
    if (!settlement) return

    const survivor = settlement.survivors[focusedQuadrant]
    if (!survivor) return

    const survivorName = survivor.name || 'this survivor'
    const quadrant = focusedQuadrant

    setConfirmDialog({
      message: `Are you sure you want to mark ${survivorName} as deceased? This action is permanent and cannot be undone.`,
      onConfirm: () => {
        setMarkers(prev => {
          const newMarkers = new Map(prev)
          newMarkers.delete(quadrant)
          return newMarkers
        })

        setAppState(prev => ({
          ...prev,
          settlements: prev.settlements.map(s => {
            if (s.id !== prev.currentSettlementId) return s

            const surv = s.survivors[quadrant]
            if (!surv) return s

            return {
              ...s,
              survivors: {
                ...s.survivors,
                [quadrant]: null
              },
              deceasedSurvivors: [...s.deceasedSurvivors, surv]
            }
          })
        }))
        setFocusedQuadrant(null)
        showNotification(`${survivorName} marked as deceased`, 'success')
        setConfirmDialog(null)
      }
    })
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

  const getQuadrantClass = (quadrant: QuadrantId) => {
    const baseClass = `quadrant quadrant-${quadrant}`
    const isActive = activeQuadrant === quadrant ? 'active-mobile' : 'inactive-mobile'
    if (focusedQuadrant === null) return `${baseClass} ${isActive}`
    if (focusedQuadrant === quadrant) return `${baseClass} focused`
    return `${baseClass} unfocused`
  }

  // Render app always, with optional login modal overlay
  return (
    <>
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

      {mergeDialog && (
        <div className="confirm-overlay" onClick={() => setMergeDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'left' }}>
            <p className="confirm-message">Data Conflict Detected</p>
            <div style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              <p>You have data saved in both the cloud and locally. Choose which version to keep:</p>
              <ul style={{ marginLeft: '16px', marginTop: '8px' }}>
                <li><strong>Cloud data:</strong> {mergeDialog.cloudSettlements.length} settlements from your account</li>
                <li><strong>Local data:</strong> {mergeDialog.localData.settlements?.length || 0} settlements on this device</li>
              </ul>
              <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#3a3230' }}>
                Note: The data you don't choose will be replaced.
              </p>
            </div>
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => {
                  setMergeDialog(null)
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-ok"
                onClick={async () => {
                  // Keep local data, overwrite cloud
                  try {
                    if (dataService && mergeDialog.localData.settlements) {
                      for (const settlement of mergeDialog.localData.settlements) {
                        await dataService.saveUserData(settlement.id, {
                          survivors: mergeDialog.localData.survivors || [],
                          settlements: [settlement],
                          inventory: mergeDialog.localData.inventory || {},
                        })
                      }
                      showNotification('Local data uploaded to cloud', 'success')
                    }
                  } catch (error) {
                    showNotification('Failed to sync local data', 'error')
                    console.error(error)
                  }
                  setMergeDialog(null)
                }}
              >
                Keep Local
              </button>
              <button
                className="confirm-ok"
                style={{ marginLeft: '8px' }}
                onClick={async () => {
                  // Use cloud data, overwrite local
                  try {
                    if (mergeDialog.cloudData && mergeDialog.cloudData.length > 0) {
                      // Merge all cloud data into a single app state
                      const mergedSettlements = mergeDialog.cloudData.map((d: any) => d.settlements || []).flat()
                      const mergedSurvivors = mergeDialog.cloudData.map((d: any) => d.survivors || []).flat()
                      const mergedInventory = Object.assign({}, ...mergeDialog.cloudData.map((d: any) => d.inventory || {}))
                      
                      const newAppState = {
                        ...appState,
                        settlements: mergedSettlements,
                        survivors: mergedSurvivors,
                        inventory: mergedInventory,
                      }
                      setAppState(newAppState)
                      localStorage.setItem('kdm-app-state', JSON.stringify(newAppState))
                      showNotification('Cloud data loaded locally', 'success')
                    }
                  } catch (error) {
                    showNotification('Failed to load cloud data', 'error')
                    console.error(error)
                  }
                  setMergeDialog(null)
                }}
              >
                Use Cloud
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

              <div className="tutorial-section">
                <button
                  className="tutorial-management-button"
                  onClick={() => {
                    closeSettlementManagement()
                    setShowTutorial(true)
                  }}
                >
                  🎓 Tutorial
                </button>
              </div>

              <div className="feedback-section">
                <a
                  href="https://forms.gle/sggPzN1GuNeVVkjL8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="feedback-button"
                >
                  Send Feedback
                </a>
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
          <div className={`marker-button-group ${showMarkerMode && markerModeType === '2-state' ? 'active' : ''}`}>
            <button
              className="marker-mode-button"
              onClick={() => {
                setMarkerModeType('2-state')
                setShowMarkerMode(!showMarkerMode || markerModeType !== '2-state')
                setShow2StateDropdown(false)
              }}
              aria-label="Toggle 2-State Marker Mode"
              title="Add Marker (2-state)"
            >
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  fill={markerColor2State}
                  stroke={markerColor2State}
                  strokeWidth="3"
                />
              </svg>
            </button>
            <button
              className="marker-dropdown-arrow"
              onClick={(e) => {
                e.stopPropagation()
                setShow2StateDropdown(!show2StateDropdown)
                setShow3StateDropdown(false)
              }}
              aria-label="Select Marker Color"
            >
              ▼
            </button>
            {show2StateDropdown && (
              <div className="marker-color-dropdown">
                {[
                  '#22c55e',
                  '#ef4444',
                  '#3b82f6',
                  '#eab308',
                  '#8b5cf6',
                  '#f97316',
                ].map((color) => (
                  <div
                    key={color}
                    className="marker-color-option"
                    onClick={() => {
                      setMarkerColor2State(color)
                      setShow2StateDropdown(false)
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill={color}
                        stroke={color}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`marker-button-group ${showMarkerMode && markerModeType === '3-state' ? 'active' : ''}`}>
            <button
              className="marker-legend-button"
              onClick={() => {
                setMarkerModeType('3-state')
                setShowMarkerMode(!showMarkerMode || markerModeType !== '3-state')
                setShow3StateDropdown(false)
              }}
              aria-label="Toggle 3-State Marker Mode"
              title="Add Progressive Marker (3-state)"
            >
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  fill="transparent"
                  stroke={markerColor3State}
                  strokeWidth="3"
                  strokeDasharray="12 6"
                />
              </svg>
              <span className="arrow">→</span>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  fill={markerColor3State}
                  stroke={markerColor3State}
                  strokeWidth="3"
                />
              </svg>
            </button>
            <button
              className="marker-dropdown-arrow"
              onClick={(e) => {
                e.stopPropagation()
                setShow3StateDropdown(!show3StateDropdown)
                setShow2StateDropdown(false)
              }}
              aria-label="Select Marker Color"
            >
              ▼
            </button>
            {show3StateDropdown && (
              <div className="marker-color-dropdown">
                {[
                  '#22c55e',
                  '#ef4444',
                  '#3b82f6',
                  '#eab308',
                  '#8b5cf6',
                  '#f97316',
                ].map((color) => (
                  <div
                    key={color}
                    className="marker-color-option"
                    onClick={() => {
                      setMarkerColor3State(color)
                      setShow3StateDropdown(false)
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeDasharray="10 5"
                      />
                    </svg>
                    <span className="arrow">→</span>
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill={color}
                        stroke={color}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
          <div className="toolbar-right">
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
          <button
            className="toolbar-button toolbar-icon-button glossary-button"
            onClick={() => handleOpenGlossary()}
            aria-label="Glossary"
            title="Glossary"
          >
            📖
          </button>
           <button
             className="toolbar-button toolbar-icon-button"
             onClick={() => setShowInventoryModal(true)}
             aria-label="Inventory"
             title="Settlement Inventory"
           >
             🎒
            </button>
            {user && (
              <div className="user-profile" title={`Logged in as: ${user.username}`}>
                <span className="user-icon">👤</span>
                <span className="user-name">{user.username}</span>
              </div>
            )}
            {user ? (
              <button
                className="toolbar-button logout-button"
                onClick={async () => {
                  try {
                    await signOut()
                    location.reload()
                  } catch (error) {
                    console.error('Logout error:', error)
                    // Force reload anyway
                    location.reload()
                  }
                }}
                title="Logout"
              >
                🚪 Logout
              </button>
            ) : (
              <button
                className="toolbar-button login-button"
                onClick={() => setShowLoginModal(true)}
                title="Login or Sign Up"
              >
                 🔐 Login to Save
              </button>
            )}
          {focusedQuadrant !== null && !isMobileDevice && (
            <button
              className="return-button"
              onClick={() => setFocusedQuadrant(null)}
            >
              ↩️ Return to Overview
            </button>
          )}
          <button
            className="toolbar-button toolbar-icon-button"
            onClick={toggleSurvivorList}
            aria-label="Manage Survivors"
            title="Manage Survivors"
          >
            👥
          </button>
        </div>
        {focusedQuadrant !== null && (
          <div className="focus-mode-actions">
            <button className="toolbar-button retire-focus-button" onClick={handleRetireFocused}>Retire</button>
            <button className="toolbar-button deceased-focus-button" onClick={handleDeceasedFocused}>Deceased</button>
            {!isMobileDevice && (
              <button
                className="return-to-overview-button"
                onClick={() => setFocusedQuadrant(null)}
              >
                ↩️ Return to Overview
              </button>
            )}
          </div>
        )}
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
              <h2>{currentSettlement?.name || 'Settlement'} Survivors</h2>
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
        {focusedQuadrant !== null && !isMobileDevice && currentSettlement?.survivors[focusedQuadrant] && (() => {
          const focusedSurvivor = currentSettlement.survivors[focusedQuadrant]!
          return (
          <div className="focus-container">
            <div className="focused-main-sheet">
              <SurvivorSheet
                key={`survivor-${focusedQuadrant}-focused`}
                survivor={focusedSurvivor}
                onUpdate={(survivor) => updateSurvivor(focusedQuadrant, survivor)}
                onOpenGlossary={handleOpenGlossary}
                glossaryTerms={glossaryData.terms}
              />
            </div>
            <div className="secondary-sheet">
              <div className="auxiliary-notes-section">
                <h3>Notes</h3>
                <textarea
                  className="auxiliary-notes-textarea"
                  value={focusedSurvivor.auxiliaryNotes}
                  onChange={(e) => {
                    updateSurvivor(focusedQuadrant, {
                      ...focusedSurvivor,
                      auxiliaryNotes: e.target.value
                    })
                  }}
                  placeholder="Add notes about this survivor..."
                />
              </div>
              <div className="permanent-injuries-section">
                <h3>Permanent Severe Injuries</h3>
                <div className="injury-legend">
                  <span className="legend-item">
                    <span className="legend-box red-legend"></span>
                    Red background = Retired
                  </span>
                </div>
                {(['head', 'arms', 'body', 'waist', 'legs'] as const).map((location) => (
                  <div key={location} className="injury-location-group">
                    <div
                      className="injury-location-header"
                      onClick={() => toggleInjuryCollapse(location)}
                    >
                      <h4>{location.charAt(0).toUpperCase() + location.slice(1)}</h4>
                      <span className="expand-icon">{collapsedInjuries.has(location) ? '▶' : '▼'}</span>
                    </div>
                    {!collapsedInjuries.has(location) && (
                      focusedSurvivor.permanentInjuries[location].length === 0 ? (
                        <div className="no-injuries">No injuries</div>
                      ) : (
                        focusedSurvivor.permanentInjuries[location].map((injury, injuryIndex) => (
                          <div key={injuryIndex} className="injury-item">
                            <span className="injury-name">{injury.name}</span>
                            <div className="injury-checkboxes">
                              {injury.checkboxes.map((checked, checkboxIndex) => {
                                const isLastCheckbox = checkboxIndex === injury.checkboxes.length - 1
                                const isRedCheckbox = isLastCheckbox && (injury.name === 'Blind' || injury.name === 'Dismembered Leg')
                                return (
                                  <label key={checkboxIndex} className={`injury-checkbox ${isRedCheckbox ? 'red-checkbox' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const newInjuries = [...focusedSurvivor.permanentInjuries[location]]
                                        newInjuries[injuryIndex] = {
                                          ...newInjuries[injuryIndex],
                                          checkboxes: newInjuries[injuryIndex].checkboxes.map((cb, i) =>
                                            i === checkboxIndex ? !cb : cb
                                          )
                                        }
                                        updateSurvivor(focusedQuadrant, {
                                          ...focusedSurvivor,
                                          permanentInjuries: {
                                            ...focusedSurvivor.permanentInjuries,
                                            [location]: newInjuries
                                          }
                                        })
                                    }}
                                  />
                                </label>
                              )
                              })}
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          )
        })()}
        <div
          className={getQuadrantClass(1)}
          onClick={(e) => handleQuadrantClick(1, e)}
        >
          {showMarkerMode && currentSettlement?.survivors[1] && (
            <div className="marker-overlay" onClick={(e) => addMarker(1, e)}>
              <div className="marker-add-icon">+</div>
            </div>
          )}
          {markers.has(1) && (() => {
            const markerList = markers.get(1)!
            const count = markerList.length

            // Calculate scale based on count
            let scale = 1
            if (count > 8) scale = 0.6
            else if (count > 4) scale = 0.8

            // Calculate grid layout
            const maxPerRow = 4
            const rows = Math.ceil(count / maxPerRow)
            const spacing = 140 * scale

            return markerList.map((marker, index) => {
              const row = Math.floor(index / maxPerRow)
              const col = index % maxPerRow
              const itemsInRow = Math.min(maxPerRow, count - row * maxPerRow)
              const rowStartOffset = -(itemsInRow - 1) * spacing / 2
              const verticalOffset = (row - (rows - 1) / 2) * spacing

              return (
                <svg
                  key={marker.id}
                  className={`marker-indicator ${marker.state === 'solid' ? 'marker-solid' : ''}`}
                  onClick={(e) => toggleMarker(1, marker.id, e)}
                  viewBox="0 0 120 120"
                  style={{
                    left: `calc(50% + ${rowStartOffset + col * spacing}px)`,
                    top: `calc(50% + ${verticalOffset}px)`,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                  }}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill={marker.state === 'solid' ? marker.color : 'transparent'}
                    stroke={marker.color}
                    strokeWidth={marker.state === 'solid' ? '8' : '12'}
                    strokeDasharray={marker.state === 'solid' ? '0' : '40 20'}
                  />
                </svg>
              )
            })
          })()}
          {currentSettlement?.survivors[1] ? (
            <SurvivorSheet
              key={`survivor-1-${focusedQuadrant}-${activeQuadrant}`}
              survivor={currentSettlement.survivors[1]}
              onUpdate={(survivor) => updateSurvivor(1, survivor)}
              onOpenGlossary={handleOpenGlossary}
              glossaryTerms={glossaryData.terms}
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
          {showMarkerMode && currentSettlement?.survivors[2] && (
            <div className="marker-overlay" onClick={(e) => addMarker(2, e)}>
              <div className="marker-add-icon">+</div>
            </div>
          )}
          {markers.has(2) && (() => {
            const markerList = markers.get(2)!
            const count = markerList.length

            let scale = 1
            if (count > 8) scale = 0.6
            else if (count > 4) scale = 0.8

            const maxPerRow = 4
            const rows = Math.ceil(count / maxPerRow)
            const spacing = 140 * scale

            return markerList.map((marker, index) => {
              const row = Math.floor(index / maxPerRow)
              const col = index % maxPerRow
              const itemsInRow = Math.min(maxPerRow, count - row * maxPerRow)
              const rowStartOffset = -(itemsInRow - 1) * spacing / 2
              const verticalOffset = (row - (rows - 1) / 2) * spacing

              return (
                <svg
                  key={marker.id}
                  className={`marker-indicator ${marker.state === 'solid' ? 'marker-solid' : ''}`}
                  onClick={(e) => toggleMarker(2, marker.id, e)}
                  viewBox="0 0 120 120"
                  style={{
                    left: `calc(50% + ${rowStartOffset + col * spacing}px)`,
                    top: `calc(50% + ${verticalOffset}px)`,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                  }}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill={marker.state === 'solid' ? marker.color : 'transparent'}
                    stroke={marker.color}
                    strokeWidth={marker.state === 'solid' ? '8' : '12'}
                    strokeDasharray={marker.state === 'solid' ? '0' : '40 20'}
                  />
                </svg>
              )
            })
          })()}
          {currentSettlement?.survivors[2] ? (
            <SurvivorSheet
              key={`survivor-2-${focusedQuadrant}-${activeQuadrant}`}
              survivor={currentSettlement.survivors[2]}
              onUpdate={(survivor) => updateSurvivor(2, survivor)}
              onOpenGlossary={handleOpenGlossary}
              glossaryTerms={glossaryData.terms}
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
          {showMarkerMode && currentSettlement?.survivors[3] && (
            <div className="marker-overlay" onClick={(e) => addMarker(3, e)}>
              <div className="marker-add-icon">+</div>
            </div>
          )}
          {markers.has(3) && (() => {
            const markerList = markers.get(3)!
            const count = markerList.length

            let scale = 1
            if (count > 8) scale = 0.6
            else if (count > 4) scale = 0.8

            const maxPerRow = 4
            const rows = Math.ceil(count / maxPerRow)
            const spacing = 140 * scale

            return markerList.map((marker, index) => {
              const row = Math.floor(index / maxPerRow)
              const col = index % maxPerRow
              const itemsInRow = Math.min(maxPerRow, count - row * maxPerRow)
              const rowStartOffset = -(itemsInRow - 1) * spacing / 2
              const verticalOffset = (row - (rows - 1) / 2) * spacing

              return (
                <svg
                  key={marker.id}
                  className={`marker-indicator ${marker.state === 'solid' ? 'marker-solid' : ''}`}
                  onClick={(e) => toggleMarker(3, marker.id, e)}
                  viewBox="0 0 120 120"
                  style={{
                    left: `calc(50% + ${rowStartOffset + col * spacing}px)`,
                    top: `calc(50% + ${verticalOffset}px)`,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                  }}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill={marker.state === 'solid' ? marker.color : 'transparent'}
                    stroke={marker.color}
                    strokeWidth={marker.state === 'solid' ? '8' : '12'}
                    strokeDasharray={marker.state === 'solid' ? '0' : '40 20'}
                  />
                </svg>
              )
            })
          })()}
          {currentSettlement?.survivors[3] ? (
            <SurvivorSheet
              key={`survivor-3-${focusedQuadrant}-${activeQuadrant}`}
              survivor={currentSettlement.survivors[3]}
              onUpdate={(survivor) => updateSurvivor(3, survivor)}
              onOpenGlossary={handleOpenGlossary}
              glossaryTerms={glossaryData.terms}
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
          {showMarkerMode && currentSettlement?.survivors[4] && (
            <div className="marker-overlay" onClick={(e) => addMarker(4, e)}>
              <div className="marker-add-icon">+</div>
            </div>
          )}
          {markers.has(4) && (() => {
            const markerList = markers.get(4)!
            const count = markerList.length

            let scale = 1
            if (count > 8) scale = 0.6
            else if (count > 4) scale = 0.8

            const maxPerRow = 4
            const rows = Math.ceil(count / maxPerRow)
            const spacing = 140 * scale

            return markerList.map((marker, index) => {
              const row = Math.floor(index / maxPerRow)
              const col = index % maxPerRow
              const itemsInRow = Math.min(maxPerRow, count - row * maxPerRow)
              const rowStartOffset = -(itemsInRow - 1) * spacing / 2
              const verticalOffset = (row - (rows - 1) / 2) * spacing

              return (
                <svg
                  key={marker.id}
                  className={`marker-indicator ${marker.state === 'solid' ? 'marker-solid' : ''}`}
                  onClick={(e) => toggleMarker(4, marker.id, e)}
                  viewBox="0 0 120 120"
                  style={{
                    left: `calc(50% + ${rowStartOffset + col * spacing}px)`,
                    top: `calc(50% + ${verticalOffset}px)`,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                  }}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill={marker.state === 'solid' ? marker.color : 'transparent'}
                    stroke={marker.color}
                    strokeWidth={marker.state === 'solid' ? '8' : '12'}
                    strokeDasharray={marker.state === 'solid' ? '0' : '40 20'}
                  />
                </svg>
              )
            })
          })()}
          {currentSettlement?.survivors[4] ? (
            <SurvivorSheet
              key={`survivor-4-${focusedQuadrant}-${activeQuadrant}`}
              survivor={currentSettlement.survivors[4]}
              onUpdate={(survivor) => updateSurvivor(4, survivor)}
              onOpenGlossary={handleOpenGlossary}
              glossaryTerms={glossaryData.terms}
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

      {focusedQuadrant !== null && isMobileDevice && currentSettlement?.survivors[focusedQuadrant] && (() => {
        const focusedSurvivor = currentSettlement.survivors[focusedQuadrant]!
        return (
          <div className="mobile-secondary-sheet">
            <div className="auxiliary-notes-section">
              <h3>Notes</h3>
              <textarea
                className="auxiliary-notes-textarea"
                value={focusedSurvivor.auxiliaryNotes}
                onChange={(e) => {
                  updateSurvivor(focusedQuadrant, {
                    ...focusedSurvivor,
                    auxiliaryNotes: e.target.value
                  })
                }}
                placeholder="Add notes about this survivor..."
              />
            </div>
            <div className="permanent-injuries-section">
              <h3>Permanent Severe Injuries</h3>
              <div className="injury-legend">
                <span className="legend-item">
                  <span className="legend-box red-legend"></span>
                  Red background = Retired
                </span>
              </div>
              {(['head', 'arms', 'body', 'waist', 'legs'] as const).map((location) => (
                <div key={location} className="injury-location-group">
                  <div
                    className="injury-location-header"
                    onClick={() => toggleInjuryCollapse(location)}
                  >
                    <h4>{location.charAt(0).toUpperCase() + location.slice(1)}</h4>
                    <span className="expand-icon">{collapsedInjuries.has(location) ? '▶' : '▼'}</span>
                  </div>
                  {!collapsedInjuries.has(location) && (
                    focusedSurvivor.permanentInjuries[location].length === 0 ? (
                      <div className="no-injuries">No injuries</div>
                    ) : (
                      focusedSurvivor.permanentInjuries[location].map((injury, injuryIndex) => (
                        <div key={injuryIndex} className="injury-item">
                          <span className="injury-name">{injury.name}</span>
                          <div className="injury-checkboxes">
                            {injury.checkboxes.map((checked, checkboxIndex) => {
                              const isLastCheckbox = checkboxIndex === injury.checkboxes.length - 1
                              const isRedCheckbox = isLastCheckbox && (injury.name === 'Blind' || injury.name === 'Dismembered Leg')
                              return (
                                <label key={checkboxIndex} className={`injury-checkbox ${isRedCheckbox ? 'red-checkbox' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const newInjuries = [...focusedSurvivor.permanentInjuries[location]]
                                      newInjuries[injuryIndex] = {
                                        ...newInjuries[injuryIndex],
                                        checkboxes: newInjuries[injuryIndex].checkboxes.map((cb, i) =>
                                          i === checkboxIndex ? !cb : cb
                                        )
                                      }
                                      updateSurvivor(focusedQuadrant, {
                                        ...focusedSurvivor,
                                        permanentInjuries: {
                                          ...focusedSurvivor.permanentInjuries,
                                          [location]: newInjuries
                                        }
                                      })
                                    }}
                                  />
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      <div className="bottom-disclaimer-banner">
        Unofficial fan-made tool. Not affiliated with Kingdom Death LLC or Adam Poots Games.
      </div>

      <GlossaryModal
        isOpen={showGlossaryModal}
        onClose={() => {
          setShowGlossaryModal(false)
          setGlossaryInitialQuery(undefined)
        }}
        glossaryTerms={glossaryData.terms}
        initialQuery={glossaryInitialQuery}
        lastUpdated={glossaryData.lastUpdated}
        wikiCategories={wikiCategories}
        loadedWikiTerms={loadedWikiTerms}
        onLoadCategory={handleLoadCategory}
        loadingCategory={loadingCategory}
        onSearchWiki={searchAndLoadWikiTerms}
      />

      <InventoryModal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        settlementName={currentSettlement?.name || 'Settlement'}
        inventory={currentSettlement?.inventory || { gear: {}, materials: {} }}
        onUpdateInventory={handleUpdateInventory}
        glossaryTerms={glossaryData.terms}
        loadedWikiTerms={loadedWikiTerms}
        onSearchWiki={searchAndLoadWikiTerms}
        onLoadCategory={handleLoadCategory}
      />

      {!isMobileDevice && (
        <Tutorial
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          appVersion={APP_VERSION}
        />
      )}
    </div>
    <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  )
}

function App() {
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || ''
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || ''
  const region = import.meta.env.VITE_COGNITO_REGION || 'us-west-2'
  const apiBaseUrl = import.meta.env.VITE_API_GATEWAY_URL || ''

  if (!userPoolId || !clientId || !apiBaseUrl) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', marginTop: '100px' }}>
        <h2>Configuration Error</h2>
        <p>Missing required environment variables. Please create .env.local with:</p>
        <pre style={{ textAlign: 'left', display: 'inline-block', background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
VITE_COGNITO_USER_POOL_ID=your_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id
VITE_COGNITO_REGION=us-west-2
VITE_API_GATEWAY_URL=your_api_url
        </pre>
      </div>
    )
  }

  return (
    <AuthProvider userPoolId={userPoolId} clientId={clientId} region={region} apiBaseUrl={apiBaseUrl}>
      <AppContent />
    </AuthProvider>
  )
}

export default App
