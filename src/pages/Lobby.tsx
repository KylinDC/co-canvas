import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { client } from '@/lib/api.ts'
import { getUserId, getUserName } from '@/lib/user.ts'
import { Button } from '@/components/ui/button.tsx'

export const Lobby = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { userId: string; userName: string } | null
  const userId = state?.userId ?? getUserId()
  const userName = state?.userName ?? getUserName()

  useEffect(() => {
    if (!userId || !userName) {
      navigate('/')
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
      return json as { roomId: string }
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
        throw new Error(res.statusText)
      }
      return await res.json()
    },
    onSuccess: (data) => {
      navigate(`/rooms/${data.id}`)
    },
  })

  const handleEnterRoom = () => {
    if (roomData?.roomId) {
      navigate(`/rooms/${roomData.roomId}`)
    }
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

  return (
    <div className='flex items-center min-h-screen justify-center w-screen'>
      <Card className='w-full max-w-sm flex justify-center'>
        <CardHeader>
          <CardTitle>Welcome {userName}</CardTitle>
          <CardDescription>
            {roomData
              ? 'You are already in a room'
              : 'Create a new room to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent className='w-full'>
          {roomData ? (
            <Button onClick={handleEnterRoom} className='w-full'>
              Enter Room
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
