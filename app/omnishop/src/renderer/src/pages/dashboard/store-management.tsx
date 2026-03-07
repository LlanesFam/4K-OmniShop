import React, { useState, useEffect, useRef } from 'react'
import { Store, Save, Loader2, Users, Key, LayoutGrid, Settings2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useShopStore } from '@/store/useShopStore'
import {
  createShopProfile,
  updateShopProfile,
  SHOP_CATEGORIES,
  CATEGORY_TAXONOMY,
  fetchShopMembers,
  fetchInviteCodes,
  generateInviteCode,
  revokeInviteCode,
  updateMemberRole,
  removeMember,
  type ShopCategory,
  type InviteCode
} from '@/lib/shopService'
import { fetchUserProfile } from '@/lib/userService'
import { ImageUpload } from '@/components/ui/image-upload'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Shield, UserMinus, UserPlus, Copy, Trash2 } from 'lucide-react'
import type { UserProfile, StoreRole } from '@/store/useAuthStore'

// ─── Shared helper ────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  control,
  align = 'center'
}: {
  label: string
  description: string
  control: React.ReactNode
  align?: 'center' | 'start'
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex gap-4 px-6 py-4 justify-between',
        align === 'start' ? 'items-start' : 'items-center'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function StoreDetailsSection(): React.JSX.Element {
  const { user, profile } = useAuthStore()
  const { shop } = useShopStore()
  const isAdmin = profile?.role === 'admin'
  const isMember = profile?.storeRole === 'member'

  const [categories, setCategories] = useState<ShopCategory[]>(shop?.categories ?? [])
  const [subCategories, setSubCategories] = useState<string[]>(shop?.subCategories ?? [])
  const [logoUrl, setLogoUrl] = useState(shop?.logoUrl ?? '')
  const [bannerUrl, setBannerUrl] = useState(shop?.bannerUrl ?? '')
  const [shopName, setShopName] = useState(shop?.shopName ?? (isAdmin ? 'OmniShop' : ''))
  const [description, setDescription] = useState(shop?.description ?? '')
  const [phone, setPhone] = useState(shop?.phone ?? '')
  const [address, setAddress] = useState(shop?.address ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    if (!shop) {
      if (isAdmin) initialized.current = true
      return
    }
    initialized.current = true
    setCategories(shop.categories ?? [])
    setSubCategories(shop.subCategories ?? [])
    setLogoUrl(shop.logoUrl ?? '')
    setBannerUrl(shop.bannerUrl ?? '')
    setShopName(shop.shopName ?? '')
    setDescription(shop.description ?? '')
    setPhone(shop.phone ?? '')
    setAddress(shop.address ?? '')
  }, [shop, isAdmin])

  const handleSave = async (): Promise<void> => {
    if (!user || isMember) return
    setSaving(true)
    setSaved(false)
    try {
      const data = {
        categories,
        subCategories,
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        shopName,
        description,
        phone,
        address
      }
      if (!shop) {
        await createShopProfile(user.uid, data)
      } else {
        await updateShopProfile(user.uid, data)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      {isAdmin && !shop && (
        <div className="flex items-start gap-3 border-b bg-primary/5 px-6 py-4">
          <Store className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Set up your OmniShop</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              As admin your shop is called{' '}
              <span className="font-medium text-foreground">OmniShop</span>. Fill in the details
              below and click <span className="font-medium text-foreground">Save changes</span> to
              initialise it.
            </p>
          </div>
        </div>
      )}
      <div className="divide-y">
        <div className="px-6 py-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Shop Categories</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select all categories that describe what your shop sells.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[...SHOP_CATEGORIES]
              .sort((a, b) => {
                const aS = categories.includes(a.value)
                const bS = categories.includes(b.value)
                if (aS && !bS) return -1
                if (!aS && bS) return 1
                return 0
              })
              .map(({ value, label, emoji }) => {
                const selected = categories.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isMember}
                    onClick={() => {
                      setCategories((prev) =>
                        selected ? prev.filter((c) => c !== value) : [...prev, value]
                      )
                      if (selected) {
                        const removedSubs = CATEGORY_TAXONOMY[value].subs
                        setSubCategories((prev) => prev.filter((s) => !removedSubs.includes(s)))
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50',
                      isMember &&
                        'opacity-80 cursor-default hover:bg-transparent hover:border-border'
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </button>
                )
              })}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Subcategories
              </p>
              {categories.map((cat) => {
                const { label, emoji, subs } = CATEGORY_TAXONOMY[cat]
                if (subs.length === 0) return null
                return (
                  <div key={cat} className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-foreground">
                      {emoji} {label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {subs.map((sub) => {
                        const subSelected = subCategories.includes(sub)
                        return (
                          <button
                            key={sub}
                            type="button"
                            disabled={isMember}
                            onClick={() =>
                              setSubCategories((prev) =>
                                subSelected ? prev.filter((s) => s !== sub) : [...prev, sub]
                              )
                            }
                            className={cn(
                              'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                              subSelected
                                ? 'border-primary/60 bg-primary/10 text-primary'
                                : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-muted/50',
                              isMember &&
                                'opacity-80 cursor-default hover:bg-transparent hover:border-border/60'
                            )}
                          >
                            {sub}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium">Shop Banner</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A wide hero image displayed at the top of your storefront. Recommended: 1200×300 px.
            </p>
          </div>
          <ImageUpload
            value={bannerUrl}
            onUpload={setBannerUrl}
            folder="banners"
            aspectRatio="banner"
            label="Drag & drop or click to upload a banner"
            className="mt-1"
            cropEnabled
            disabled={isMember}
          />
        </div>

        <div className="flex items-start justify-between gap-4 px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Shop Logo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Square image shown in the sidebar, receipts, and invoices.
            </p>
          </div>
          <ImageUpload
            value={logoUrl}
            onUpload={setLogoUrl}
            folder="logos"
            aspectRatio="square"
            label="Upload logo"
            className="w-28 shrink-0"
            cropEnabled
            disabled={isMember}
          />
        </div>

        <SettingRow
          label="Shop Name"
          description="The public name of your business."
          control={
            <Input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Zen Garden Gifts"
              className="w-52 text-sm"
              disabled={isMember}
            />
          }
        />

        <SettingRow
          label="Description"
          description="A short summary of what your shop sells (shown on receipts)."
          align="start"
          control={
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe your shop…"
              className="w-52 shrink-0 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isMember}
            />
          }
        />

        <SettingRow
          label="Phone"
          description="Contact number displayed on invoices and receipts."
          control={
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 900 000 0000"
              className="w-52 text-sm"
              disabled={isMember}
            />
          }
        />

        <SettingRow
          label="Address"
          description="Your physical store or business address."
          control={
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City"
              className="w-52 text-sm"
              disabled={isMember}
            />
          }
        />

        {!isMember && (
          <div className="flex items-center justify-between gap-4 px-6 py-4 bg-muted/20">
            {saved ? (
              <p className="text-xs text-emerald-600 font-medium">✓ Store details saved.</p>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Members & Invites ────────────────────────────────────────────────────────

function MembersSection(): React.JSX.Element {
  const { user } = useAuthStore()
  const { shop } = useShopStore()
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const loadMembers = React.useCallback(async (): Promise<void> => {
    if (!shop?.uid) return
    setLoading(true)
    try {
      // Fetch all users linked to the shop via shopId
      const memberData = await fetchShopMembers(shop.uid)

      // Fetch the owner's profile directly. This ensures the owner is always
      // included, even if their own user document doesn't have a `shopId`
      // field (e.g., for legacy accounts).
      const ownerProfile = await fetchUserProfile(shop.uid)

      // De-duplicate and combine the lists
      const memberMap = new Map<string, UserProfile>()
      for (const member of memberData) {
        memberMap.set(member.uid, member)
      }
      if (ownerProfile) {
        memberMap.set(ownerProfile.uid, ownerProfile)
      }

      setMembers(Array.from(memberMap.values()))
    } finally {
      setLoading(false)
    }
  }, [shop?.uid])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleUpdateRole = async (memberUid: string, newRole: StoreRole): Promise<void> => {
    try {
      await updateMemberRole(memberUid, newRole)
      await loadMembers()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemoveMember = async (memberUid: string): Promise<void> => {
    if (
      !confirm('Are you sure you want to remove this member? They will lose access to this store.')
    )
      return
    try {
      await removeMember(memberUid)
      await loadMembers()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold">Shop Members</h3>
          <Badge variant="outline" className="font-medium">
            {members.length} {members.length === 1 ? 'Member' : 'Members'}
          </Badge>
        </div>

        <div className="divide-y border-t -mx-6">
          {members.map((member) => (
            <div key={member.uid} className="flex items-center gap-4 px-6 py-4">
              <Avatar className="size-10 border">
                <AvatarImage src={(member as { photoURL?: string }).photoURL} />
                <AvatarFallback>{member.displayName[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={member.storeRole === 'owner' ? 'default' : 'secondary'}
                  className="text-[10px] font-semibold h-5"
                >
                  {member.storeRole === 'owner' ? <Shield className="size-2.5 mr-1" /> : null}
                  {member.storeRole?.toUpperCase() ?? 'MEMBER'}
                </Badge>

                {member.uid !== user?.uid && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateRole(
                            member.uid,
                            member.storeRole === 'owner' ? 'member' : 'owner'
                          )
                        }
                      >
                        {member.storeRole === 'owner' ? (
                          <>
                            <UserMinus className="mr-2 size-4" />
                            Demote to Member
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 size-4" />
                            Promote to Owner
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => handleRemoveMember(member.uid)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No members found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InviteCodesSection(): React.JSX.Element {
  const { user } = useAuthStore()
  const { shop } = useShopStore()
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const loadCodes = React.useCallback(async (): Promise<void> => {
    if (!shop?.uid) return
    setLoading(true)
    try {
      const data = await fetchInviteCodes(shop.uid)
      setCodes(data)
    } finally {
      setLoading(false)
    }
  }, [shop?.uid])

  useEffect(() => {
    loadCodes()
  }, [loadCodes])

  const handleGenerate = async (): Promise<void> => {
    if (!shop?.uid || !user?.uid) return
    setGenerating(true)
    try {
      await generateInviteCode(shop.uid, user.uid, 1)
      await loadCodes()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (code: string): Promise<void> => {
    try {
      await revokeInviteCode(code)
      await loadCodes()
    } catch (err) {
      console.error(err)
    }
  }

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold">Invite Codes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Codes expire after one use.</p>
          </div>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Key className="mr-2 size-4" />
            )}
            Generate Code
          </Button>
        </div>

        <div className="divide-y border-t -mx-6">
          {codes.map((invite) => (
            <div key={invite.code} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono font-bold tracking-wider">
                    {invite.code}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => copyToClipboard(invite.code)}
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                  Uses: {invite.useCount} / {invite.maxUseCount}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {invite.useCount >= invite.maxUseCount ? (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Used
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                  >
                    Active
                  </Badge>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRevoke(invite.code)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}

          {codes.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No invite codes generated yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'details', label: 'Store Details', icon: Store },
  { id: 'defaults', label: 'Store Defaults', icon: LayoutGrid },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'invites', label: 'Invite Codes', icon: Key }
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export default function StoreManagementPage(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId>('details')
  const { profile } = useAuthStore()
  const isMember = profile?.storeRole === 'member'

  // Filter sections for members
  const visibleSections = isMember
    ? SECTIONS.filter((s) => s.id === 'details' || s.id === 'members')
    : SECTIONS

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="size-6" />
          Store Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your shop profile, manage members, and generate invite codes.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left Sidebar Nav */}
        <nav className="flex flex-row md:flex-col gap-1 w-full md:w-[220px] shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {visibleSections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                activeSection === id
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Right Panel Content */}
        <div className="flex-1 w-full max-w-2xl">
          {activeSection === 'details' && <StoreDetailsSection />}

          {activeSection === 'defaults' && !isMember && (
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <LayoutGrid className="size-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold">Store Defaults</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  Configure default settings for new products and transactions.
                </p>
                <Badge variant="outline" className="mt-4 font-medium text-muted-foreground">
                  Coming soon
                </Badge>
              </div>
            </div>
          )}

          {activeSection === 'members' && <MembersSection />}

          {activeSection === 'invites' && !isMember && <InviteCodesSection />}
        </div>
      </div>
    </div>
  )
}
