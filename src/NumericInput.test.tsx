import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NumericInput from './NumericInput'

describe('NumericInput', () => {
  it('renders with initial value', () => {
    render(<NumericInput value={5} onChange={vi.fn()} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(5)
  })

  it('shows increment/decrement buttons when clicked', async () => {
    const user = userEvent.setup()
    render(<NumericInput value={5} onChange={vi.fn()} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)

    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.getByText('-1')).toBeInTheDocument()
  })

  it('increments value when +1 button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumericInput value={5} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)

    const incrementBtn = screen.getByText('+1')
    await user.click(incrementBtn)

    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('decrements value when -1 button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumericInput value={5} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)

    const decrementBtn = screen.getByText('-1')
    await user.click(decrementBtn)

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('respects min value constraint', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumericInput value={0} onChange={onChange} min={0} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)

    // Decrement button should not exist when at min value
    expect(screen.queryByText('-1')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('respects max value constraint', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumericInput value={10} onChange={onChange} max={10} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)

    // Increment button should not exist when at max value
    expect(screen.queryByText('+1')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('input is read-only', () => {
    render(<NumericInput value={5} onChange={vi.fn()} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.readOnly).toBe(true)
  })

  it('hides increment button when at max value', async () => {
    const user = userEvent.setup()
    render(<NumericInput value={5} onChange={vi.fn()} max={5} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)

    expect(screen.queryByText('+1')).not.toBeInTheDocument()
    expect(screen.getByText('-1')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<NumericInput value={5} onChange={vi.fn()} className="custom-class" />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveClass('custom-class')
  })
})
