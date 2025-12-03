import './room.css'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useSync } from '@tldraw/sync'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  type NavigateFunction,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router'
import { type TLAssetStore, Tldraw } from 'tldraw'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { client } from '@/lib/api.ts'
import { getUserId, getUserName } from '@/lib/user.ts'

// eslint-disable-next-line react-refresh/only-export-components
export const multiplayerAssetStore: TLAssetStore = {
  async upload() {
    const url = `${window.location.origin}/api/uploads`
    return { src: url }
  },

  resolve(asset) {
    return asset.props.src
  },
}

function getBackToLobbyButton(navigate: NavigateFunction) {
  return (
    <Button
      onClick={() => {
        void navigate('/rooms')
      }}
      className='flex-1'
    >
      Return to Lobby
    </Button>
  )
}

export function Room() {
  const location = useLocation()
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()

  const state = location.state as {
    userId: string
    userName: string
    roomName?: string
  } | null
  const userId = state?.userId ?? getUserId()
  const userName = state?.userName ?? getUserName()
  const roomNameFromState = state?.roomName

  const hasJoinedRoom = useRef(false)
  const [errorType, setErrorType] = useState<
    '404' | '500' | 'already-joined' | null
  >(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [existingRoomId, setExistingRoomId] = useState<string | null>(null)

  const { data: roomData } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      if (!roomId) return null
      const res = await client.api.rooms[':roomId'].$get({
        param: { roomId },
      })
      if (!res.ok) {
        if (res.status === 404) {
          setErrorType('404')
          setErrorMessage('Room not found')
          throw new Error('Room not found')
        }
        if (res.status >= 500) {
          setErrorType('500')
          setErrorMessage('Server error occurred')
          throw new Error('Server error occurred')
        }
        throw new Error(res.statusText)
      }
      return (await res.json()) as { id: string; name: string }
    },
    enabled: !!roomId && !roomNameFromState,
    retry: false,
  })

  const roomName = roomNameFromState ?? roomData?.name

  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !roomId) {
        throw new Error('Missing userId or roomId')
      }
      const res = await client.api.rooms[':roomId'].join.$post({
        param: { roomId },
        json: { userId },
      })

      if (!res.ok) {
        if (res.status === 404) {
          setErrorType('404')
          setErrorMessage('Room not found')
          throw new Error('Room not found')
        }
        if (res.status >= 500) {
          setErrorType('500')
          setErrorMessage('Server error occurred')
          throw new Error('Server error occurred')
        }

        const errorData = (await res.json()) as { errorMessage?: string }
        const message = errorData.errorMessage ?? 'Failed to join room'

        if (message.includes('already joined another room')) {
          setErrorType('already-joined')
        } else {
          setErrorType('500')
        }

        throw new Error(message)
      }

      return await res.json()
    },
    onError: (error) => {
      console.error('Failed to join room:', error)
      const message = error.message

      if (errorType === 'already-joined') {
        const roomIdMatch = /roomId:\s*([a-zA-Z0-9-]+)/.exec(message)
        if (roomIdMatch) {
          setExistingRoomId(roomIdMatch[1])
        }
      }

      setErrorMessage(message)
    },
  })

  useEffect(() => {
    if (!userId || !userName) {
      void navigate(`/?redirect=${encodeURIComponent(`/rooms/${roomId}`)}`)
    }
  }, [navigate, userId, userName, roomId])

  useEffect(() => {
    if (userId && roomId && !hasJoinedRoom.current) {
      joinRoomMutation.mutate()
      hasJoinedRoom.current = true
    }
  }, [userId, roomId, joinRoomMutation])

  // biome-ignore lint/correctness/useExhaustiveDependencies: force to refresh
  useEffect(() => {
    setErrorType(null)
    setErrorMessage(null)
    setExistingRoomId(null)
    hasJoinedRoom.current = false
  }, [roomId])

  const store = useSync({
    uri: `${window.location.origin}/api/rooms/${roomId}/connect?userId=${userId}`,
    assets: multiplayerAssetStore,
    userInfo: { id: userId ?? '', name: userName },
  })

  if (errorType === '404') {
    return (
      <div className='flex items-center min-h-screen justify-center w-screen'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Room Not Found</CardTitle>
            <CardDescription>
              The room you are trying to access does not exist
            </CardDescription>
          </CardHeader>
          <CardFooter>{getBackToLobbyButton(navigate)}</CardFooter>
        </Card>
      </div>
    )
  }

  if (errorType === '500') {
    return (
      <div className='flex items-center min-h-screen justify-center w-screen'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Server Error</CardTitle>
            <CardDescription>Something went wrong on our end</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant='destructive'>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {errorMessage ?? 'An unexpected server error occurred'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>{getBackToLobbyButton(navigate)}</CardFooter>
        </Card>
      </div>
    )
  }

  if (errorType === 'already-joined') {
    return (
      <div className='flex items-center min-h-screen justify-center w-screen'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Unable to Join Room</CardTitle>
            <CardDescription>
              You have already joined another room
            </CardDescription>
          </CardHeader>
          <CardFooter className='flex gap-2'>
            {getBackToLobbyButton(navigate)}
            {existingRoomId && (
              <Button
                variant='outline'
                onClick={() => {
                  void navigate(`/rooms/${existingRoomId}`)
                }}
                className='flex-1'
              >
                Go to Current Room
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <RoomWrapper roomId={roomId} roomName={roomName}>
      <Tldraw store={store} deepLinks />
    </RoomWrapper>
  )
}

function RoomWrapper({
  children,
  roomName,
}: {
  children: ReactNode
  roomId?: string
  roomName?: string
}) {
  const [didCopy, setDidCopy] = useState(false)

  useEffect(() => {
    if (!didCopy) return
    const timeout = setTimeout(() => setDidCopy(false), 3000)
    return () => clearTimeout(timeout)
  }, [didCopy])

  return (
    <div className='RoomWrapper'>
      <div className='RoomWrapper-header'>
        <div>{roomName}</div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href)
            setDidCopy(true)
          }}
          aria-label='copy room link'
        >
          {didCopy ? 'Copied!' : 'Copy link'}
        </Button>
      </div>
      <div className='RoomWrapper-content'>{children}</div>
    </div>
  )
}
