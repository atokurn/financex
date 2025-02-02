"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface NavMainProps {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    noChevron?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
  isMenuActive: (menu: any) => boolean
  isSubmenuActive: (url: string) => boolean
  isMenuExpanded: (title: string) => boolean
  onMenuToggle: (title: string) => void
}

export function NavMain({
  items,
  isMenuActive,
  isSubmenuActive,
  isMenuExpanded,
  onMenuToggle,
}: NavMainProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => (
          item.items ? (
            <Collapsible
              key={index}
              asChild
              open={isMenuExpanded(item.title)}
              onOpenChange={() => onMenuToggle(item.title)}
              className={cn(
                "group/collapsible",
                isMenuActive(item) && "text-primary"
              )}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <div 
                    role="button"
                    tabIndex={0}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus-visible:bg-muted"
                    aria-expanded={isMenuExpanded(item.title)}
                    aria-controls={`menu-${item.title}`}
                  >
                    {item.icon && <item.icon className={cn(
                      isMenuActive(item) && "text-primary",
                      "mr-2 h-4 w-4"
                    )} />}
                    <span>{item.title}</span>
                    {!item.noChevron && (
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub id={`menu-${item.title}`}>
                    {item.items.map((subItem, subIndex) => (
                      <SidebarMenuSubItem key={subIndex}>
                        <Link 
                          href={subItem.url}
                          className={cn(
                            "flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                            isSubmenuActive(subItem.url) && "bg-muted text-primary"
                          )}
                        >
                          {subItem.icon && (
                            <subItem.icon className="mr-2 h-5 w-5" />
                          )}
                          {subItem.title}
                        </Link>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={index}>
              <Link 
                href={item.url}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus-visible:bg-muted",
                  isMenuActive(item) && "text-primary"
                )}
                aria-label={item.title}
              >
                {item.icon && <item.icon className={cn(
                  isMenuActive(item) && "text-primary",
                  "mr-2 h-4 w-4"
                )} />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuItem>
          )
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
