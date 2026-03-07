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
  Wallet,
  Settings2,
  ChevronsUpDown,
  Check
} from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
import { useShopStore } from '@/store/useShopStore'
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
  SidebarSeparator,
  useSidebar
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
      { title: 'Price List', url: '/dashboard/price-list', icon: ShoppingCart },
      { title: 'Storage', url: '/dashboard/storage', icon: Archive },
      { title: 'Store Management', url: '/dashboard/store-management', icon: Settings2 }
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

/** Component for switching between stores (or just displaying the current one). */
function StoreSwitcher({
  shop,
  isAdmin,
  storeRole
}: {
  shop: any
  isAdmin: boolean
  storeRole?: string
}): React.JSX.Element {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                'relative h-auto overflow-hidden rounded-lg p-0 hover:bg-transparent active:bg-transparent transition-all duration-200',
                'group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:size-8'
              )}
            >
              {/* Trigger content - Collapsed state logic via CSS classes */}
              <div className="flex items-center w-full h-full">
                {/* ── Expanded State ── */}
                <div
                  className="flex w-full items-end gap-2.5 px-3 py-3 pt-10 group-data-[collapsible=icon]:hidden"
                  style={{
                    background: shop?.bannerUrl
                      ? `linear-gradient(to top, hsl(var(--sidebar-background)) 0%, transparent 100%),
                         linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%),
                         url(${shop.bannerUrl}) top center / 100% auto no-repeat`
                      : 'linear-gradient(135deg, hsl(var(--sidebar-primary)/0.15), hsl(var(--sidebar-primary)/0.05))'
                  }}
                >
                  {/* Logo/Avatar */}
                  <Avatar className="size-9 rounded-lg border border-border/60 bg-sidebar-background shadow-sm shrink-0">
                    <AvatarImage
                      src={shop?.logoUrl}
                      alt={shop?.shopName}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-lg bg-sidebar-primary font-bold text-sm text-sidebar-primary-foreground">
                      4K
                    </AvatarFallback>
                  </Avatar>

                  {/* Name + Role */}
                  <div className="flex flex-col gap-0.5 leading-tight min-w-0 flex-1">
                    <span className="font-semibold truncate text-sm">
                      {shop?.shopName ?? 'OmniShop'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {isAdmin ? (
                        <>
                          <ShieldCheck className="size-2.5 text-violet-400" />
                          Admin Console
                        </>
                      ) : (
                        (storeRole ?? 'Owner')
                      )}
                    </span>
                  </div>

                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground/50 mb-0.5" />
                </div>

                {/* ── Collapsed State ── */}
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
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">Store</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded border bg-background">
                {shop?.logoUrl ? (
                  <img src={shop.logoUrl} alt="" className="size-full rounded-sm object-cover" />
                ) : (
                  <Store className="size-4 shrink-0" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{shop?.shopName ?? 'OmniShop'}</span>
                <span className="text-[10px] text-muted-foreground">Active Store</span>
              </div>
              <Check className="size-4 ml-auto text-primary" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2 cursor-default opacity-50">
              <div className="flex size-6 items-center justify-center rounded border bg-muted">
                <Store className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Add another store</span>
                <span className="text-[10px] text-muted-foreground">Coming soon</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
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
  const { user, profile, logout } = useAuthStore()
  const { shop } = useShopStore()
  const location = useLocation()
  const currentPath = location.pathname

  const isMember = profile?.storeRole === 'member'

  const filteredGroups = (isAdmin ? ADMIN_NAV_GROUPS : USER_NAV_GROUPS)
    .map((group) => {
      if (group.label === 'Sales' && isMember) {
        return { ...group, items: [] } // Members can't see Sales
      }
      if (group.label === 'Finance' && isMember) {
        return { ...group, items: [] } // Members can't see Finance
      }
      return group
    })
    .filter((group) => group.items.length > 0)

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
        <StoreSwitcher shop={shop} isAdmin={isAdmin} storeRole={profile?.storeRole} />
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent>
        {filteredGroups.map((group, index) => (
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
