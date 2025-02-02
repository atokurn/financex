import { PrismaClient } from "@prisma/client"

declare global {
  var prisma: PrismaClient | undefined
}

export const db = globalThis.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db
}

// Test database connection
db.$connect()
  .then(() => {
    console.log('Successfully connected to the database')
  })
  .catch((error) => {
    console.error('Failed to connect to the database:', error)
    process.exit(1)
  })
