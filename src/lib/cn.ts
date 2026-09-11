import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes so a caller's override actually wins.
 *
 * Plain string concatenation leaves both `p-2` and `p-4` in the class list and
 * lets CSS source order decide, which makes component overrides unpredictable.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
