import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Home } from './pages/Home.tsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/api.ts'
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
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
