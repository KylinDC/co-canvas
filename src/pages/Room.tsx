import './room.css'

import { useSync } from '@tldraw/sync'
import { type ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { type TLAssetStore, Tldraw } from 'tldraw'

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

  useEffect(() => {
    if (!userId || !userName) {
      void navigate('/')
    }
  }, [navigate, userId, userName])

  const store = useSync({
    uri: `${window.location.origin}/api/rooms/${roomId}/connect?userId=${userId}`,
    assets: multiplayerAssetStore,
    userInfo: { id: userId ?? '', name: userName },
  })

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
