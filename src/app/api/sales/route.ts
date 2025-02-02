import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const sales = await db.sale.findMany({
      where: {
        userId: user.id,
        ...(startDate && endDate
          ? {
              orderAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }
          : {}),
      },
      orderBy: {
        orderAt: "desc",
      },
    })

    return NextResponse.json(sales)
  } catch (error) {
    console.error("Error fetching sales:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()

    // Check if orderId already exists for this user
    const existingSale = await db.sale.findFirst({
      where: {
        orderId: body.orderId,
        userId: user.id
      }
    })

    if (existingSale) {
      return NextResponse.json(
        { error: "Sale with this Order ID already exists" },
        { status: 400 }
      )
    }

    const sale = await db.sale.create({
      data: {
        ...body,
        userId: user.id,
        income: parseFloat(body.income),
        priceAfterDiscount: parseFloat(body.priceAfterDiscount),
        totalFees: parseFloat(body.totalFees),
        platformFees: parseFloat(body.platformFees),
        affiliateCommission: parseFloat(body.affiliateCommission),
        refund: parseFloat(body.refund),
        orderAt: new Date(body.orderAt)
      }
    })

    return NextResponse.json(sale)
  } catch (error) {
    console.error("Error creating sale:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    )
  }
}
