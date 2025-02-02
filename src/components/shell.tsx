import { cn } from "@/lib/utils"

interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Shell({ children, className, ...props }: ShellProps) {
  return (
    <div className="grid h-screen grid-cols-[auto,1fr]" {...props}>
      {children}
    </div>
  )
}

interface ShellHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

Shell.Header = function ShellHeader({ children, className, ...props }: ShellHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center border-b px-4",
        className
      )}
      {...props}
    >
      {children}
    </header>
  )
}

interface ShellSidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

Shell.Sidebar = function ShellSidebar({ children, className, ...props }: ShellSidebarProps) {
  return (
    <aside
      className={cn("border-r bg-background", className)}
      {...props}
    >
      {children}
    </aside>
  )
}

interface ShellContentProps extends React.HTMLAttributes<HTMLDivElement> {}

Shell.Content = function ShellContent({ children, className, ...props }: ShellContentProps) {
  return (
    <main className={cn("flex flex-1 flex-col overflow-hidden", className)} {...props}>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-8">
        {children}
      </div>
    </main>
  )
}
