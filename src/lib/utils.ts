import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// css util added by tailwind css
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
