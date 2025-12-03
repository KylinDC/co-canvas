import './room.css'

import { useMutation } from '@tanstack/react-query'
import { useSync } from '@tldraw/sync'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { type TLAssetStore, Tldraw } from 'tldraw'

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

export function Room() {
  const location = useLocation()
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()

  const state = location.state as { userId: string; userName: string } | null
  const userId = state?.userId ?? getUserId()
  const userName = state?.userName ?? getUserName()

  const hasJoinedRoom = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [existingRoomId, setExistingRoomId] = useState<string | null>(null)

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
        const errorData = (await res.json()) as { errorMessage?: string }
        throw new Error(errorData.errorMessage ?? 'Failed to join room')
      }

      return await res.json()
    },
    onError: (error) => {
      console.error('Failed to join room:', error)
      const message = error.message

      const roomIdMatch = /roomId:\s*([a-zA-Z0-9-]+)/.exec(message)
      if (roomIdMatch) {
        setExistingRoomId(roomIdMatch[1])
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
    setErrorMessage(null)
    setExistingRoomId(null)
    hasJoinedRoom.current = false
  }, [roomId])

  const store = useSync({
    uri: `${window.location.origin}/api/rooms/${roomId}/connect?userId=${userId}`,
    assets: multiplayerAssetStore,
    userInfo: { id: userId ?? '', name: userName },
  })

  if (errorMessage) {
    return (
      <div className='flex items-center min-h-screen justify-center w-screen'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Unable to Join Room</CardTitle>
            <CardDescription>
              You have already joined another room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>{errorMessage}</p>
          </CardContent>
          <CardFooter className='flex gap-2'>
            <Button
              onClick={() => {
                void navigate('/rooms')
              }}
              className='flex-1'
            >
              Return to Lobby
            </Button>
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
    <RoomWrapper roomId={roomId}>
      <Tldraw store={store} deepLinks />
    </RoomWrapper>
  )
}

function RoomWrapper({
  children,
  roomId,
}: {
  children: ReactNode
  roomId?: string
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
        <div>{roomId}</div>
        <button
          type='button'
          className='RoomWrapper-copy'
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href)
            setDidCopy(true)
          }}
          aria-label='copy room link'
        >
          Copy link
          {didCopy && <div className='RoomWrapper-copied'>Copied!</div>}
        </button>
      </div>
      <div className='RoomWrapper-content'>{children}</div>
    </div>
  )
}
