import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    const material = await db.material.findUnique({
      where: {
        id: id,
      },
    })

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(material)
  } catch (error) {
    console.error("Get material error:", error)
    return NextResponse.json(
      { error: "Failed to fetch material" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const data = await request.json()

    const material = await db.material.update({
      where: {
        id: id,
      },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        unit: data.unit,
        price: data.price,
        stock: data.stock,
        minStock: data.minStock,
        category: data.category,
        status: data.status,
      },
    })

    return NextResponse.json(material)
  } catch (error) {
    console.error("Update material error:", error)
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    await db.material.delete({
      where: {
        id: id,
      },
    })

    return NextResponse.json({
      message: "Material deleted successfully",
    })
  } catch (error) {
    console.error("Delete material error:", error)
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    )
  }
}
