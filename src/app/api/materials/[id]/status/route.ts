import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure user is authenticated
    await requireUser()

    const { status } = await request.json()

    // Validate status
    const validStatuses = ['active', 'inactive']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Update material status
    const material = await db.material.update({
      where: { id: params.id },
      data: { status },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Status updated successfully',
      material,
    })

  } catch (error) {
    console.error('Error updating material status:', error)
    return NextResponse.json(
      { error: 'Failed to update material status' },
      { status: 500 }
    )
  }
}
