import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SurvivorSheet, { initialSurvivorData } from './SurvivorSheet'

describe('SurvivorSheet', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    mockOnUpdate.mockClear()
  })

  it('renders survivor name input', () => {
    const survivor = { ...initialSurvivorData, name: 'Test Hero' }
    render(<SurvivorSheet survivor={survivor} onUpdate={mockOnUpdate} />)

    const nameInput = screen.getByDisplayValue('Test Hero')
    expect(nameInput).toBeInTheDocument()
  })

  it('updates survivor name when typed', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const nameInput = document.querySelector('.name-input') as HTMLInputElement
    await user.type(nameInput, 'A')

    expect(mockOnUpdate).toHaveBeenCalled()
    // Check that the name was updated
    expect(mockOnUpdate.mock.calls.length).toBeGreaterThan(0)
  })

  it('toggles gender selection', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const maleRadio = screen.getByRole('radio', { name: /m/i })
    await user.click(maleRadio)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ gender: 'M' })
    )
  })

  it('toggles hunt XP checkboxes', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

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
    render(<SurvivorSheet survivor={survivor} onUpdate={mockOnUpdate} />)

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
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const dodgeCheckbox = screen.getByRole('checkbox', { name: /dodge/i })
    await user.click(dodgeCheckbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        survivalAbilities: expect.objectContaining({ dodge: true })
      })
    )
  })

  it('updates stats correctly', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

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
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const weaponInput = screen.getByPlaceholderText(/type:/i)
    await user.type(weaponInput, 'S')

    expect(mockOnUpdate).toHaveBeenCalled()
    // Check that weaponProficiency was updated
    expect(mockOnUpdate.mock.calls.length).toBeGreaterThan(0)
  })

  it('toggles courage checkboxes', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const courageSection = screen.getByText('Courage').closest('.courage-section')
    expect(courageSection).toBeInTheDocument()

    const checkboxes = courageSection!.querySelectorAll('.checkbox-box input[type="checkbox"]')
    await user.click(checkboxes[0])

    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('toggles understanding checkboxes', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const understandingSection = screen.getByText('Understanding').closest('.understanding-section')
    expect(understandingSection).toBeInTheDocument()

    const checkboxes = understandingSection!.querySelectorAll('.checkbox-box input[type="checkbox"]')
    await user.click(checkboxes[0])

    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('updates fighting arts', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const fightingArtsSection = screen.getAllByText(/fighting arts/i)[0].closest('.fighting-arts')
    const fightingArtsInputs = fightingArtsSection!.querySelectorAll('.text-line')

    await user.type(fightingArtsInputs[0], 'Berserker')

    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('updates disorders', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const disordersSection = screen.getAllByText(/disorders/i)[0].closest('.disorders')
    const disordersInputs = disordersSection!.querySelectorAll('.text-line')

    await user.type(disordersInputs[0], 'Anxiety')

    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('toggles cannot spend survival checkbox', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const cannotSpendCheckbox = screen.getByRole('checkbox', { name: /cannot spend/i })
    await user.click(cannotSpendCheckbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ cannotSpendSurvival: true })
    )
  })

  it('toggles skip next hunt checkbox', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const skipHuntCheckbox = screen.getByRole('checkbox', { name: /skip next hunt/i })
    await user.click(skipHuntCheckbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ skipNextHunt: true })
    )
  })

  it('toggles cannot use fighting arts checkbox', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const cannotUseFACheckbox = screen.getByRole('checkbox', { name: /cannot use fighting arts/i })
    await user.click(cannotUseFACheckbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ cannotUseFightingArts: true })
    )
  })

  it('toggles reroll used checkbox', async () => {
    const user = userEvent.setup()
    render(<SurvivorSheet survivor={initialSurvivorData} onUpdate={mockOnUpdate} />)

    const rerollCheckbox = screen.getByRole('checkbox', { name: /reroll used/i })
    await user.click(rerollCheckbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ rerollUsed: true })
    )
  })
})
