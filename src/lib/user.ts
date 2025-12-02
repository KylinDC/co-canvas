import { v7 as uuidv7 } from 'uuid'

const USER_ID_KEY = 'co-canvas-user-id'
const USER_NAME_KEY = 'co-canvas-user-name'

export const getUserId = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  return localStorage.getItem(USER_ID_KEY)
}

export const saveUser = (id: string, name: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_ID_KEY, id)
    localStorage.setItem(USER_NAME_KEY, name)
  }
}

export const getUserName = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(USER_NAME_KEY)
}

export const getNewUserId = () => uuidv7()
