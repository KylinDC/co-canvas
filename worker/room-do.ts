import { type RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import {
  createTLSchema,
  defaultShapeSchemas,
  type TLRecord,
} from '@tldraw/tlschema'
import { DurableObject } from 'cloudflare:workers'
import { throttle } from 'es-toolkit'
import { Hono } from 'hono'

const schema = createTLSchema({
  shapes: { ...defaultShapeSchemas },
  // bindings: { ...defaultBindingSchemas },
})

export class RoomDO extends DurableObject<Env> {
  private bucket: R2Bucket
  private roomId: string | null = null
  private roomPromise: Promise<TLSocketRoom<TLRecord, void>> | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)

    this.bucket = env.ROOM_BUCKET
    void ctx.blockConcurrencyWhile(async () => {
      this.roomId = (await this.ctx.storage.get('roomId')) ?? null
    })
  }

  fetch(request: Request): Response | Promise<Response> {
    return this.app.fetch(request)
  }

  private readonly app = new Hono()
    .onError((e, c) => {
      console.log(e)
      return c.text('Internal Server Error', 500)
    })
    .get('/api/rooms/:roomId/connect', async (ctx) => {
      const { req, text } = ctx
      const roomId = req.param('roomId')
      const sessionId = req.query('sessionId')

      if (!sessionId) {
        return text('Missing sessionId query parameter', 400)
      }

      const clientWebSocket = await this.handleConnect(roomId, sessionId)
      return new Response(null, { status: 101, webSocket: clientWebSocket })
    })

  async handleConnect(roomId: string, sessionId: string): Promise<WebSocket> {
    if (!this.roomId) {
      await this.ctx.blockConcurrencyWhile(async () => {
        await this.ctx.storage.put('roomId', roomId)
        this.roomId = roomId
      })
    }

    const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
    serverWebSocket.accept()

    const room = await this.getRoom()

    room.handleSocketConnect({ sessionId, socket: serverWebSocket })

    return clientWebSocket
  }

  private getRoom() {
    const roomId = this.roomId
    if (!roomId) throw new Error('RoomId is required')

    this.roomPromise ??= (async () => {
      const roomFromBucket = await this.bucket.get(`rooms/${roomId}`)

      const initialSnapshot = roomFromBucket
        ? ((await roomFromBucket.json()) as RoomSnapshot)
        : undefined

      return new TLSocketRoom<TLRecord, void>({
        schema,
        initialSnapshot,
        onDataChange: () => {
          this.schedulePersistToBucket()
        },
      })
    })()

    return this.roomPromise
  }

  private schedulePersistToBucket = throttle(async () => {
    if (!this.roomPromise || !this.roomId) return
    const room = await this.getRoom()

    const snapshot = JSON.stringify(room.getCurrentSnapshot())
    await this.bucket.put(`rooms/${this.roomId}`, snapshot)
  }, 10_000)
}
