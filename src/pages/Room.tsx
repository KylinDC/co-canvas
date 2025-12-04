import './room.css'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useSync } from '@tldraw/sync'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type NavigateFunction,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router'
import { toast,Toaster } from 'sonner'
import { type Editor, type TLAssetStore, Tldraw } from 'tldraw'

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
import type { RoomType } from '@/pages/Lobby.tsx'

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

  const [errorType, setErrorType] = useState<
    '404' | '500' | 'already-joined' | null
  >(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [existingRoomId, setExistingRoomId] = useState<string | null>(null)
  const editorRef = useRef<Editor | null>(null)

  const { data: userRoomData } = useQuery({
    queryKey: ['user-room', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await client.api.rooms.$get({
        query: { userId },
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
      const json = await res.json()
      return json as RoomType[]
    },
    enabled: !!userId,
    retry: false,
  })

  const currentRoomData = userRoomData?.find((room) => room.roomId === roomId)
  const roomName = roomNameFromState ?? currentRoomData?.roomName
  const isCurrentUserHost = currentRoomData?.isCurrentUserHost ?? false
  const isRoomOpen = currentRoomData?.isOpen ?? false

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

      // Check if message contains "already joined another room" pattern
      if (message.includes('already joined another room')) {
        const roomIdMatch = /roomId:\s*([a-zA-Z0-9-]+)/.exec(message)
        if (roomIdMatch) {
          setExistingRoomId(roomIdMatch[1])
        }
      }

      setErrorMessage(message)
    },
  })

  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !roomId) {
        throw new Error('Missing userId or roomId')
      }
      const res = await client.api.rooms[':roomId'].leave.$post({
        param: { roomId },
        json: { userId },
      })

      if (!res.ok) {
        throw new Error('Failed to leave room')
      }

      return await res.text()
    },
    onSuccess: () => {
      void navigate('/rooms')
    },
    onError: (error) => {
      console.error('Failed to leave room:', error)
    },
  })

  const closeRoomMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !roomId) {
        throw new Error('Missing userId or roomId')
      }
      const res = await client.api.rooms[':roomId'].close.$post({
        param: { roomId },
        json: { userId },
      })

      if (!res.ok) {
        throw new Error('Failed to close room')
      }

      return await res.text()
    },
    onSuccess: () => {
      void navigate('/rooms')
    },
    onError: (error) => {
      console.error('Failed to close room:', error)
    },
  })

  useEffect(() => {
    if (!userId || !userName) {
      void navigate(`/?redirect=${encodeURIComponent(`/rooms/${roomId}`)}`)
    }
  }, [navigate, userId, userName, roomId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore mutation
  useEffect(() => {
    if (userId && roomId) {
      joinRoomMutation.mutate()
    }
  }, [userId, roomId])

  // eslint-ignore
  // biome-ignore lint/correctness/useExhaustiveDependencies: force to refresh
  useEffect(() => {
    setErrorType(null)
    setErrorMessage(null)
    setExistingRoomId(null)
  }, [roomId])

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateInstanceState({ isReadonly: !isRoomOpen })
    }
  }, [isRoomOpen])

  const handleCustomMessage = useCallback(
    (data: { type: string; userName?: string; message?: string }) => {
      if (data.type === 'room-closed') {
        toast.warning('Room has been closed', {
          description:
            'Room has been closed by host, you should not update the canva',
        })

        if (editorRef.current) {
          editorRef.current.updateInstanceState({ isReadonly: true })
        }
      } else if (data.type === 'user-joined' && data.userName) {
        toast.info(`${data.userName} joined the room`)
      } else if (data.type === 'user-left' && data.userName) {
        toast.info(`${data.userName} left the room`)
      }
    },
    []
  )

  const userInfo = useMemo(
    () => ({ id: userId ?? '', name: userName }),
    [userId, userName]
  )

  const store = useSync({
    uri: `${window.location.origin}/api/rooms/${roomId}/connect?userId=${userId}&userName=${encodeURIComponent(userName ?? '')}`,
    assets: multiplayerAssetStore,
    userInfo,
    onCustomMessageReceived: handleCustomMessage,
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
    <>
      <RoomWrapper
        roomId={roomId}
        roomName={roomName}
        navigate={navigate}
        isCurrentUserHost={isCurrentUserHost}
        isRoomOpen={isRoomOpen}
        onLeaveRoom={() => leaveRoomMutation.mutate()}
        onCloseRoom={() => closeRoomMutation.mutate()}
      >
        <Tldraw
          store={store}
          deepLinks
          licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
          onMount={(editor) => {
            editorRef.current = editor
            editor.updateInstanceState({ isReadonly: !isRoomOpen })
          }}
        />
      </RoomWrapper>
      <Toaster />
    </>
  )
}

function RoomWrapper({
  children,
  roomName,
  navigate,
  isCurrentUserHost,
  isRoomOpen,
  onLeaveRoom,
  onCloseRoom,
}: {
  children: ReactNode
  roomId?: string
  roomName?: string
  navigate: NavigateFunction
  isCurrentUserHost: boolean
  isRoomOpen: boolean
  onLeaveRoom: () => void
  onCloseRoom: () => void
}) {
  const [didCopy, setDidCopy] = useState(false)

  useEffect(() => {
    if (!didCopy) return
    const timeout = setTimeout(() => setDidCopy(false), 3000)
    return () => clearTimeout(timeout)
  }, [didCopy])

  return (
    <div className='RoomWrapper'>
      <div
        className='RoomWrapper-header'
        style={{ justifyContent: 'space-between' }}
      >
        <div className='flex items-center gap-4'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              void navigate('/rooms')
            }}
            aria-label='back to lobby'
          >
            ← Back to Lobby
          </Button>
          <div>{roomName}</div>
        </div>
        <div className='flex gap-2'>
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
          {isCurrentUserHost ? (
            <Button
              type='button'
              variant='destructive'
              size='sm'
              onClick={onCloseRoom}
              aria-label='close room'
              disabled={!isRoomOpen}
            >
              Close Room
            </Button>
          ) : (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onLeaveRoom}
              aria-label='leave room'
              disabled={!isRoomOpen}
            >
              Leave Room
            </Button>
          )}
        </div>
      </div>
      <div className='RoomWrapper-content'>{children}</div>
    </div>
  )
}
