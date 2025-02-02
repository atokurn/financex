import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get unique descriptions from existing expenses
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        items: {
          select: {
            description: true,
          },
        },
      },
    })

    // Extract and deduplicate descriptions
    const descriptionsSet = new Set<string>()
    expenses.forEach(expense => {
      expense.items.forEach(item => {
        if (item.description) {
          descriptionsSet.add(item.description)
        }
      })
    })

    // Convert Set to Array and ensure it's never undefined
    const descriptions = Array.from(descriptionsSet)

    return NextResponse.json({ descriptions })
  } catch (error) {
    console.error('Error fetching descriptions:', error)
    return NextResponse.json({ descriptions: [] }, { status: 500 })
  }
}
