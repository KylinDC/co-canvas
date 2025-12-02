import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'

import { Room } from './Room'
import * as userLib from '@/lib/user.ts'
import { renderWithProviders } from '@/test-utils'

const mockNavigate = vi.fn()
const mockUseParams = vi.fn()
const mockUseLocation = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
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

const mockUseSync = vi.fn()
vi.mock('@tldraw/sync', () => ({
  useSync: (config: any) => mockUseSync(config),
}))

vi.mock('tldraw', () => ({
  Tldraw: ({ store }: { store: any }) => (
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
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('should redirect to home when userId exists but userName is missing', async () => {
    vi.mocked(userLib.getUserId).mockReturnValue('test-user-id')
    vi.mocked(userLib.getUserName).mockReturnValue(null)

    renderWithProviders(<Room />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('should redirect to home when userName exists but userId is missing', async () => {
    vi.mocked(userLib.getUserId).mockReturnValue(null)
    vi.mocked(userLib.getUserName).mockReturnValue('Test User')

    renderWithProviders(<Room />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
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

  it('should display room ID in header', () => {
    mockUseParams.mockReturnValue({ roomId: 'my-test-room' })

    renderWithProviders(<Room />)

    expect(screen.getByText('my-test-room')).toBeInTheDocument()
  })

  it('should display copy link button', () => {
    renderWithProviders(<Room />)

    expect(
      screen.getByRole('button', { name: 'copy room link' })
    ).toBeInTheDocument()
  })

  it('should copy room link to clipboard when copy button is clicked', async () => {
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

    expect(mockWriteText).toHaveBeenCalledWith(
      'http://localhost:5173/rooms/test-room-id'
    )
  })

  it('should show "Copied!" message after copying link', async () => {
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
  })

  it('should hide "Copied!" message after 3 seconds', async () => {
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
})
