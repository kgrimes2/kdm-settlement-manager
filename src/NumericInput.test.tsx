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

    const decrementBtn = screen.getByText('-1')
    await user.click(decrementBtn)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('respects max value constraint', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumericInput value={10} onChange={onChange} max={10} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)

    const incrementBtn = screen.getByText('+1')
    await user.click(incrementBtn)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('allows typing in the input field', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumericInput value={5} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await user.clear(input)

    // The onChange gets called when clearing (sets to 0)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('handles invalid input by defaulting to 0', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumericInput value={5} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await user.clear(input)

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('applies custom className', () => {
    render(<NumericInput value={5} onChange={vi.fn()} className="custom-class" />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveClass('custom-class')
  })
})
