import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock URL.createObjectURL and URL.revokeObjectURL for export tests
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('Initial Render', () => {
    it('renders the app with default survivors', () => {
      render(<App />)
      expect(screen.getByText(/KDM Settlement Manager/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue('Allister')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Erza')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Lucy')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Zachary')).toBeInTheDocument()
    })

    it('renders toolbar buttons', () => {
      render(<App />)
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
    })
  })

  describe('LocalStorage Persistence', () => {
    it('saves state to localStorage when survivors are updated', async () => {
      const user = userEvent.setup()
      render(<App />)

      const nameInput = screen.getByDisplayValue('Allister')
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')

      // Wait for debounced save (1000ms + buffer)
      await waitFor(() => {
        const savedState = localStorage.getItem('kdm-app-state')
        expect(savedState).toBeTruthy()
        const parsed = JSON.parse(savedState!)
        expect(parsed.settlements[0].survivors[1].name).toContain('N')
      }, { timeout: 2000 })
    })

    it('loads state from localStorage on mount', () => {
      const mockSurvivor = {
        name: 'Saved Hero',
        gender: 'M',
        createdAt: new Date().toISOString(),
        huntXP: Array(15).fill(false),
        survival: 0,
        survivalLimit: 0,
        cannotSpendSurvival: false,
        survivalAbilities: { dodge: false, encourage: false, surge: false, dash: false, endure: false },
        stats: { movement: 5, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        gearBonuses: { movement: 0, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        insanity: 0,
        brainArmor: 0,
        insane: false,
        bodyLocations: {
          head: { armor: 0, light: false, heavy: false },
          arms: { armor: 0, light: false, heavy: false },
          body: { armor: 0, light: false, heavy: false },
          waist: { armor: 0, light: false, heavy: false },
          legs: { armor: 0, light: false, heavy: false },
        },
        weaponProficiency: { type: '', level: Array(8).fill(false) },
        courage: Array(9).fill(false),
        courageMilestone: null,
        understanding: Array(9).fill(false),
        understandingMilestone: null,
        fightingArts: [''],
        disorders: [''],
        abilitiesImpairments: ['', ''],
        oncePerLifetime: [''],
        retired: false,
        skipNextHunt: false,
        cannotUseFightingArts: false,
        rerollUsed: false,
      }

      const mockState = {
        survivors: { 1: mockSurvivor, 2: null, 3: null, 4: null },
        removedSurvivors: [],
        retiredSurvivors: [],
        deceasedSurvivors: []
      }
      localStorage.setItem('kdm-app-state', JSON.stringify(mockState))

      render(<App />)
      expect(screen.getByDisplayValue('Saved Hero')).toBeInTheDocument()
    })

    it('uses default state if localStorage is empty', () => {
      render(<App />)
      expect(screen.getByDisplayValue('Allister')).toBeInTheDocument()
    })

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('kdm-app-state', 'invalid json')

      render(<App />)
      // Should fall back to default state
      expect(screen.getByDisplayValue('Allister')).toBeInTheDocument()
    })
  })

  describe('Export/Import Functionality', () => {
    it('exports data when export button is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      const exportBtn = screen.getByRole('button', { name: /export/i })
      await user.click(exportBtn)

      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    })

    it('imports valid JSON data', async () => {
      const user = userEvent.setup()
      render(<App />)

      const mockSurvivor = {
        name: 'Imported Hero',
        gender: 'F',
        createdAt: new Date().toISOString(),
        huntXP: Array(15).fill(false),
        survival: 0,
        survivalLimit: 0,
        cannotSpendSurvival: false,
        survivalAbilities: { dodge: false, encourage: false, surge: false, dash: false, endure: false },
        stats: { movement: 5, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        gearBonuses: { movement: 0, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        insanity: 0,
        brainArmor: 0,
        insane: false,
        bodyLocations: {
          head: { armor: 0, light: false, heavy: false },
          arms: { armor: 0, light: false, heavy: false },
          body: { armor: 0, light: false, heavy: false },
          waist: { armor: 0, light: false, heavy: false },
          legs: { armor: 0, light: false, heavy: false },
        },
        weaponProficiency: { type: '', level: Array(8).fill(false) },
        courage: Array(9).fill(false),
        courageMilestone: null,
        understanding: Array(9).fill(false),
        understandingMilestone: null,
        fightingArts: [''],
        disorders: [''],
        abilitiesImpairments: ['', ''],
        oncePerLifetime: [''],
        retired: false,
        skipNextHunt: false,
        cannotUseFightingArts: false,
        rerollUsed: false,
      }

      const mockData = {
        survivors: { 1: mockSurvivor, 2: null, 3: null, 4: null },
        removedSurvivors: [],
        retiredSurvivors: [],
        deceasedSurvivors: []
      }

      const file = new File([JSON.stringify(mockData)], 'test.json', { type: 'application/json' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Imported Hero')).toBeInTheDocument()
      })
    })

    it('shows error notification for invalid import data', async () => {
      const user = userEvent.setup()
      render(<App />)

      const invalidData = { invalid: 'data' }
      const file = new File([JSON.stringify(invalidData)], 'test.json', { type: 'application/json' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/failed to import/i)).toBeInTheDocument()
      })
    })

    it('handles malformed JSON in import', async () => {
      const user = userEvent.setup()
      render(<App />)

      const file = new File(['not valid json'], 'test.json', { type: 'application/json' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/failed to import/i)).toBeInTheDocument()
      })
    })
  })

  describe('Survivor Management', () => {
    it('opens survivor list panel when menu button is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      expect(screen.getByText('Survivor Management')).toBeInTheDocument()
    })

    it('creates a new survivor', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      const createBtn = screen.getByRole('button', { name: /new survivor/i })
      await user.click(createBtn)

      await waitFor(() => {
        expect(screen.getByText(/new survivor created/i)).toBeInTheDocument()
      })
    })

    it('deactivates a survivor', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      await user.click(deactivateButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/deactivated successfully/i)).toBeInTheDocument()
      })

      // Survivor pool should expand automatically
      expect(screen.getByText(/survivor pool/i)).toBeInTheDocument()
    })

    it('activates a survivor from the pool', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      // First deactivate a survivor
      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      await user.click(deactivateButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/deactivated successfully/i)).toBeInTheDocument()
      })

      // Then activate from pool
      const activateBtn = await waitFor(() =>
        screen.getByRole('button', { name: /^activate$/i })
      )
      await user.click(activateBtn)

      await waitFor(() => {
        expect(screen.getByText(/activated successfully/i)).toBeInTheDocument()
      })
    })

    it('prevents activation when all slots are full', async () => {
      const user = userEvent.setup()

      const createMockSurvivor = (name: string) => ({
        name,
        gender: 'M' as const,
        createdAt: new Date().toISOString(),
        huntXP: Array(15).fill(false),
        survival: 0,
        survivalLimit: 0,
        cannotSpendSurvival: false,
        survivalAbilities: { dodge: false, encourage: false, surge: false, dash: false, endure: false },
        stats: { movement: 5, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        gearBonuses: { movement: 0, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        insanity: 0,
        brainArmor: 0,
        insane: false,
        bodyLocations: {
          head: { armor: 0, light: false, heavy: false },
          arms: { armor: 0, light: false, heavy: false },
          body: { armor: 0, light: false, heavy: false },
          waist: { armor: 0, light: false, heavy: false },
          legs: { armor: 0, light: false, heavy: false },
        },
        weaponProficiency: { type: '', level: Array(8).fill(false) },
        courage: Array(9).fill(false),
        courageMilestone: null,
        understanding: Array(9).fill(false),
        understandingMilestone: null,
        fightingArts: [''],
        disorders: [''],
        abilitiesImpairments: ['', ''],
        oncePerLifetime: [''],
        retired: false,
        skipNextHunt: false,
        cannotUseFightingArts: false,
        rerollUsed: false,
      })

      const mockState = {
        survivors: {
          1: createMockSurvivor('Hero1'),
          2: createMockSurvivor('Hero2'),
          3: createMockSurvivor('Hero3'),
          4: createMockSurvivor('Hero4')
        },
        removedSurvivors: [{ ...createMockSurvivor('Pooled'), gender: 'F' as const }],
        retiredSurvivors: [],
        deceasedSurvivors: []
      }
      localStorage.setItem('kdm-app-state', JSON.stringify(mockState))

      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      // Expand survivor pool
      const poolHeader = screen.getByText(/survivor pool/i)
      await user.click(poolHeader)

      const activateBtn = await waitFor(() =>
        screen.getByRole('button', { name: /^activate$/i })
      )
      await user.click(activateBtn)

      await waitFor(() => {
        expect(screen.getByText(/all slots are full/i)).toBeInTheDocument()
      })
    })

    it('retires a survivor with confirmation', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      // Deactivate first
      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      await user.click(deactivateButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/deactivated successfully/i)).toBeInTheDocument()
      })

      // Retire
      const retireBtn = await waitFor(() =>
        screen.getByRole('button', { name: /^retire$/i })
      )
      await user.click(retireBtn)

      // Confirm dialog should appear
      expect(screen.getByText(/are you sure you want to retire/i)).toBeInTheDocument()

      const confirmBtn = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmBtn)

      await waitFor(() => {
        expect(screen.getByText(/Allister retired/i)).toBeInTheDocument()
      })
    })

    it('marks survivor as deceased with confirmation', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      // Deactivate first
      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      await user.click(deactivateButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/deactivated successfully/i)).toBeInTheDocument()
      })

      // Mark as deceased
      const deceasedBtn = screen.getByRole('button', { name: /deceased/i })
      await user.click(deceasedBtn)

      // Confirm dialog should appear
      expect(screen.getByText(/are you sure you want to mark/i)).toBeInTheDocument()

      const confirmBtn = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmBtn)

      await waitFor(() => {
        expect(screen.getByText(/marked as deceased/i)).toBeInTheDocument()
      })
    })

    it('cancels retirement when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      // Deactivate first
      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      await user.click(deactivateButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/deactivated successfully/i)).toBeInTheDocument()
      })

      // Attempt to retire
      const retireBtn = screen.getByRole('button', { name: /retire/i })
      await user.click(retireBtn)

      // Cancel
      const cancelBtn = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelBtn)

      // Dialog should close, survivor still in pool
      expect(screen.queryByText(/are you sure you want to retire/i)).not.toBeInTheDocument()
    })
  })

  describe('Clear All Data', () => {
    it('clears all data with confirmation', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Open settlement dropdown
      const settlementBtn = screen.getByRole('button', { name: /settlement 1/i })
      await user.click(settlementBtn)

      // Click "Manage Settlements..." in dropdown
      const manageSettlementsBtn = screen.getByText(/manage settlements\.\.\./i)
      await user.click(manageSettlementsBtn)

      // Now click Clear All Data
      const clearBtn = screen.getByRole('button', { name: /clear all data/i })
      await user.click(clearBtn)

      // Confirm dialog
      expect(screen.getByText(/are you sure you want to clear all/i)).toBeInTheDocument()

      const confirmBtn = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmBtn)

      await waitFor(() => {
        expect(screen.getByText(/all data cleared/i)).toBeInTheDocument()
      })

      // Should reset to default survivors
      expect(screen.getByDisplayValue('Allister')).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('closes survivor list with Escape key', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      expect(screen.getByText('Survivor Management')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('Survivor Management')).not.toBeInTheDocument()
      })
    })

    it('does not trigger shortcuts when typing in input', async () => {
      const user = userEvent.setup()
      render(<App />)

      const nameInput = screen.getByDisplayValue('Allister')
      await user.click(nameInput)
      await user.keyboard('{ArrowLeft}')

      // Should not navigate away, just move cursor in input
      expect(screen.getByDisplayValue('Allister')).toBeInTheDocument()
    })
  })

  describe('UI Interactions', () => {
    it('shows empty slot message when survivor is removed', () => {
      const mockState = {
        survivors: { 1: null, 2: null, 3: null, 4: null },
        removedSurvivors: [],
        retiredSurvivors: [],
        deceasedSurvivors: []
      }
      localStorage.setItem('kdm-app-state', JSON.stringify(mockState))

      render(<App />)

      const emptySlots = screen.getAllByText('Empty Slot')
      expect(emptySlots).toHaveLength(4)
    })

    it('clicking empty slot opens survivor list', async () => {
      const user = userEvent.setup()

      const mockState = {
        survivors: { 1: null, 2: null, 3: null, 4: null },
        removedSurvivors: [],
        retiredSurvivors: [],
        deceasedSurvivors: []
      }
      localStorage.setItem('kdm-app-state', JSON.stringify(mockState))

      render(<App />)

      const emptySlot = screen.getAllByText('Empty Slot')[0]
      await user.click(emptySlot)

      expect(screen.getByText('Survivor Management')).toBeInTheDocument()
    })

    it('notification disappears after timeout', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      const createBtn = screen.getByRole('button', { name: /new survivor/i })
      await user.click(createBtn)

      expect(screen.getByText(/new survivor created/i)).toBeInTheDocument()

      // Wait for notification to disappear (3 second timeout)
      await waitFor(() => {
        expect(screen.queryByText(/new survivor created/i)).not.toBeInTheDocument()
      }, { timeout: 4000 })
    })

    it('closes survivor list drawer with animation', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      expect(screen.getByText('Survivor Management')).toBeInTheDocument()

      const closeBtn = screen.getByRole('button', { name: /close/i })
      await user.click(closeBtn)

      await waitFor(() => {
        expect(screen.queryByText('Survivor Management')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('expands and collapses survivor pool section', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      const poolHeader = screen.getByText(/survivor pool/i)

      // Check if already expanded
      const isExpanded = screen.getByText(/survivor pool/i).textContent?.includes('▼')

      if (!isExpanded) {
        await user.click(poolHeader)
      }

      // Should show empty message
      expect(screen.getByText(/no survivors in pool/i)).toBeInTheDocument()
    })

    it('expands retired survivors section', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      const retiredHeader = screen.getByText(/retired survivors/i)
      await user.click(retiredHeader)

      expect(screen.getByText(/no retired survivors/i)).toBeInTheDocument()
    })

    it('expands deceased survivors section', async () => {
      const user = userEvent.setup()
      render(<App />)

      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      const deceasedHeader = screen.getByText(/deceased survivors/i)
      await user.click(deceasedHeader)

      expect(screen.getByText(/no deceased survivors/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('migrates huntXP from 16 to 15 items on load', async () => {
      const mockSurvivor = {
        name: 'Hero',
        gender: 'M',
        createdAt: new Date().toISOString(),
        huntXP: Array(16).fill(false), // Old format with 16 items
        survival: 0,
        survivalLimit: 0,
        cannotSpendSurvival: false,
        survivalAbilities: { dodge: false, encourage: false, surge: false, dash: false, endure: false },
        stats: { movement: 5, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        gearBonuses: { movement: 0, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        insanity: 0,
        brainArmor: 0,
        insane: false,
        bodyLocations: {
          head: { armor: 0, light: false, heavy: false },
          arms: { armor: 0, light: false, heavy: false },
          body: { armor: 0, light: false, heavy: false },
          waist: { armor: 0, light: false, heavy: false },
          legs: { armor: 0, light: false, heavy: false },
        },
        weaponProficiency: { type: '', level: Array(8).fill(false) },
        courage: Array(9).fill(false),
        courageMilestone: null,
        understanding: Array(9).fill(false),
        understandingMilestone: null,
        fightingArts: [''],
        disorders: [''],
        abilitiesImpairments: ['', ''],
        oncePerLifetime: [''],
        retired: false,
        skipNextHunt: false,
        cannotUseFightingArts: false,
        rerollUsed: false,
      }

      const oldState = {
        survivors: { 1: mockSurvivor, 2: null, 3: null, 4: null },
        removedSurvivors: [],
        retiredSurvivors: [],
        deceasedSurvivors: []
      }
      localStorage.setItem('kdm-app-state', JSON.stringify(oldState))

      render(<App />)

      // Verify the huntXP array was trimmed to 15 items
      // Wait for debounced save
      await waitFor(() => {
        const savedState = JSON.parse(localStorage.getItem('kdm-app-state')!)
        expect(savedState.settlements[0].survivors[1].huntXP.length).toBe(15)
      }, { timeout: 2000 })
    })

    it('handles backwards compatibility with archived survivors', async () => {
      const user = userEvent.setup()
      render(<App />)

      const mockSurvivor = {
        name: 'Hero',
        gender: 'M',
        createdAt: new Date().toISOString(),
        huntXP: Array(15).fill(false),
        survival: 0,
        survivalLimit: 0,
        cannotSpendSurvival: false,
        survivalAbilities: { dodge: false, encourage: false, surge: false, dash: false, endure: false },
        stats: { movement: 5, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        gearBonuses: { movement: 0, accuracy: 0, strength: 0, evasion: 0, luck: 0, speed: 0 },
        insanity: 0,
        brainArmor: 0,
        insane: false,
        bodyLocations: {
          head: { armor: 0, light: false, heavy: false },
          arms: { armor: 0, light: false, heavy: false },
          body: { armor: 0, light: false, heavy: false },
          waist: { armor: 0, light: false, heavy: false },
          legs: { armor: 0, light: false, heavy: false },
        },
        weaponProficiency: { type: '', level: Array(8).fill(false) },
        courage: Array(9).fill(false),
        courageMilestone: null,
        understanding: Array(9).fill(false),
        understandingMilestone: null,
        fightingArts: [''],
        disorders: [''],
        abilitiesImpairments: ['', ''],
        oncePerLifetime: [''],
        retired: false,
        skipNextHunt: false,
        cannotUseFightingArts: false,
        rerollUsed: false,
      }

      const oldFormatState = {
        survivors: {
          1: mockSurvivor,
          2: null,
          3: null,
          4: null
        },
        archivedSurvivors: [{ ...mockSurvivor, name: 'Archived', gender: 'F' }]
        // Missing retiredSurvivors and deceasedSurvivors
      }

      const file = new File([JSON.stringify(oldFormatState)], 'old.json', { type: 'application/json' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Hero')).toBeInTheDocument()
      })

      // Should not crash and handle the migration
      const menuBtn = screen.getByRole('button', { name: /manage survivors/i })
      await user.click(menuBtn)

      expect(screen.getByText('Survivor Management')).toBeInTheDocument()
    })
  })
})
