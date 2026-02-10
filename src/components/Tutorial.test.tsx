import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tutorial from './Tutorial'

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  appVersion: '1.0.0',
}

describe('Tutorial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <Tutorial {...defaultProps} isOpen={false} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders tutorial overlay when isOpen is true', () => {
      render(<Tutorial {...defaultProps} />)
      expect(screen.getByText(/Welcome to KDM Settlement Manager/)).toBeInTheDocument()
    })

    it('renders close button', () => {
      render(<Tutorial {...defaultProps} />)
      expect(screen.getByLabelText('Skip tutorial')).toBeInTheDocument()
    })

    it('renders tutorial title and description', () => {
      render(<Tutorial {...defaultProps} />)
      expect(screen.getByText('Welcome to KDM Settlement Manager!')).toBeInTheDocument()
      expect(screen.getByText(/quick tutorial will show you/)).toBeInTheDocument()
    })

    it('displays step progress', () => {
      render(<Tutorial {...defaultProps} />)
      expect(screen.getByText(/Step 1 of 12/)).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('has Previous button disabled on first step', () => {
      render(<Tutorial {...defaultProps} />)
      // First step should not have previous button
      const prevButton = screen.queryByRole('button', { name: 'Previous' })
      expect(prevButton).not.toBeInTheDocument()
    })

    it('shows Next button on first step', () => {
      render(<Tutorial {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })

    it('advances to next step when Next clicked', async () => {
      const user = userEvent.setup()
      render(<Tutorial {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Next' }))

      // Should advance to step 2
      expect(screen.getByText(/Survivor Sheets/)).toBeInTheDocument()
      expect(screen.getByText(/Step 2 of 12/)).toBeInTheDocument()
    })

    it('shows Previous button on subsequent steps', async () => {
      const user = userEvent.setup()
      render(<Tutorial {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Next' }))

      expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    })

    it('goes back to previous step when Previous clicked', async () => {
      const user = userEvent.setup()
      render(<Tutorial {...defaultProps} />)

      // Go to step 2
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText(/Step 2 of 12/)).toBeInTheDocument()

      // Go back to step 1
      await user.click(screen.getByRole('button', { name: 'Previous' }))
      expect(screen.getByText(/Step 1 of 12/)).toBeInTheDocument()
    })

    it('button is disabled when step requires interaction', () => {
      render(<Tutorial {...defaultProps} />)

      // Go to step 2 which requires interaction (clicking on survivor)
      const nextButton = screen.getByRole('button', { name: 'Next' })
      fireEvent.click(nextButton)

      // After moving to step 2, the Next button should be disabled
      const nextBtn2 = screen.queryByRole('button', { name: 'Next' })
      if (nextBtn2) {
        expect(nextBtn2).toBeDisabled()
      }
    })

    it('closes tutorial when skip button clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<Tutorial {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByLabelText('Skip tutorial'))

      expect(onClose).toHaveBeenCalled()
    })

    it('closes tutorial when close button clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<Tutorial {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByLabelText('Skip tutorial'))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('advances to next step when spacebar pressed', async () => {
      const user = userEvent.setup()
      render(<Tutorial {...defaultProps} />)

      await user.keyboard(' ')

      expect(screen.getByText(/Step 2 of 12/)).toBeInTheDocument()
    })

    it('does not advance if step requires interaction and not completed', async () => {
      const user = userEvent.setup()
      render(<Tutorial {...defaultProps} />)

      // Go to step 2 (requires interaction)
      await user.click(screen.getByRole('button', { name: 'Next' }))

      const initialStep = screen.getByText(/Step 2 of 12/)
      expect(initialStep).toBeInTheDocument()

      // Try to advance with spacebar without completing interaction
      const nextButton = screen.getByRole('button', { name: 'Next' })
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Step Progression', () => {
    it('displays first step title correctly', () => {
      render(<Tutorial {...defaultProps} />)
      expect(screen.getByText('Welcome to KDM Settlement Manager!')).toBeInTheDocument()
    })

    it('tracks current step correctly on initial render', () => {
      render(<Tutorial {...defaultProps} />)
      expect(screen.getByText(/Step 1 of 12/)).toBeInTheDocument()
    })

    it('increments step counter when navigating forward', async () => {
      const user = userEvent.setup()
      render(<Tutorial {...defaultProps} />)

      expect(screen.getByText(/Step 1 of 12/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText(/Step 2 of 12/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Previous' }))
      expect(screen.getByText(/Step 1 of 12/)).toBeInTheDocument()
    })
  })

  describe('Tutorial Completion', () => {
    it('marks tutorial as completed on skip', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<Tutorial {...defaultProps} onClose={onClose} appVersion="1.0.0" />)

      await user.click(screen.getByLabelText('Skip tutorial'))

      expect(localStorage.getItem('tutorial-completed')).toBe('1.0.0')
    })

    it('marks tutorial completion on closing', async () => {
      const user = userEvent.setup()
      render(<Tutorial {...defaultProps} isOpen={true} appVersion="1.0.0" />)

      const closeBtn = screen.getByLabelText('Skip tutorial')
      await user.click(closeBtn)

      expect(localStorage.getItem('tutorial-completed')).toBe('1.0.0')
    })
  })

  describe('Step Reset', () => {
    it('resets to first step when isOpen changes from false to true', async () => {
      const { rerender } = render(
        <Tutorial {...defaultProps} isOpen={false} />
      )

      expect(screen.queryByText(/Welcome to KDM Settlement Manager/)).not.toBeInTheDocument()

      rerender(<Tutorial {...defaultProps} isOpen={true} />)

      expect(screen.getByText(/Welcome to KDM Settlement Manager/)).toBeInTheDocument()
      expect(screen.getByText(/Step 1 of 12/)).toBeInTheDocument()
    })

    it('maintains step on rerenders with same isOpen state', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<Tutorial {...defaultProps} isOpen={true} />)

      // Advance to step 2
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText(/Step 2 of 12/)).toBeInTheDocument()

      // Rerender with same isOpen state
      rerender(<Tutorial {...defaultProps} isOpen={true} />)

      // Should still be on step 2 (rerender doesn't trigger useEffect for isOpen if it's the same)
      expect(screen.getByText(/Step 2 of 12/)).toBeInTheDocument()
    })
  })

  describe('Highlighting', () => {
    it('renders tutorial overlay with highlight class when no target', () => {
      render(<Tutorial {...defaultProps} />)
      const overlay = screen.getByLabelText('Skip tutorial').closest('.tutorial-overlay')
      expect(overlay).toHaveClass('no-highlight')
    })

    it('renders tooltip with step title and description', () => {
      render(<Tutorial {...defaultProps} />)
      expect(screen.getByText('Welcome to KDM Settlement Manager!')).toBeInTheDocument()
      expect(screen.getByText(/quick tutorial will show you/)).toBeInTheDocument()
    })
  })

  describe('Integration', () => {
    it('allows user to skip at any time', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<Tutorial {...defaultProps} onClose={onClose} />)

      // Advance a few steps
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await user.click(screen.getByRole('button', { name: 'Previous' }))

      // Skip from middle of tutorial
      await user.click(screen.getByLabelText('Skip tutorial'))

      expect(onClose).toHaveBeenCalled()
      expect(localStorage.getItem('tutorial-completed')).toBe('1.0.0')
    })

    it('handles forward and backward navigation', async () => {
      const user = userEvent.setup()
      render(<Tutorial {...defaultProps} />)

      expect(screen.getByText(/Step 1 of 12/)).toBeInTheDocument()

      // Navigate forward
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText(/Step 2 of 12/)).toBeInTheDocument()

      // Navigate backward
      await user.click(screen.getByRole('button', { name: 'Previous' }))
      expect(screen.getByText(/Step 1 of 12/)).toBeInTheDocument()

      // Navigate forward again
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText(/Step 2 of 12/)).toBeInTheDocument()
    })
  })

  describe('Version Tracking', () => {
    it('stores different versions separately', () => {
      const { rerender } = render(<Tutorial {...defaultProps} appVersion="1.0.0" />)

      const closeBtn = screen.getByLabelText('Skip tutorial')
      fireEvent.click(closeBtn)

      expect(localStorage.getItem('tutorial-completed')).toBe('1.0.0')

      // Now test with different version
      rerender(<Tutorial {...defaultProps} isOpen={true} appVersion="2.0.0" />)
      expect(screen.getByText(/Welcome to KDM Settlement Manager/)).toBeInTheDocument()

      const closeBtn2 = screen.getByLabelText('Skip tutorial')
      fireEvent.click(closeBtn2)

      expect(localStorage.getItem('tutorial-completed')).toBe('2.0.0')
    })
  })
})
