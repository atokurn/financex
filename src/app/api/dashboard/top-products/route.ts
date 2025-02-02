import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Get orders grouped by SKU and calculate total quantity
    const orderStats = await prisma.order.groupBy({
      by: ['sku'],
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 10,
      where: {
        sku: {
          not: 'NO SKU'
        },
        ...(fromDate && toDate ? {
          orderAt: {
            gte: new Date(fromDate),
            lte: new Date(toDate)
          }
        } : {})
      }
    });

    // Get product details for each SKU
    const productsWithSales = await Promise.all(
      orderStats.map(async (stat) => {
        const product = await prisma.product.findFirst({
          where: { 
            sku: stat.sku 
          },
          select: {
            name: true,
            sku: true,
            image: true
          }
        });

        return {
          sku: stat.sku,
          name: product?.name || stat.sku,
          image: product?.image || null,
          sales: stat._sum.quantity || 0,
        };
      })
    );

    // Calculate progress percentages
    const maxSales = Math.max(...productsWithSales.map(p => p.sales));
    const productsWithProgress = productsWithSales.map(product => ({
      ...product,
      progress: maxSales > 0 ? Math.round((product.sales / maxSales) * 100) : 0
    }));

    return NextResponse.json(productsWithProgress);
  } catch (error) {
    console.error('Error fetching top products:', error);
    return NextResponse.json({ error: 'Failed to fetch top products' }, { status: 500 });
  }
}
