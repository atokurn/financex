'use client'

import { useState, useRef, useEffect } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  AlertCircle, 
  Download, 
  FileJson, 
  Database, 
  FileSpreadsheet, 
  Upload, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileArchive,
  Import
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Interface untuk riwayat backup yang diterima dari API
interface BackupHistoryItem {
  id: string
  filename: string
  format: string
  fileSize: number
  createdAt: string
  formattedSize: string
  formattedDate: string
}

export default function BackupPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("export")
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [importProgress, setImportProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [backupFormat, setBackupFormat] = useState<string>("json")
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Fetch backup history when component mounts
  useEffect(() => {
    fetchBackupHistory()
  }, [])
  
  // Refetch backup history when a new backup is created
  useEffect(() => {
    if (exportProgress === 100) {
      // Wait for the download to complete and then fetch the updated history
      const timer = setTimeout(() => {
        fetchBackupHistory()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [exportProgress])
  
  const fetchBackupHistory = async () => {
    try {
      setIsLoadingHistory(true)
      const response = await fetch('/api/backup-history')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch backup history')
      }
      
      const data = await response.json()
      setBackupHistory(data.history || [])
    } catch (error) {
      console.error('Error fetching backup history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }
  
  const handleExport = async () => {
    setExportLoading(true)
    setExportProgress(0)
    setError(null)
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 300)
    
    try {
      const response = await fetch(`/api/backup?format=${backupFormat}`, {
        method: 'GET',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create backup')
      }
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `financex_backup_${new Date().toISOString().split('T')[0]}.${backupFormat}`
      
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition)
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '')
        }
      }
      
      setExportProgress(100)
      
      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Backup completed",
        description: `Your data has been successfully backed up to ${filename}`,
        duration: 5000,
      })
    } catch (error) {
      console.error('Backup error:', error)
      setError(error instanceof Error ? error.message : 'Failed to create backup')
      toast({
        variant: "destructive",
        title: "Backup failed",
        description: error instanceof Error ? error.message : 'Failed to create backup',
        duration: 5000,
      })
    } finally {
      clearInterval(progressInterval)
      setExportLoading(false)
      setTimeout(() => setExportProgress(0), 1000)
    }
  }
  
  const handleImport = async () => {
    if (!backupFile) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a backup file to import",
        duration: 5000,
      })
      return
    }
    
    setImportLoading(true)
    setImportProgress(0)
    setError(null)
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 5
      })
    }, 200)
    
    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', backupFile)
      
      // Detect file format from extension
      const format = backupFile.name.split('.').pop()?.toLowerCase() || 'unknown'
      formData.append('format', format)
      
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to import data')
      }
      
      const result = await response.json()
      
      setImportProgress(100)
      
      toast({
        title: "Import successful",
        description: result.message || "Your data has been successfully imported",
        duration: 5000,
      })
      
      // Reset file input
      setBackupFile(null)
      
    } catch (error) {
      console.error('Import error:', error)
      setError(error instanceof Error ? error.message : 'Failed to import data')
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error instanceof Error ? error.message : 'Failed to import data',
        duration: 5000,
      })
    } finally {
      clearInterval(progressInterval)
      setImportLoading(false)
      setTimeout(() => setImportProgress(0), 1000)
    }
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      validateAndSetFile(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }
  
  const validateAndSetFile = (file: File) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    
    if (!fileExt || !['json', 'xlsx', 'sql'].includes(fileExt)) {
      toast({
        variant: "destructive",
        title: "Invalid file format",
        description: "Please select a JSON, XLSX, or SQL file",
        duration: 5000,
      })
      return
    }
    
    setBackupFile(file)
  }
  
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <Tabs 
            defaultValue="export" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full max-w-3xl mx-auto"
          >
            <div className="flex justify-center mb-6">
              <TabsList className="grid grid-cols-2 w-[400px]">
                <TabsTrigger value="export" className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4" />
                  Export Data
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2">
                  <Import className="h-4 w-4" />
                  Import Data
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="export" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileArchive className="h-5 w-5" />
                    Create Data Backup
                  </CardTitle>
                  <CardDescription>
                    Generate a backup file containing all your important data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {error && activeTab === "export" && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      The backup will include all your data including products, materials, sales, orders, expenses, and more.
                    </p>
                    
                    <Collapsible
                      open={advancedOptionsOpen}
                      onOpenChange={setAdvancedOptionsOpen}
                      className="w-full"
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex w-full items-center justify-between p-2 hover:bg-muted/20 rounded-md">
                          <span className="font-medium text-sm">Advanced Options</span>
                          {advancedOptionsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-4 space-y-4 bg-card border border-border rounded-md mt-2">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Backup Format:</h4>
                          <Select value={backupFormat} onValueChange={setBackupFormat}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="json">JSON (Recommended)</SelectItem>
                              <SelectItem value="xlsx">Excel Spreadsheet</SelectItem>
                              <SelectItem value="sql">SQL Dump</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center gap-2 rounded-md border p-4 bg-background/50">
                          {backupFormat === 'json' && <FileJson size={24} className="text-blue-500" />}
                          {backupFormat === 'sql' && <Database size={24} className="text-amber-500" />}
                          {backupFormat === 'xlsx' && <FileSpreadsheet size={24} className="text-green-600" />}
                          
                          <div className="flex-1">
                            <h3 className="text-sm font-medium">
                              {backupFormat === 'json' && 'JSON Format'} 
                              {backupFormat === 'sql' && 'SQL Dump Format'} 
                              {backupFormat === 'xlsx' && 'Excel Spreadsheet Format'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {backupFormat === 'json' && 'Complete data backup in JSON format. Best for future restoration.'}
                              {backupFormat === 'sql' && 'SQL database dump. Useful for database restoration.'}
                              {backupFormat === 'xlsx' && 'Excel spreadsheet format. Good for viewing and editing data.'}
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    
                    {exportLoading && (
                      <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-sm">
                          <span>Creating backup...</span>
                          <span>{exportProgress}%</span>
                        </div>
                        <Progress value={exportProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t p-4">
                  <div className="text-xs text-muted-foreground">
                    <p>Note: Backups do not include uploaded images</p>
                  </div>
                  <Button 
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportLoading ? "Processing..." : "Download Backup"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Backup History</CardTitle>
                  <CardDescription>
                    View your recent backup activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoadingHistory ? (
                      <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                      </div>
                    ) : backupHistory.length === 0 ? (
                      <div className="rounded-md bg-muted p-4">
                        <p className="text-sm font-medium">No previous backups found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          When you create backups, they will appear here for easy reference
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {backupHistory.map((backup) => (
                          <div 
                            key={backup.id} 
                            className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              {backup.format === 'json' && <FileJson size={20} className="text-blue-500" />}
                              {backup.format === 'sql' && <Database size={20} className="text-amber-500" />}
                              {backup.format === 'xlsx' && <FileSpreadsheet size={20} className="text-green-600" />}
                              
                              <div>
                                <p className="text-sm font-medium">{backup.filename}</p>
                                <p className="text-xs text-muted-foreground">{backup.formattedDate} • {backup.formattedSize}</p>
                              </div>
                            </div>
                            
                            <div className="text-xs px-2 py-1 rounded-full bg-muted">
                              {backup.format.toUpperCase()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="import" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Import className="h-5 w-5" />
                    Import Data
                  </CardTitle>
                  <CardDescription>
                    Restore your data from a previously created backup file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {error && activeTab === "import" && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <Alert className="mb-4 border-amber-500 text-amber-500 bg-amber-500/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Important</AlertTitle>
                      <AlertDescription>
                        Importing data will merge with your existing data. Duplicate entries will be identified by their unique IDs. 
                        It is recommended to perform this action on a new account or after backing up your current data.
                      </AlertDescription>
                    </Alert>
                    
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                        isDragging ? "border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-950/20" : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
                        "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={triggerFileInput}
                      tabIndex={0}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json,.xlsx,.sql"
                        onChange={handleFileChange}
                      />
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                        <p className="text-sm font-medium">
                          {backupFile ? `Selected: ${backupFile.name}` : "Drag and drop your backup file here"}
                        </p>
                                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                          or click to browse
                        </p>
                      </div>
                    </div>

                    {importLoading && (
                      <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-sm">
                          <span>Importing data...</span>
                          <span>{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleImport}
                    disabled={importLoading || !backupFile}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Import className="mr-2 h-4 w-4" />
                    {importLoading ? "Processing..." : "Import Backup"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Import Guidelines</CardTitle>
                  <CardDescription>
                    Important information about importing data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-800/30">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-400">Data Compatibility</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Make sure you&apos;re importing a valid backup file. Importing incompatible data may result in unexpected behavior.
                      </p>
                    </div>
                    <div className="text-sm space-y-2">
                      <p>Your import file should:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Be in valid JSON format</li>
                        <li>Contain the expected data structure</li>
                        <li>Not exceed 10MB in size</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
} 