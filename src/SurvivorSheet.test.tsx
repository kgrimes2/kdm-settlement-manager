import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SurvivorSheet, { initialSurvivorData } from './SurvivorSheet'

describe('SurvivorSheet', () => {
  const mockOnUpdate = vi.fn()
  const mockOnOpenGlossary = vi.fn()
  const mockGlossaryTerms: any[] = []

  beforeEach(() => {
    mockOnUpdate.mockClear()
    mockOnOpenGlossary.mockClear()
  })

  it('renders survivor name', () => {
    const survivor = { ...initialSurvivorData, name: 'Test Hero' }
    render(<SurvivorSheet survivor={survivor} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const nameDisplay = screen.getByDisplayValue('Test Hero')
    expect(nameDisplay).toBeInTheDocument()
  })

  it('updates survivor name when typed', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    // Click the name wrapper to open the edit input
    const nameWrapper = document.querySelector('.name-wrapper') as HTMLElement
    await user.click(nameWrapper)

    const nameInput = document.querySelector('.survivor-name-edit') as HTMLInputElement
    await user.type(nameInput, 'A')

    expect(mockOnUpdate).toHaveBeenCalled()
    expect(mockOnUpdate.mock.calls.length).toBeGreaterThan(0)
  })

  it('toggles gender selection', async () => {
    const user = userEvent.setup()
    const survivor = { ...initialSurvivorData, gender: 'M' as const }
    render(<SurvivorSheet survivor={survivor} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const genderToggle = document.querySelector('.gender-toggle') as HTMLElement
    await user.click(genderToggle)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ gender: 'F' })
    )
  })

  it('toggles hunt XP checkboxes', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const checkboxes = screen.getAllByRole('checkbox')
    const huntXPCheckbox = checkboxes.find(cb =>
      cb.closest('.hunt-xp-boxes') !== null
    )

    if (huntXPCheckbox) {
      await user.click(huntXPCheckbox)
      expect(mockOnUpdate).toHaveBeenCalled()
    }
  })

  it('updates survival value', async () => {
    const user = userEvent.setup()
    const survivor = { ...initialSurvivorData, survival: 3, survivalLimit: 10 }
    render(<SurvivorSheet survivor={survivor} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    // Find survival input by its container
    const survivalSection = screen.getByText('Survival').closest('.survival-section')!
    const survivalInput = survivalSection.querySelector('.survival-top input[type="number"]')!
    await user.click(survivalInput)

    const incrementBtn = screen.getByText('+1')
    await user.click(incrementBtn)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ survival: 4 })
    )
  })

  it('toggles survival abilities', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const dodgeLabel = screen.getByText('Dodge')
    await user.click(dodgeLabel)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        survivalAbilities: expect.objectContaining({ dodge: true })
      })
    )
  })

  it('updates stats correctly', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    // Movement is the first stat (default 5)
    const movementInput = screen.getAllByRole('spinbutton').find(input =>
      input.closest('.stat-box') !== null
    )

    if (movementInput) {
      await user.click(movementInput)
      const incrementBtn = screen.getByText('+1')
      await user.click(incrementBtn)

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.objectContaining({ movement: 6 })
        })
      )
    }
  })

  it('updates weapon proficiency type', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const weaponInput = screen.getByPlaceholderText(/Type.../i)
    await user.type(weaponInput, 'Sword{Enter}')

    expect(mockOnUpdate).toHaveBeenCalled()
    // Check that weaponProficiency types array was updated
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0]
    expect(lastCall.weaponProficiency.types).toContain('Sword')
  })

  it('toggles courage checkboxes', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const courageSection = screen.getByText('Courage').closest('.courage-section')
    expect(courageSection).toBeInTheDocument()

    const checkboxes = courageSection!.querySelectorAll('.checkbox-box input[type="checkbox"]')
    await user.click(checkboxes[0])

    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('toggles understanding checkboxes', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const understandingSection = screen.getByText('Understanding').closest('.understanding-section')
    expect(understandingSection).toBeInTheDocument()

    const checkboxes = understandingSection!.querySelectorAll('.checkbox-box input[type="checkbox"]')
    await user.click(checkboxes[0])

    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('updates fighting arts', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const fightingArtsInput = screen.getByPlaceholderText(/Add fighting art.../i)
    await user.type(fightingArtsInput, 'Berserker{Enter}')

    expect(mockOnUpdate).toHaveBeenCalled()
    // Check that fighting arts array was updated
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0]
    expect(lastCall.fightingArts).toContain('Berserker')
  })

  it('updates disorders', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const disordersInput = screen.getByPlaceholderText(/Add disorder.../i)
    await user.type(disordersInput, 'Anxiety{Enter}')

    expect(mockOnUpdate).toHaveBeenCalled()
    // Check that disorders array was updated
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0]
    expect(lastCall.disorders).toContain('Anxiety')
  })

  it('toggles cannot spend survival checkbox', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const cannotSpendCheckbox = screen.getByRole('checkbox', { name: /cannot spend/i })
    await user.click(cannotSpendCheckbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ cannotSpendSurvival: true })
    )
  })

  it('toggles skip next hunt checkbox', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const skipHuntCheckbox = screen.getByRole('checkbox', { name: /skip next hunt/i })
    await user.click(skipHuntCheckbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ skipNextHunt: true })
    )
  })

  it('toggles cannot use fighting arts checkbox', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const cannotUseFACheckbox = screen.getByRole('checkbox', { name: /cannot use fighting arts/i })
    await user.click(cannotUseFACheckbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ cannotUseFightingArts: true })
    )
  })

  it('toggles reroll used checkbox', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} onOpenGlossary={mockOnOpenGlossary} glossaryTerms={mockGlossaryTerms} />)

    const rerollCheckbox = screen.getByRole('checkbox', { name: /reroll used/i })
    await user.click(rerollCheckbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ rerollUsed: true })
    )
  })
})
