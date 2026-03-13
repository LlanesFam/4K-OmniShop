import React from 'react'
import { MessageCircle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Messenger page — embedded Facebook Messenger webview.
 *
 * Uses an Electron <webview> tag with a persistent session partition
 * (`persist:messenger`) to keep the user logged in across app restarts.
 * nodeIntegration and contextIsolation are enforced at the main-process level.
 *
 * @see src/main/index.ts for webview security policy setup.
 */
export default function MessengerPage(): React.JSX.Element {
  const { user } = useAuthStore()

  return (
    <div className="w-full h-full flex flex-col gap-0">
      {/* Page header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageCircle className="size-6" />
          Messenger
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Facebook Messenger — your session is kept alive between restarts.
        </p>
      </div>

      {/* Webview container — fills remaining height */}
      <div className="flex-1 relative rounded-xl border overflow-hidden min-h-0">
        <webview
          src="https://www.messenger.com"
          partition={user ? `persist:${user.uid}-messenger` : 'persist:guest-messenger'}
          className="absolute inset-0 w-full h-full"
          allowpopups
        />
      </div>
    </div>
  )
}
