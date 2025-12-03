import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as userLib from '@/lib/user.ts'
import { renderWithProviders } from '@/test-utils'

import { Room } from './Room'

const mockNavigate = vi.fn()
const mockUseParams = vi.fn()
const mockUseLocation = vi.fn()

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
    useLocation: () => mockUseLocation(),
  }
})

vi.mock('@/lib/user.ts', () => ({
  getUserId: vi.fn(),
  getUserName: vi.fn(),
}))

const mockPost = vi.fn()
const mockGet = vi.fn()
vi.mock('@/lib/api.ts', () => ({
  client: {
    api: {
      rooms: {
        ':roomId': {
          join: {
            $post: (params: unknown) => mockPost(params),
          },
          $get: (params: unknown) => mockGet(params),
        },
      },
    },
  },
}))

const mockUseSync = vi.fn()
vi.mock('@tldraw/sync', () => ({
  useSync: (config: unknown) => mockUseSync(config),
}))

vi.mock('tldraw', () => ({
  Tldraw: ({ store }: { store: unknown }) => (
    <div data-testid='tldraw'>{store ? 'Tldraw Loaded' : 'No Store'}</div>
  ),
}))

describe('Room', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ roomId: 'test-room-id' })
    mockUseLocation.mockReturnValue({ state: null })
    vi.mocked(userLib.getUserId).mockReturnValue('test-user-id')
    vi.mocked(userLib.getUserName).mockReturnValue('Test User')
    mockUseSync.mockReturnValue({ mockStore: true })

    mockPost.mockResolvedValue({
      ok: true,
      json: async () => ({ roomId: 'test-room-id' }),
    })

    mockGet.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test-room-id', name: 'Test Room' }),
    })

    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:5173',
        href: 'http://localhost:5173/rooms/test-room-id',
      },
      writable: true,
    })
  })

  it('should redirect to home when no user exists', async () => {
    vi.mocked(userLib.getUserId).mockReturnValue(null)
    vi.mocked(userLib.getUserName).mockReturnValue(null)

    renderWithProviders(<Room />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/?redirect=%2Frooms%2Ftest-room-id'
      )
    })
  })

  it('should redirect to home when userId exists but userName is missing', async () => {
    vi.mocked(userLib.getUserId).mockReturnValue('test-user-id')
    vi.mocked(userLib.getUserName).mockReturnValue(null)

    renderWithProviders(<Room />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/?redirect=%2Frooms%2Ftest-room-id'
      )
    })
  })

  it('should redirect to home when userName exists but userId is missing', async () => {
    vi.mocked(userLib.getUserId).mockReturnValue(null)
    vi.mocked(userLib.getUserName).mockReturnValue('Test User')

    renderWithProviders(<Room />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/?redirect=%2Frooms%2Ftest-room-id'
      )
    })
  })

  it('should use location state for userId and userName when available', () => {
    mockUseLocation.mockReturnValue({
      state: { userId: 'state-user-id', userName: 'State User' },
    })

    renderWithProviders(<Room />)

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockUseSync).toHaveBeenCalledWith(
      expect.objectContaining({
        userInfo: { id: 'state-user-id', name: 'State User' },
      })
    )
  })

  it('should construct correct WebSocket URL with userId', () => {
    renderWithProviders(<Room />)

    expect(mockUseSync).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: expect.stringContaining(
          '/api/rooms/test-room-id/connect?userId=test-user-id'
        ),
      })
    )
  })

  it('should pass correct user info to useSync', () => {
    renderWithProviders(<Room />)

    expect(mockUseSync).toHaveBeenCalledWith(
      expect.objectContaining({
        userInfo: { id: 'test-user-id', name: 'Test User' },
      })
    )
  })

  it('should pass multiplayerAssetStore to useSync', () => {
    renderWithProviders(<Room />)

    expect(mockUseSync).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: expect.objectContaining({
          upload: expect.any(Function),

          resolve: expect.any(Function),
        }),
      })
    )
  })

  it('should render Tldraw with store from useSync', () => {
    mockUseSync.mockReturnValue('test-store')

    renderWithProviders(<Room />)

    expect(screen.getByTestId('tldraw')).toBeInTheDocument()
    expect(screen.getByText('Tldraw Loaded')).toBeInTheDocument()
  })

  it('should display copy link button', () => {
    renderWithProviders(<Room />)

    expect(
      screen.getByRole('button', { name: 'copy room link' })
    ).toBeInTheDocument()
  })

  it('should copy room link to clipboard when copy button is clicked and show "Copied!" message ', async () => {
    const user = userEvent.setup()
    const mockWriteText = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    })

    renderWithProviders(<Room />)

    const copyButton = screen.getByRole('button', { name: 'copy room link' })
    await user.click(copyButton)

    expect(screen.getByText('Copied!')).toBeInTheDocument()
    expect(mockWriteText).toHaveBeenCalledWith(
      'http://localhost:5173/rooms/test-room-id'
    )
  })

  it('should hide "Copied!" message after 3 seconds', () => {
    vi.useFakeTimers()
    const mockWriteText = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    })

    const { rerender } = renderWithProviders(<Room />)
    const copyButton = screen.getByRole('button', { name: 'copy room link' })

    act(() => {
      copyButton.click()
    })

    rerender(<Room />)
    expect(screen.getByText('Copied!')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    rerender(<Room />)
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('should construct WebSocket URL with origin from window.location', () => {
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://example.com',
        href: 'https://example.com/rooms/test-room-id',
      },
      writable: true,
    })

    renderWithProviders(<Room />)

    expect(mockUseSync).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: expect.stringContaining('https://example.com/api/rooms/'),
      })
    )
  })

  describe('Error Handling', () => {
    it('should display error card when user has already joined another room', async () => {
      mockPost.mockResolvedValue({
        ok: false,
        json: async () => ({
          errorMessage:
            'User already joined another room with roomId: existing-room-123',
        }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Join Room')).toBeInTheDocument()
      })

      expect(
        screen.getByText('You have already joined another room')
      ).toBeInTheDocument()
    })

    it('should display "Return to Lobby" button on error', async () => {
      mockPost.mockResolvedValue({
        ok: false,
        json: async () => ({
          errorMessage: 'User already joined another room with roomId: abc123',
        }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Return to Lobby' })
        ).toBeInTheDocument()
      })
    })

    it('should navigate to lobby when "Return to Lobby" button is clicked', async () => {
      const user = userEvent.setup()
      mockPost.mockResolvedValue({
        ok: false,
        json: async () => ({
          errorMessage: 'User already joined another room with roomId: abc123',
        }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Join Room')).toBeInTheDocument()
      })

      const returnButton = screen.getByRole('button', {
        name: 'Return to Lobby',
      })
      await user.click(returnButton)

      expect(mockNavigate).toHaveBeenCalledWith('/rooms')
    })

    it('should display "Go to Current Room" button when existing room ID is available', async () => {
      mockPost.mockResolvedValue({
        ok: false,
        json: async () => ({
          errorMessage:
            'User already joined another room with roomId: existing-room-456',
        }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Go to Current Room' })
        ).toBeInTheDocument()
      })
    })

    it('should navigate to existing room when "Go to Current Room" button is clicked', async () => {
      const user = userEvent.setup()
      mockPost.mockResolvedValue({
        ok: false,
        json: async () => ({
          errorMessage:
            'User already joined another room with roomId: existing-room-789',
        }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Join Room')).toBeInTheDocument()
      })

      const goToRoomButton = screen.getByRole('button', {
        name: 'Go to Current Room',
      })
      await user.click(goToRoomButton)

      expect(mockNavigate).toHaveBeenCalledWith('/rooms/existing-room-789')
    })

    it('should not display "Go to Current Room" button when room ID cannot be extracted', async () => {
      mockPost.mockResolvedValue({
        ok: false,
        json: async () => ({
          errorMessage: 'User already joined another room',
        }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Join Room')).toBeInTheDocument()
      })

      expect(
        screen.queryByRole('button', { name: 'Go to Current Room' })
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Return to Lobby' })
      ).toBeInTheDocument()
    })

    it('should not render Tldraw when error is displayed', async () => {
      mockPost.mockResolvedValue({
        ok: false,
        json: async () => ({
          errorMessage: 'User already joined another room with roomId: abc123',
        }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Join Room')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('tldraw')).not.toBeInTheDocument()
    })

    it('should handle API errors without error message gracefully', async () => {
      mockPost.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Server Error')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to join room')).toBeInTheDocument()
    })

    it('should call join room API with correct parameters', async () => {
      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith({
          param: { roomId: 'test-room-id' },
          json: { userId: 'test-user-id' },
        })
      })
    })
  })

  describe('404 Error Handling', () => {
    it('should display 404 error card when room does not exist (from join)', async () => {
      mockPost.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ errorMessage: 'Room not found' }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Room Not Found')).toBeInTheDocument()
      })

      expect(
        screen.getByText('The room you are trying to access does not exist')
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Return to Lobby' })
      ).toBeInTheDocument()
    })

    it('should display 404 error card when room does not exist (from query)', async () => {
      mockUseLocation.mockReturnValue({
        state: { userId: 'test-user-id', userName: 'Test User' },
      })

      mockGet.mockResolvedValue({
        ok: false,
        status: 404,
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Room Not Found')).toBeInTheDocument()
      })
    })

    it('should navigate to lobby when clicking Return to Lobby on 404 error', async () => {
      const user = userEvent.setup()

      mockPost.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ errorMessage: 'Room not found' }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Room Not Found')).toBeInTheDocument()
      })

      const returnButton = screen.getByRole('button', {
        name: 'Return to Lobby',
      })
      await user.click(returnButton)

      expect(mockNavigate).toHaveBeenCalledWith('/rooms')
    })
  })

  describe('500 Error Handling', () => {
    it('should display 500 error card when server error occurs (from join)', async () => {
      mockPost.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ errorMessage: 'Internal server error' }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Server Error')).toBeInTheDocument()
      })

      expect(
        screen.getByText('Something went wrong on our end')
      ).toBeInTheDocument()
      expect(screen.getByText('Server error occurred')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Return to Lobby' })
      ).toBeInTheDocument()
    })

    it('should display 500 error card when server error occurs (from query)', async () => {
      mockUseLocation.mockReturnValue({
        state: { userId: 'test-user-id', userName: 'Test User' },
      })

      mockGet.mockResolvedValue({
        ok: false,
        status: 503,
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Server Error')).toBeInTheDocument()
      })
    })

    it('should navigate to lobby when clicking Return to Lobby on 500 error', async () => {
      const user = userEvent.setup()

      mockPost.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ errorMessage: 'Internal server error' }),
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Server Error')).toBeInTheDocument()
      })

      const returnButton = screen.getByRole('button', {
        name: 'Return to Lobby',
      })
      await user.click(returnButton)

      expect(mockNavigate).toHaveBeenCalledWith('/rooms')
    })
  })

  describe('Room name handling', () => {
    it('should display room name from location state if available', async () => {
      mockUseLocation.mockReturnValue({
        state: {
          userId: 'test-user-id',
          userName: 'Test User',
          roomName: 'My Custom Room',
        },
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('My Custom Room')).toBeInTheDocument()
      })

      expect(mockGet).not.toHaveBeenCalled()
    })

    it('should fetch room name from API when not in location state', async () => {
      mockUseLocation.mockReturnValue({
        state: { userId: 'test-user-id', userName: 'Test User' },
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith({
          param: { roomId: 'test-room-id' },
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Test Room')).toBeInTheDocument()
      })
    })

    it('should not fetch room data when room name is provided in state', async () => {
      mockUseLocation.mockReturnValue({
        state: {
          userId: 'test-user-id',
          userName: 'Test User',
          roomName: 'State Room Name',
        },
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByTestId('tldraw')).toBeInTheDocument()
      })

      expect(mockGet).not.toHaveBeenCalled()
    })

    it('should display 404 error when room does not exist', async () => {
      mockUseLocation.mockReturnValue({
        state: { userId: 'test-user-id', userName: 'Test User' },
      })

      mockGet.mockResolvedValue({
        ok: false,
        status: 404,
      })

      renderWithProviders(<Room />)

      await waitFor(() => {
        expect(screen.getByText('Room Not Found')).toBeInTheDocument()
      })
    })
  })
})
