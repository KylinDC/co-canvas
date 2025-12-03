import { QueryClient } from '@tanstack/react-query'
import { hc } from 'hono/client'

import type { AppType } from '../../worker/route.ts'

export const queryClient = new QueryClient()
export const client = hc<AppType>('/')
