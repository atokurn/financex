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

    const sale = await prisma.sale.findUnique({
      where: {
        id: params.id,
      },
    })

    if (!sale) {
      return new NextResponse("Sale not found", { status: 404 })
    }

    return NextResponse.json(sale)
  } catch (error) {
    console.error("[SALE_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
