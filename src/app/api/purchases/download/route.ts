import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Purchase ID is required" },
        { status: 400 }
      );
    }

    // Get the purchase with all related data
    const purchase = await db.purchase.findUnique({
      where: { id, userId: user.id },
      include: {
        items: {
          include: {
            material: true,
            product: true,
          },
        },
        additionalCosts: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    // Format purchase data for the invoice
    const invoiceData = {
      invoiceNumber: purchase.invoiceNumber,
      date: purchase.createdAt.toLocaleDateString(),
      supplier: purchase.supplier,
      reference: purchase.reference || "",
      items: purchase.items.map((item) => ({
        name: item.product?.name || item.material?.name || 'Unknown Item',
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        discount: item.itemDiscount,
        total: item.totalPrice,
      })),
      additionalCosts: purchase.additionalCosts || [],
      subtotal: purchase.subtotal,
      discount: purchase.discount,
      total: purchase.total,
      notes: purchase.notes || "",
      companyName: user.name || "Your Company",
    };

    return NextResponse.json(invoiceData);
  } catch (error) {
    console.error("Error fetching invoice data:", error);
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
} 