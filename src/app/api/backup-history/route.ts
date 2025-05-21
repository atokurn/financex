import { NextResponse } from 'next/server'
import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"

// Tipe data untuk BackupHistory dari database
interface BackupHistory {
  id: string
  userId: string
  filename: string
  format: string
  fileSize: number
  createdAt: Date
}

/**
 * Get backup history for the authenticated user
 */
export async function GET() {
  try {
    // Authenticate user
    const user = await requireUser();
    
    // Get backup history for this user
    const backupHistory = await db.backupHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10 // Limit to last 10 backups
    });
    
    // Format file sizes to human-readable format
    const formattedHistory = backupHistory.map((history: BackupHistory) => ({
      ...history,
      formattedSize: formatFileSize(history.fileSize),
      formattedDate: formatDate(history.createdAt)
    }));
    
    return NextResponse.json({ 
      history: formattedHistory 
    });
    
  } catch (error) {
    console.error("Error fetching backup history:", error);
    
    // Return error response
    return NextResponse.json(
      { 
        error: "Failed to fetch backup history",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date to user-friendly string
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  }).format(new Date(date));
} 