import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { client } from '@/lib/api.ts'
import { getUserId, getUserName } from '@/lib/user.ts'

export interface RoomType {
  roomId: string
  roomName: string
  isOpen: boolean
  isCurrentUserHost: boolean
}

interface RoomItemProps {
  room: RoomType
  onEnterRoom: (roomId: string, roomName: string) => void
}

const RoomItem = ({ room, onEnterRoom }: RoomItemProps) => (
  <div
    className={`flex items-center justify-between p-3 rounded-lg border ${
      room.isOpen
        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
        : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800'
    }`}
  >
    <div className='flex flex-col'>
      <span className='font-medium text-sm'>{room.roomName}</span>
      <span className='text-xs text-muted-foreground'>
        {room.isOpen ? 'Open' : 'Closed'} •{' '}
        {room.isCurrentUserHost ? 'Host' : 'Member'}
      </span>
    </div>
    <Button
      size='sm'
      variant='outline'
      onClick={() => onEnterRoom(room.roomId, room.roomName)}
    >
      Enter
    </Button>
  </div>
)

export const Lobby = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { userId: string; userName: string } | null
  const userId = state?.userId ?? getUserId()
  const userName = state?.userName ?? getUserName()

  useEffect(() => {
    if (!userId || !userName) {
      void navigate('/')
    }
  }, [navigate, userId, userName])

  const { isPending, data: roomData } = useQuery({
    queryKey: ['user-room', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await client.api.rooms.$get({
        query: {
          userId,
        },
      })
      if (!res.ok) {
        if (res.status === 404) {
          return null
        }
        throw new Error(res.statusText)
      }
      const json = await res.json()
      return json as RoomType[]
    },
    enabled: !!userId,
    retry: false,
  })

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !userName) throw new Error('User not found')
      const res = await client.api.rooms.$post({
        json: {
          userId,
          name: `${userName}'s Room`,
        },
      })
      if (!res.ok) {
        const errorData = (await res.json()) as { errorMessage?: string }
        throw new Error(errorData.errorMessage ?? res.statusText)
      }
      return await res.json()
    },
    onSuccess: (data) => {
      void navigate(`/rooms/${data.id}`, {
        state: { userId, userName },
      })
    },
    onError: (error) => {
      console.error('Failed to create room:', error)
      toast.error('Failed to create room', {
        description: error.message,
      })
    },
  })

  const handleEnterRoom = (roomId: string, roomName: string) => {
    void navigate(`/rooms/${roomId}`, {
      state: { userId, userName, roomName },
    })
  }

  const handleCreateRoom = () => {
    void createRoomMutation.mutate()
  }

  if (isPending) {
    return (
      <div className='flex items-center min-h-screen justify-center w-screen'>
        <div className='text-lg'>Loading...</div>
      </div>
    )
  }

  const rooms = roomData ?? []
  const openRoom = rooms.find((room) => room.isOpen)
  const hasOpenRoom = !!openRoom

  return (
    <div className='flex items-center min-h-screen justify-center w-screen'>
      <Card className='w-full max-w-md flex justify-center'>
        <CardHeader>
          <CardTitle>Welcome {userName}</CardTitle>
          <CardDescription>
            {hasOpenRoom
              ? 'You have an active room'
              : rooms.length > 0
                ? 'All your rooms are closed. Create a new one!'
                : 'Create a new room to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent className='w-full space-y-4'>
          {rooms.length > 0 && (
            <div className='space-y-2'>
              <div className='text-sm font-medium text-muted-foreground'>
                Your Rooms
              </div>
              <div className='space-y-2'>
                {rooms.map((room) => (
                  <RoomItem
                    key={room.roomId}
                    room={room}
                    onEnterRoom={handleEnterRoom}
                  />
                ))}
              </div>
            </div>
          )}
          {hasOpenRoom ? (
            <Button
              onClick={() =>
                openRoom && handleEnterRoom(openRoom.roomId, openRoom.roomName)
              }
              className='w-full'
            >
              Enter Open Room
            </Button>
          ) : (
            <Button
              onClick={handleCreateRoom}
              className='w-full'
              disabled={createRoomMutation.isPending}
            >
              {createRoomMutation.isPending ? 'Creating...' : 'Create a Room'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
