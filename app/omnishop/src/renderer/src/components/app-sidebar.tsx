import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Archive,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  UserCheck,
  Users,
  BarChart3,
  ShieldCheck,
  Wallet
} from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
import { useShopStore } from '@/store/useShopStore'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

// ─── Navigation Configs ───────────────────────────────────────────────────────

/** Navigation shown to admins only — platform management, no shop-level pages. */
const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ title: 'Overview', url: '/dashboard', icon: LayoutDashboard }]
  },
  {
    label: 'Shops',
    items: [{ title: 'All Shops', url: '/dashboard/shops', icon: Store }]
  },
  {
    label: 'Admin',
    items: [
      { title: 'All Users', url: '/dashboard/users', icon: Users },
      { title: 'Pending Approvals', url: '/dashboard/approvals', icon: UserCheck }
    ]
  }
]

/** Navigation shown to regular (seller) users — store & sales management. */
const USER_NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ title: 'Overview', url: '/dashboard', icon: LayoutDashboard }]
  },
  {
    label: 'Store',
    items: [
      { title: 'Products', url: '/dashboard/products', icon: Package },
      { title: 'Categories', url: '/dashboard/categories', icon: Tag },
      { title: 'Price List', url: '/dashboard/price-list', icon: ShoppingCart }
    ]
  },
  {
    label: 'Sales',
    items: [
      { title: 'Transactions', url: '/dashboard/transactions', icon: Receipt },
      { title: 'Reports', url: '/dashboard/reports', icon: BarChart3 }
    ]
  },
  {
    label: 'Storage',
    items: [{ title: 'Storage', url: '/dashboard/storage', icon: Archive }]
  },
  {
    label: 'Finance',
    items: [{ title: 'Budget', url: '/dashboard/budget', icon: Wallet }]
  },
  {
    label: 'Socials',
    items: [
      { title: 'Messenger', url: '/dashboard/messenger', icon: MessageCircle },
      { title: 'Gmail', url: '/dashboard/gmail', icon: Mail }
    ]
  }
]

const FOOTER_ITEMS: NavItem[] = [
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
  { title: 'Help & Support', url: '/dashboard/help', icon: HelpCircle }
]

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface NavItemButtonProps {
  item: NavItem
  currentPath: string
}

/** A single sidebar nav button backed by React Router's NavLink. */
function NavItemButton({ item, currentPath }: NavItemButtonProps): React.JSX.Element {
  const Icon = item.icon
  const isActive =
    item.url === '/dashboard' ? currentPath === '/dashboard' : currentPath.startsWith(item.url)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <NavLink to={item.url}>
          <Icon />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  /** Set to true for admin-role users to reveal admin-only nav groups. */
  isAdmin?: boolean
}

/**
 * Application sidebar for the Dashboard mode.
 *
 * @param isAdmin - Controls visibility of the Admin nav group.
 */
export function AppSidebar({ isAdmin = false, ...props }: AppSidebarProps): React.JSX.Element {
  const { user, logout } = useAuthStore()
  const { shop } = useShopStore()
  const location = useLocation()
  const currentPath = location.pathname

  const isOnline = useNetworkStatus()

  /** Returns the first two uppercase letters of a display name or email. */
  const getInitials = (nameOrEmail: string | null): string => {
    if (!nameOrEmail) return 'U'
    const parts = nameOrEmail.split(/[\s@]/).filter(Boolean)
    return parts
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('')
  }

  const initials = getInitials(user?.displayName ?? user?.email ?? null)
  const displayName = user?.displayName ?? user?.email ?? 'Unknown User'

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* ── Header ── */}
      <SidebarHeader className="p-0 mt-2">
        <SidebarMenu>
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-auto p-0 hover:bg-transparent active:bg-transparent"
            >
              <NavLink to="/dashboard">
                {/* Expanded: banner bg + logo + name */}
                <div
                  className="relative flex w-full items-end gap-2.5 overflow-hidden rounded-lg px-3 pb- pt-10 group-data-[collapsible=icon]:hidden"
                  style={{
                    background: shop?.bannerUrl
                      ? `linear-gradient(to top, hsl(var(--sidebar-background)) 10%, transparent 100%), url(${shop.bannerUrl}) top center / 100% auto no-repeat`
                      : 'linear-gradient(135deg, hsl(var(--sidebar-primary)/0.15), hsl(var(--sidebar-primary)/0.05))'
                  }}
                >
                  {/* Logo */}
                  <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-sidebar-background shadow-sm overflow-hidden">
                    {shop?.logoUrl ? (
                      <img
                        src={shop.logoUrl}
                        alt={shop.shopName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center bg-sidebar-primary font-bold text-sm text-sidebar-primary-foreground">
                        4K
                      </span>
                    )}
                  </div>

                  {/* Name + badge */}
                  <div className="flex flex-col gap-0.5 leading-none min-w-0">
                    <span className="font-semibold truncate text-sm">
                      {shop?.shopName ?? 'OmniShop'}
                    </span>
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-400">
                        <ShieldCheck className="size-2.5" />
                        Admin Console
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isOnline ? 'bg-green-500' : 'bg-red-500'
                          )}
                        />
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Collapsed: logo only */}
                <div className="hidden aspect-square size-8 shrink-0 items-center justify-center rounded-lg overflow-hidden group-data-[collapsible=icon]:flex">
                  {shop?.logoUrl ? (
                    <img
                      src={shop.logoUrl}
                      alt={shop.shopName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center rounded-lg bg-sidebar-primary font-bold text-sm text-sidebar-primary-foreground">
                      4K
                    </span>
                  )}
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent>
        {(isAdmin ? ADMIN_NAV_GROUPS : USER_NAV_GROUPS).map((group, index) => (
          <React.Fragment key={group.label ?? 'main'}>
            {index > 0 && <SidebarSeparator />}
            <SidebarGroup>
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavItemButton key={item.url} item={item} currentPath={currentPath} />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </React.Fragment>
        ))}

        {/* ── Footer nav items (Settings, Help) ── */}
        <div className="mt-auto">
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarMenu>
              {FOOTER_ITEMS.map((item) => (
                <NavItemButton key={item.url} item={item} currentPath={currentPath} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarContent>

      {/* ── Footer (User Profile) ── */}
      <SidebarFooter>
        <SidebarSeparator />
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-2 py-2.5',
            'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
          )}
        >
          {/* Avatar — photo if available, else initials */}
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="shrink-0 size-8 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div
              className={cn(
                'flex shrink-0 aspect-square size-8 items-center justify-center rounded-full',
                'bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold select-none'
              )}
            >
              {initials}
            </div>
          )}

          {/* Name + email */}
          <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium truncate">{displayName}</span>
            {user?.displayName && (
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            )}
          </div>

          {/* Log out */}
          <button
            onClick={(e) => {
              e.preventDefault()
              void logout()
            }}
            title="Log out"
            className={cn(
              'ml-auto shrink-0 rounded-md p-1.5 text-muted-foreground',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              'transition-colors group-data-[collapsible=icon]:hidden'
            )}
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
