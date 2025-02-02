import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await requireUser()

    const materials = await db.material.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error("Error fetching materials:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to fetch materials" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()

    // Check if code already exists for this user
    const existingMaterial = await db.material.findFirst({
      where: {
        code: body.code,
        userId: user.id
      }
    })

    if (existingMaterial) {
      return NextResponse.json(
        { error: "Material with this code already exists" },
        { status: 400 }
      )
    }

    const material = await db.material.create({
      data: {
        ...body,
        userId: user.id,
        price: parseFloat(body.price),
        stock: parseInt(body.stock),
        minStock: parseInt(body.minStock)
      }
    })

    return NextResponse.json(material)
  } catch (error) {
    console.error("Error creating material:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    )
  }
}
