import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let data
    try {
      data = await req.json()
    } catch (parseError) {
      console.error('Error parsing request:', parseError)
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 })
    }
    
    // Convert string numbers to actual numbers
    const parsedItems = data.items.map((item: any) => {
      if (!item.description) {
        throw new Error('Item description is required')
      }
      return {
        description: item.description,
        price: typeof item.price === 'string' ? parseFloat(item.price) : item.price
      }
    })
    
    const total = typeof data.total === 'string' ? parseFloat(data.total) : data.total

    if (isNaN(total) || total <= 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 })
    }

    // Create expense with items
    const expense = await prisma.expense.create({
      data: {
        userId: session.user.id,
        payee: data.payee || null,
        category: data.category || 'operational',
        reference: data.reference || null,
        notes: data.notes || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime || null,
        paymentType: data.paymentType || 'cash',
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        total,
        items: {
          create: parsedItems
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json({
      success: true,
      expense
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    if (error instanceof Error) {
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { 
        status: 400 
      })
    }
    return NextResponse.json({ 
      success: false,
      error: 'Internal Server Error' 
    }, { 
      status: 500 
    })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: session.user.id
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { payee: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (startDate || endDate) {
      where.dueDate = {}
      if (startDate) {
        where.dueDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate)
      }
    }

    // Get expenses
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.expense.count({ where })
    ])

    return NextResponse.json({
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
