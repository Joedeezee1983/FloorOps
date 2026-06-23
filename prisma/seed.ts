import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../utils/password'

const prisma = new PrismaClient()

const SEED_EMAIL = 'Joseph.Dobbs@jay-de.com'
const SEED_NAME = 'Joseph Dobbs'
const SEED_PASSWORD = 'changeme123'

async function main(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: ['joe@jay-de.com', SEED_EMAIL] } } })

  const location = await prisma.location.upsert({
    where: { id: 'loc_main_floor' },
    update: {},
    create: {
      id: 'loc_main_floor',
      name: 'Main Floor',
      description: 'Primary production floor',
      floorNumber: 1,
    },
  })

  const password = await hashPassword(SEED_PASSWORD)

  const user = await prisma.user.create({
    data: {
      name: SEED_NAME,
      email: SEED_EMAIL,
      password,
      role: 'ADMIN',
    },
  })

  console.log(`Seeded location: ${location.name} (id: ${location.id})`)
  console.log(`Seeded ADMIN user: ${user.name} <${user.email}> (id: ${user.id})`)
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
