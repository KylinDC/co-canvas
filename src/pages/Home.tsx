import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getNewUserId, getUserId, getUserName, saveUser } from '@/lib/user.ts'

export function Home() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [userExisted, setUserExisted] = useState(true)

  useEffect(() => {
    const userName = getUserName()
    const userId = getUserId()

    if (userId && userName) {
      void navigate('/rooms', { state: { userId, userName } })
    } else {
      setUserExisted(false)
    }
  }, [navigate])

  const handleCreateUser = (e: FormEvent) => {
    e.preventDefault()
    const newUserName = name.trim()
    if (newUserName) {
      const newUserId = getNewUserId()
      saveUser(newUserId, newUserName)
      void navigate('/rooms', {
        state: { userId: newUserId, userName: newUserName },
      })
    }
  }

  if (userExisted) {
    return
  }

  return (
    <div className='flex items-center min-h-screen justify-center w-screen'>
      <Card className='w-full max-w-sm flex justify-center'>
        <CardHeader>
          <CardTitle>Welcome to Co-Canva</CardTitle>
          <CardDescription>
            Enter your name to start using Co-Canva
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser}>
            <div className='flex flex-col gap-6'>
              <div className='grid gap-2'>
                <Label htmlFor='name'>Name</Label>
                <Input
                  id='name'
                  type='text'
                  placeholder='Enter your name'
                  required
                  autoFocus
                  autoComplete='off'
                  value={name.trimStart()}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <Button type='submit' className='w-full mt-[50px]'>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
