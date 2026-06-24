import { prisma } from '@/lib/db'
import type { BlueprintSummary } from '@/types'

const BLUEPRINT_SELECT = {
  id: true,
  locationId: true,
  imageUrl: true,
  opacity: true,
} as const

/**
 * Returns the floor blueprint for a specific location, or null if none uploaded.
 */
export async function getBlueprintForLocation(locationId: string): Promise<BlueprintSummary | null> {
  return prisma.floorBlueprint.findUnique({
    where: { locationId },
    select: BLUEPRINT_SELECT,
  })
}

/**
 * Returns the first available floor blueprint across all locations.
 * Used when a location-specific context is not available.
 */
export async function getFirstBlueprint(): Promise<BlueprintSummary | null> {
  return prisma.floorBlueprint.findFirst({
    select: BLUEPRINT_SELECT,
    orderBy: { updatedAt: 'desc' },
  })
}

/**
 * Creates or updates the floor blueprint for a location.
 * A location can only have one blueprint; uploading again replaces it.
 */
export async function upsertBlueprint(
  locationId: string,
  imageUrl: string,
  opacity: number
): Promise<BlueprintSummary> {
  return prisma.floorBlueprint.upsert({
    where: { locationId },
    create: { locationId, imageUrl, opacity },
    update: { imageUrl, opacity },
    select: BLUEPRINT_SELECT,
  })
}

/**
 * Updates only the opacity for an existing blueprint without changing the image.
 */
export async function updateBlueprintOpacity(
  locationId: string,
  opacity: number
): Promise<BlueprintSummary | null> {
  try {
    return await prisma.floorBlueprint.update({
      where: { locationId },
      data: { opacity },
      select: BLUEPRINT_SELECT,
    })
  } catch {
    return null
  }
}
