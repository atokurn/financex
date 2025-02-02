import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const order = await prisma.order.findUnique({
      where: {
        id: params.id,
      },
    })

    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("[ORDER_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
