import { useSync } from '@tldraw/sync'
import { type ReactNode, useEffect, useState } from 'react'
import './room.css'
import { type TLAssetStore, Tldraw } from 'tldraw'
import { useLocation, useNavigate, useParams } from 'react-router'
import { getUserId, getUserName } from '@/lib/user.ts'

export const multiplayerAssetStore: TLAssetStore = {
  async upload(_asset, _file) {
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
      navigate('/')
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
          className='RoomWrapper-copy'
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
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
