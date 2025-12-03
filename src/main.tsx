import './index.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import { ErrorBoundary } from '@/components/ErrorBoundary.tsx'
import { queryClient } from '@/lib/api.ts'
import { Home } from '@/pages/Home.tsx'
import { Lobby } from '@/pages/Lobby.tsx'
import { Room } from '@/pages/Room.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  { path: '/rooms', Component: Lobby },
  {
    path: '/rooms/:roomId',
    Component: Room,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
)
