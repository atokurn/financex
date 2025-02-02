"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Boxes,
  Command,
  Frame,
  GalleryVerticalEnd,
  Logs,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Store,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Shopee",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Tiktok Shop",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Tokopedia",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: PieChart,
      noChevron: true,
    },
    {
      title: "Manage Products",
      url: "#",
      icon: Boxes,
      items: [
        {
          title: "Products",
          url: "/dashboard/products",
        },
        {
          title: "Materials",
          url: "/dashboard/materials",
        },
        {
          title: "Manage",
          url: "/dashboard/manage",
        },
      ],
    },
    {
      title: "Transactions",
      url: "#",
      icon: Logs,
      items: [
        {
          title: "Sales",
          url: "/dashboard/sales",
        },
        {
          title: "Orders",
          url: "/dashboard/orders",
        },
        {
          title: "Purchase",
          url: "/dashboard/purchases",
        },
        {
          title: "Expenses",
          url: "/dashboard/expenses",
        },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings2,
      //noChevron: true,
      items: [
        {
          title: "Account integration",
          url: "/dashboard/integrations",
        },
      ],
    },
  ],
  navProjects: [
    {
      title: "Manage Store",
      url: "#",
      icon: Store,
      items: [
        {
          title: "Orders",
          url: "#",
        },
        {
          title: "Products",
          url: "#",
        },
        {
          title: "Logistics",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([])

  const isMenuActive = (menu: any) => {
    if (menu.url === pathname) return true
    if (menu.items) {
      return menu.items.some((item: any) => item.url === pathname)
    }
    return false
  }

  const isSubmenuActive = (url: string) => {
    return pathname === url
  }

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

  const isMenuExpanded = (title: string) => {
    if (!mounted) return false
    return expandedMenus.includes(title)
  }

  // Handle initial mount
  React.useEffect(() => {
    setMounted(true)
    const activeMenus = data.navMain
      .filter(menu => menu.items?.some((item: any) => item.url === pathname))
      .map(menu => menu.title)
    setExpandedMenus(activeMenus)
  }, [pathname])

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain 
          items={data.navMain} 
          isMenuActive={isMenuActive}
          isSubmenuActive={isSubmenuActive}
          isMenuExpanded={isMenuExpanded}
          onMenuToggle={toggleMenu}
        />
        <NavProjects items={data.navProjects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
