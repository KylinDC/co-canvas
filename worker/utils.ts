import { faker } from '@faker-js/faker/locale/en'

export const generateRandomRoomName = () => {
  const fakeAdj = faker.word.adjective({
    length: { min: 3, max: 6 },
    strategy: 'closest',
  })
  const fakeNoun = faker.word.noun({
    length: { min: 3, max: 6 },
    strategy: 'closest',
  })
  return `${fakeAdj}-${fakeNoun}`
}
