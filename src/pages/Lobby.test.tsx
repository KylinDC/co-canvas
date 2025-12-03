import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as apiLib from '@/lib/api.ts'
import * as userLib from '@/lib/user.ts'
import { renderWithProviders } from '@/test-utils'

import { Lobby } from './Lobby'

const mockNavigate = vi.fn()
const mockUseLocation = vi.fn()

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,

    useLocation: () => mockUseLocation(),
  }
})

vi.mock('@/lib/user.ts', () => ({
  getUserId: vi.fn(),
  getUserName: vi.fn(),
}))

vi.mock('@/lib/api.ts', () => ({
  client: {
    api: {
      rooms: {
        $get: vi.fn(),
        $post: vi.fn(),
      },
    },
  },
}))

describe('Lobby', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    })

    vi.mocked(userLib.getUserId).mockReturnValue('test-user-id')
    vi.mocked(userLib.getUserName).mockReturnValue('Test User')
    mockUseLocation.mockReturnValue({ state: null })
  })

  it('should redirect to home when no user exists', async () => {
    vi.mocked(userLib.getUserId).mockReturnValue(null)
    vi.mocked(userLib.getUserName).mockReturnValue(null)

    renderWithProviders(<Lobby />, { queryClient })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('should show loading state while fetching room data', () => {
    vi.mocked(apiLib.client.api.rooms.$get).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      new Promise<never>(() => {})
    )

    renderWithProviders(<Lobby />, { queryClient })

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should show create room button when user has no room', async () => {
    vi.mocked(apiLib.client.api.rooms.$get).mockResolvedValue({
      ok: true,
      status: 404,

      json: async () => null,
    } as never)

    renderWithProviders(<Lobby />, { queryClient })

    await waitFor(() => {
      expect(screen.getByText('Welcome Test User')).toBeInTheDocument()
    })

    expect(
      screen.getByText('Create a new room to get started')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create a Room' })
    ).toBeInTheDocument()
  })

  it('should show enter room button when user already has a room', async () => {
    vi.mocked(apiLib.client.api.rooms.$get).mockResolvedValue({
      ok: true,
      status: 200,

      json: async () => ({ roomId: 'existing-room-id' }),
    } as never)

    renderWithProviders(<Lobby />, { queryClient })

    await waitFor(() => {
      expect(screen.getByText('Welcome Test User')).toBeInTheDocument()
    })

    expect(screen.getByText('You are already in a room')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enter Room' })
    ).toBeInTheDocument()
  })

  it('should navigate to existing room when clicking Enter Room', async () => {
    const user = userEvent.setup()

    vi.mocked(apiLib.client.api.rooms.$get).mockResolvedValue({
      ok: true,
      status: 200,

      json: async () => ({ roomId: 'existing-room-id' }),
    } as never)

    renderWithProviders(<Lobby />, { queryClient })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Enter Room' })
      ).toBeInTheDocument()
    })

    const enterButton = screen.getByRole('button', { name: 'Enter Room' })
    await user.click(enterButton)

    expect(mockNavigate).toHaveBeenCalledWith('/rooms/existing-room-id', {
      state: { userId: 'test-user-id', userName: 'Test User' },
    })
  })

  it('should create room and navigate when clicking Create a Room', async () => {
    const user = userEvent.setup()

    vi.mocked(apiLib.client.api.rooms.$get).mockResolvedValue({
      ok: true,
      status: 404,

      json: async () => null,
    } as never)

    vi.mocked(apiLib.client.api.rooms.$post).mockResolvedValue({
      ok: true,
      status: 200,

      json: async () => ({ id: 'new-room-id' }),
    } as never)

    renderWithProviders(<Lobby />, { queryClient })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create a Room' })
      ).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: 'Create a Room' })
    await user.click(createButton)

    await waitFor(() => {
      expect(apiLib.client.api.rooms.$post).toHaveBeenCalledWith({
        json: {
          userId: 'test-user-id',
          name: "Test User's Room",
        },
      })
      expect(mockNavigate).toHaveBeenCalledWith('/rooms/new-room-id', {
        state: { userId: 'test-user-id', userName: 'Test User' },
      })
    })
  })

  it('should show creating state while creating room', async () => {
    const user = userEvent.setup()

    vi.mocked(apiLib.client.api.rooms.$get).mockResolvedValue({
      ok: true,
      status: 404,

      json: async () => null,
    } as never)

    vi.mocked(apiLib.client.api.rooms.$post).mockReturnValue(
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,

            json: async () => ({ id: 'new-room-id' }),
          } as never)
        }, 100)
      })
    )

    renderWithProviders(<Lobby />, { queryClient })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create a Room' })
      ).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: 'Create a Room' })
    await user.click(createButton)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Creating...' })
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
    })
  })

  it('should use location state for userId and userName when available', async () => {
    mockUseLocation.mockReturnValue({
      state: { userId: 'location-user-id', userName: 'Location User' },
    })

    vi.mocked(apiLib.client.api.rooms.$get).mockResolvedValue({
      ok: true,
      status: 404,

      json: async () => null,
    } as never)

    renderWithProviders(<Lobby />, { queryClient })

    await waitFor(() => {
      expect(screen.getByText('Welcome Location User')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(apiLib.client.api.rooms.$get).toHaveBeenCalledWith({
        query: {
          userId: 'location-user-id',
        },
      })
    })
  })
})
