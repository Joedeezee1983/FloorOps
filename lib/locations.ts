import { prisma } from '@/lib/db'
import type { LocationSummary } from '@/types'

/**
 * Returns all active locations for use in dropdowns and selectors.
 */
export async function getActiveLocations(): Promise<LocationSummary[]> {
  return prisma.location.findMany({
    where: { isActive: true },
    select: { id: true, name: true, floorNumber: true, isActive: true },
    orderBy: { name: 'asc' },
  })
}
