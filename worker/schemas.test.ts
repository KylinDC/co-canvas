import { v7 as uuidv7 } from 'uuid'
import { describe, expect, it } from 'vitest'

import { createRoomReq } from './schemas.ts'

describe('schemas', () => {
  describe('createRoomReq', () => {
    it('should validate correct data', () => {
      const validData = {
        userId: uuidv7(),
        name: 'Test Room',
      }

      const result = createRoomReq.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe(validData.userId)
        expect(result.data.name).toBe(validData.name)
      }
    })

    it('should reject invalid userId', () => {
      const invalidData = {
        userId: 'not-a-uuid',
        name: 'Test Room',
      }

      const result = createRoomReq.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing userId', () => {
      const invalidData = {
        name: 'Test Room',
      }

      const result = createRoomReq.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing name', () => {
      const invalidData = {
        userId: uuidv7(),
      }

      const result = createRoomReq.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject non-string name', () => {
      const invalidData = {
        userId: uuidv7(),
        name: 123,
      }

      const result = createRoomReq.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty object', () => {
      const result = createRoomReq.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})
