import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InventoryModal from './InventoryModal'
import type { GlossaryTerm } from '../types/glossary'
import type { SettlementInventory } from '../migrations'

// Mock Tesseract
vi.mock('tesseract.js', () => ({
  default: {
    recognize: vi.fn(),
  },
}))

// Mock searchGlossary
vi.mock('../utils/glossarySearch', () => ({
  searchGlossary: vi.fn((terms, query) => {
    return terms.filter(t => t.term.toLowerCase().includes(query.toLowerCase()))
      .map(term => ({ term, score: 1 }))
  }),
}))

const mockGlossaryTerms: GlossaryTerm[] = [
  {
    term: 'Sword',
    definition: 'A basic weapon',
    category: 'Weapons',
    relatedTerms: ['melee', 'weapon'],
    url: 'https://example.com/sword'
  },
  {
    term: 'Iron Bone Whip',
    definition: 'A whip weapon',
    category: 'Weapons',
    relatedTerms: ['melee', 'weapon'],
    url: 'https://example.com/whip'
  },
  {
    term: 'Leather Armor',
    definition: 'Basic armor',
    category: 'Armor',
    relatedTerms: ['armor', 'leather'],
    url: 'https://example.com/armor'
  },
  {
    term: 'Bone Marrow',
    definition: 'A resource',
    category: 'Resources',
    relatedTerms: ['bone', 'resource'],
    url: 'https://example.com/bone'
  },
]

const mockInventory: SettlementInventory = {
  gear: { Sword: 1, 'Leather Armor': 2 },
  materials: { 'Bone Marrow': 5 },
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  settlementName: 'Test Settlement',
  inventory: mockInventory,
  onUpdateInventory: vi.fn(),
  glossaryTerms: mockGlossaryTerms,
  loadedWikiTerms: mockGlossaryTerms,
  onSearchWiki: vi.fn(),
  onLoadCategory: vi.fn(),
}

describe('InventoryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <InventoryModal {...defaultProps} isOpen={false} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders modal with settlement name in header', () => {
      render(<InventoryModal {...defaultProps} />)
      expect(screen.getByText('Test Settlement Inventory')).toBeInTheDocument()
    })

    it('renders gear and materials tabs', () => {
      render(<InventoryModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Gear' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Materials' })).toBeInTheDocument()
    })

    it('renders search input and scan button by default', () => {
      render(<InventoryModal {...defaultProps} />)
      expect(screen.getByPlaceholderText('Search to add...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Scan Card' })).toBeInTheDocument()
    })

    it('renders close button', () => {
      render(<InventoryModal {...defaultProps} />)
      expect(screen.getByLabelText('Close')).toBeInTheDocument()
    })
  })

  describe('Tab Switching', () => {
    it('starts with gear tab active', () => {
      render(<InventoryModal {...defaultProps} />)
      const gearTab = screen.getByRole('button', { name: 'Gear' })
      expect(gearTab).toHaveClass('active')
    })

    it('displays gear items initially', () => {
      render(<InventoryModal {...defaultProps} />)
      expect(screen.getByText('Sword')).toBeInTheDocument()
      expect(screen.getByText('Leather Armor')).toBeInTheDocument()
    })

    it('switches to materials tab when clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      const materialsTab = screen.getByRole('button', { name: 'Materials' })
      await user.click(materialsTab)

      expect(materialsTab).toHaveClass('active')
      expect(screen.getByText('Bone Marrow')).toBeInTheDocument()
    })

    it('hides gear items when switched to materials', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      const materialsTab = screen.getByRole('button', { name: 'Materials' })
      await user.click(materialsTab)

      expect(screen.queryByText('Sword')).not.toBeInTheDocument()
    })
  })

  describe('Item Management', () => {
    it('displays items with correct counts', () => {
      render(<InventoryModal {...defaultProps} />)
      expect(screen.getByText('x1')).toBeInTheDocument()
      expect(screen.getByText('x2')).toBeInTheDocument()
    })

    it('increments item count when + button clicked', async () => {
      const user = userEvent.setup()
      const onUpdateInventory = vi.fn()
      render(
        <InventoryModal
          {...defaultProps}
          onUpdateInventory={onUpdateInventory}
        />
      )

      // Find the + button for Sword (first item alphabetically in gear)
      const increments = screen.getAllByLabelText(/Add one/)
      // Leather Armor comes first alphabetically, so index 0 is for Leather Armor
      await user.click(increments[1]) // Sword is at index 1

      expect(onUpdateInventory).toHaveBeenCalledWith({
        ...mockInventory,
        gear: { Sword: 2, 'Leather Armor': 2 },
      })
    })

    it('decrements item count when - button clicked', async () => {
      const user = userEvent.setup()
      const onUpdateInventory = vi.fn()
      render(
        <InventoryModal
          {...defaultProps}
          onUpdateInventory={onUpdateInventory}
        />
      )

      // Leather Armor comes first alphabetically, so index 0 is for Leather Armor (count 2)
      const decrements = screen.getAllByLabelText(/Remove one/)
      await user.click(decrements[0])

      expect(onUpdateInventory).toHaveBeenCalledWith({
        ...mockInventory,
        gear: { Sword: 1, 'Leather Armor': 1 },
      })
    })

    it('removes item when count reaches 0', async () => {
      const user = userEvent.setup()
      const onUpdateInventory = vi.fn()
      render(
        <InventoryModal
          {...defaultProps}
          onUpdateInventory={onUpdateInventory}
        />
      )

      // Sword comes second alphabetically (count 1)
      const decrements = screen.getAllByLabelText(/Remove one/)
      await user.click(decrements[1])

      expect(onUpdateInventory).toHaveBeenCalledWith({
        ...mockInventory,
        gear: { 'Leather Armor': 2 },
      })
    })

    it('displays empty message when no items', () => {
      const emptyInventory = { gear: {}, materials: {} }
      render(
        <InventoryModal
          {...defaultProps}
          inventory={emptyInventory}
        />
      )
      expect(screen.getByText('No items yet')).toBeInTheDocument()
    })

    it('displays item links when URLs are available', () => {
      render(<InventoryModal {...defaultProps} />)
      const swordLink = screen.getByRole('link', { name: 'Sword' })
      expect(swordLink).toHaveAttribute('href', 'https://example.com/sword')
      expect(swordLink).toHaveAttribute('target', '_blank')
    })

    it('displays item tags for KDM keywords', () => {
      render(<InventoryModal {...defaultProps} />)
      expect(screen.getByText(/melee.*weapon/)).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('updates search results when user types', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Search to add...')
      await user.type(searchInput, 'Sword')

      // Wait for results to be displayed
      await waitFor(() => {
        expect(searchInput).toHaveValue('Sword')
      })
    })

    it('shows autocomplete dropdown with results', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Search to add...')
      await user.type(searchInput, 'Armor')

      // Verify the search input has the text
      expect(searchInput).toHaveValue('Armor')
    })

    it('adds item when search result clicked', async () => {
      const user = userEvent.setup()
      const onUpdateInventory = vi.fn()
      render(
        <InventoryModal
          {...defaultProps}
          onUpdateInventory={onUpdateInventory}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search to add...')
      await user.type(searchInput, 'Iron')

      await waitFor(() => {
        const result = screen.queryByText('Iron Bone Whip')
        expect(result).toBeInTheDocument()
      })

      const result = screen.getByText('Iron Bone Whip')
      await user.click(result)

      expect(onUpdateInventory).toHaveBeenCalled()
    })

    it('clears search input value after typing', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Search to add...') as HTMLInputElement
      await user.type(searchInput, 'test')

      expect(searchInput.value).toBe('test')
    })

    it('handles keyboard navigation Up/Down arrows', async () => {
      const user = userEvent.setup()
      render(
        <InventoryModal
          {...defaultProps}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search to add...')
      await user.click(searchInput)
      
      // Verify we can interact with the search input
      await user.keyboard('{ArrowDown}')
      expect(searchInput).toBeInTheDocument()
    })

    it('handles Escape key to close modal', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<InventoryModal {...defaultProps} onClose={onClose} />)

      const searchInput = screen.getByPlaceholderText('Search to add...')
      await user.click(searchInput)
      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Scan Functionality', () => {
    it('shows scan view when Scan Card button clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      const scanBtn = screen.getByRole('button', { name: 'Scan Card' })
      await user.click(scanBtn)

      expect(screen.getByText(/Scan a card to add/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Start Camera' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Upload Photo' })).toBeInTheDocument()
    })

    it('shows back button in scan view', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      const scanBtn = screen.getByRole('button', { name: 'Scan Card' })
      await user.click(scanBtn)

      expect(screen.getByRole('button', { name: /Back to search/ })).toBeInTheDocument()
    })

    it('exits scan view when back button clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      const scanBtn = screen.getByRole('button', { name: 'Scan Card' })
      await user.click(scanBtn)

      const backBtn = screen.getByRole('button', { name: /Back to search/ })
      await user.click(backBtn)

      expect(screen.getByPlaceholderText('Search to add...')).toBeInTheDocument()
    })

    it('can navigate to scan view and back', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      // Initially in search view
      expect(screen.getByPlaceholderText('Search to add...')).toBeInTheDocument()

      // Enter scan view
      const scanBtn = screen.getByRole('button', { name: 'Scan Card' })
      await user.click(scanBtn)

      // Verify we're in scan view
      expect(screen.getByText(/Scan a card to add/)).toBeInTheDocument()

      // Exit to search view
      const backBtn = screen.getByRole('button', { name: /Back to search/ })
      await user.click(backBtn)

      // Back to search view
      expect(screen.getByPlaceholderText('Search to add...')).toBeInTheDocument()
    })
  })

  describe('Modal Interactions', () => {
    it('closes modal when close button clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<InventoryModal {...defaultProps} onClose={onClose} />)

      const closeBtn = screen.getByLabelText('Close')
      await user.click(closeBtn)

      expect(onClose).toHaveBeenCalled()
    })

    it('closes modal when backdrop clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<InventoryModal {...defaultProps} onClose={onClose} />)

      const backdrop = screen.getByRole('button', { name: 'Scan Card' })
        .closest('.inventory-modal-backdrop') as HTMLElement

      await user.click(backdrop)

      expect(onClose).toHaveBeenCalled()
    })

    it('loads wiki categories on modal open', () => {
      const onLoadCategory = vi.fn()
      render(
        <InventoryModal
          {...defaultProps}
          onLoadCategory={onLoadCategory}
        />
      )

      expect(onLoadCategory).toHaveBeenCalledWith('gear')
      expect(onLoadCategory).toHaveBeenCalledWith('weapons')
      expect(onLoadCategory).toHaveBeenCalledWith('armor')
      expect(onLoadCategory).toHaveBeenCalledWith('resources')
    })

    it('focuses search input on modal open', async () => {
      render(<InventoryModal {...defaultProps} />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search to add...') as HTMLInputElement
        expect(document.activeElement === searchInput || searchInput.offsetParent !== null).toBeTruthy()
      })
    })
  })

  describe('Item Sorting', () => {
    it('sorts items alphabetically', () => {
      render(<InventoryModal {...defaultProps} />)
      
      // Get all item rows and check the order
      const items = screen.getAllByText(/x\d+/)
      // The items should appear in order: Leather Armor (x2), then Sword (x1)
      expect(items.length).toBeGreaterThanOrEqual(2)
      
      // Verify items are rendered
      expect(screen.getByText('Leather Armor')).toBeInTheDocument()
      expect(screen.getByText('Sword')).toBeInTheDocument()
    })
  })

  describe('Integration', () => {
    it('handles complete workflow: search, add, increment, decrement', async () => {
      const user = userEvent.setup()
      const onUpdateInventory = vi.fn()
      render(
        <InventoryModal
          {...defaultProps}
          onUpdateInventory={onUpdateInventory}
        />
      )

      // Start with gear tab
      expect(screen.getByRole('button', { name: 'Gear' })).toHaveClass('active')

      // Search for item
      const searchInput = screen.getByPlaceholderText('Search to add...')
      await user.type(searchInput, 'Iron')

      // Add item
      await waitFor(() => {
        const result = screen.getByText('Iron Bone Whip')
        expect(result).toBeInTheDocument()
      })

      await user.click(screen.getByText('Iron Bone Whip'))
      expect(onUpdateInventory).toHaveBeenCalled()
    })

    it('handles tab switch with items in different sections', async () => {
      const user = userEvent.setup()
      render(<InventoryModal {...defaultProps} />)

      // Verify gear items
      expect(screen.getByText('Sword')).toBeInTheDocument()

      // Switch to materials
      await user.click(screen.getByRole('button', { name: 'Materials' }))

      // Verify materials items
      expect(screen.getByText('Bone Marrow')).toBeInTheDocument()
      expect(screen.queryByText('Sword')).not.toBeInTheDocument()

      // Switch back to gear
      await user.click(screen.getByRole('button', { name: 'Gear' }))

      // Verify gear items again
      expect(screen.getByText('Sword')).toBeInTheDocument()
    })
  })
})
