import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as userLib from '@/lib/user.ts'
import { renderWithProviders } from '@/test-utils'

import { Home } from './Home'

const mockNavigate = vi.fn()

const mockUseSearchParams = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => mockUseSearchParams(),
  }
})

vi.mock('@/lib/user.ts', () => ({
  getUserId: vi.fn(),
  getUserName: vi.fn(),
  getNewUserId: vi.fn(),
  saveUser: vi.fn(),
}))

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(userLib.getUserId).mockReturnValue(null)
    vi.mocked(userLib.getUserName).mockReturnValue(null)
    vi.mocked(userLib.getNewUserId).mockReturnValue('test-user-id')

    const mockSearchParams = new URLSearchParams()
    mockUseSearchParams.mockReturnValue([mockSearchParams])
  })

  it('should render welcome card when no user exists', () => {
    renderWithProviders(<Home />)

    expect(screen.getByText('Welcome to Co-Canva')).toBeInTheDocument()
    expect(
      screen.getByText('Enter your name to start using Co-Canva')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('should redirect to /rooms when user already exists', async () => {
    vi.mocked(userLib.getUserId).mockReturnValue('existing-user-id')
    vi.mocked(userLib.getUserName).mockReturnValue('John Doe')

    renderWithProviders(<Home />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/rooms', {
        state: { userId: 'existing-user-id', userName: 'John Doe' },
      })
    })
  })

  it('should trim leading spaces from name input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Home />)

    const nameInput = screen.getByLabelText('Name')
    await user.type(nameInput, '  John')

    expect(nameInput).toHaveValue('John')
  })

  it('should create user and navigate on form submit', async () => {
    const user = userEvent.setup()

    renderWithProviders(<Home />)

    const nameInput = screen.getByLabelText('Name')
    const submitButton = screen.getByRole('button', { name: 'Continue' })

    await user.type(nameInput, 'John Doe')
    await user.click(submitButton)

    await waitFor(() => {
      expect(userLib.saveUser).toHaveBeenCalledWith('test-user-id', 'John Doe')
      expect(mockNavigate).toHaveBeenCalledWith('/rooms', {
        state: { userId: 'test-user-id', userName: 'John Doe' },
      })
    })
  })

  it('should trim whitespace from name before saving', async () => {
    const user = userEvent.setup()

    renderWithProviders(<Home />)

    const nameInput = screen.getByLabelText('Name')
    const submitButton = screen.getByRole('button', { name: 'Continue' })

    await user.type(nameInput, '  John Doe  ')
    await user.click(submitButton)

    await waitFor(() => {
      expect(userLib.saveUser).toHaveBeenCalledWith('test-user-id', 'John Doe')
    })
  })

  it('should not submit with empty name', async () => {
    const user = userEvent.setup()

    renderWithProviders(<Home />)

    const submitButton = screen.getByRole('button', { name: 'Continue' })

    await user.click(submitButton)

    expect(userLib.saveUser).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should not submit with whitespace-only name', async () => {
    const user = userEvent.setup()

    renderWithProviders(<Home />)

    const nameInput = screen.getByLabelText('Name')
    const submitButton = screen.getByRole('button', { name: 'Continue' })

    await user.type(nameInput, '   ')
    await user.click(submitButton)

    expect(nameInput).toHaveValue('')
    expect(userLib.saveUser).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  describe('Redirect parameter handling', () => {
    it('should redirect existing user to specified redirect URL', async () => {
      vi.mocked(userLib.getUserId).mockReturnValue('existing-user-id')
      vi.mocked(userLib.getUserName).mockReturnValue('John Doe')

      const mockSearchParams = new URLSearchParams()
      mockSearchParams.set('redirect', '/rooms/test-room-123')
      mockUseSearchParams.mockReturnValue([mockSearchParams])

      renderWithProviders(<Home />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/rooms/test-room-123', {
          state: { userId: 'existing-user-id', userName: 'John Doe' },
        })
      })
    })

    it('should redirect new user to specified redirect URL after creation', async () => {
      const user = userEvent.setup()

      const mockSearchParams = new URLSearchParams()
      mockSearchParams.set('redirect', '/rooms/test-room-456')
      mockUseSearchParams.mockReturnValue([mockSearchParams])

      renderWithProviders(<Home />)

      const nameInput = screen.getByLabelText('Name')
      const submitButton = screen.getByRole('button', { name: 'Continue' })

      await user.type(nameInput, 'Jane Doe')
      await user.click(submitButton)

      await waitFor(() => {
        expect(userLib.saveUser).toHaveBeenCalledWith(
          'test-user-id',
          'Jane Doe'
        )
        expect(mockNavigate).toHaveBeenCalledWith('/rooms/test-room-456', {
          state: { userId: 'test-user-id', userName: 'Jane Doe' },
        })
      })
    })

    it('should handle encoded redirect URL', async () => {
      vi.mocked(userLib.getUserId).mockReturnValue('existing-user-id')
      vi.mocked(userLib.getUserName).mockReturnValue('John Doe')

      const mockSearchParams = new URLSearchParams()
      mockSearchParams.set('redirect', '%2Frooms%2Ftest-room-789')
      mockUseSearchParams.mockReturnValue([mockSearchParams])

      renderWithProviders(<Home />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('%2Frooms%2Ftest-room-789', {
          state: { userId: 'existing-user-id', userName: 'John Doe' },
        })
      })
    })

    it('should navigate to /rooms when no redirect parameter exists', async () => {
      vi.mocked(userLib.getUserId).mockReturnValue('existing-user-id')
      vi.mocked(userLib.getUserName).mockReturnValue('John Doe')

      const mockSearchParams = new URLSearchParams()
      mockUseSearchParams.mockReturnValue([mockSearchParams])

      renderWithProviders(<Home />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/rooms', {
          state: { userId: 'existing-user-id', userName: 'John Doe' },
        })
      })
    })
  })
})
