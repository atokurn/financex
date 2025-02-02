import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { endOfDay, startOfDay } from "date-fns"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let whereClause: any = {
      userId: user.id
    }

    if (startDate && endDate) {
      whereClause.orderAt = {
        gte: startOfDay(new Date(startDate)),
        lte: endOfDay(new Date(endDate))
      }
    }

    const orders = await db.order.findMany({
      where: whereClause,
      orderBy: {
        orderAt: "desc",
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()

    // Check if orderId already exists for this user
    const existingOrder = await db.order.findFirst({
      where: {
        orderId: body.orderId,
        userId: user.id
      }
    })

    if (existingOrder) {
      return NextResponse.json(
        { error: "Order with this ID already exists" },
        { status: 400 }
      )
    }

    const order = await db.order.create({
      data: {
        ...body,
        userId: user.id
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error creating order:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}
