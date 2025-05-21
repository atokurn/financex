import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper function to fetch products from the database
async function fetchProducts() {
  try {
    return await prisma.product.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function GET() {
  const encoder = new TextEncoder();
  let isClosed = false;
  let interval: NodeJS.Timeout | null = null;
  
  const stream = new ReadableStream({
    async start(controller) {
      // Safely enqueue data to the controller
      const safeEnqueue = (data: string) => {
        if (isClosed) return false;
        
        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch (error) {
          console.error('Controller enqueue error:', error);
          isClosed = true;
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          return false;
        }
      };
      
      // Function to send product updates
      const sendUpdate = async () => {
        // Skip update if connection is already closed
        if (isClosed) {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          return;
        }
        
        try {
          // Fetch latest products
          const products = await fetchProducts();
          
          // Send data as SSE, with safe enqueue
          const message = `data: ${JSON.stringify(products)}\n\n`;
          if (!safeEnqueue(message)) {
            return; // Exit if enqueue failed
          }
        } catch (error) {
          console.error('Error in SSE stream:', error);
          
          // Try to send error message with safe enqueue
          const errorMsg = `data: ${JSON.stringify({ error: "Failed to fetch products" })}\n\n`;
          safeEnqueue(errorMsg);
        }
      };
      
      // Initial data send
      await sendUpdate();
      
      // Setup interval for real-time updates with a safer interval
      if (!isClosed) {
        interval = setInterval(() => {
          if (isClosed) {
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
            return;
          }
          
          // Use Promise.race with a timeout to avoid blocking
          Promise.race([
            sendUpdate(),
            new Promise(resolve => setTimeout(resolve, 4500)) // Timeout slightly shorter than interval
          ]).catch(error => {
            console.error('Update promise error:', error);
          });
        }, 5000);
      }
      
      // Clean up on connection close
      return () => {
        isClosed = true;
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      };
    },
    
    cancel() {
      // This is called when the client disconnects
      isClosed = true;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
} 