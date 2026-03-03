import React from 'react'
import { MessageCircle, ExternalLink } from 'lucide-react'
import { open } from '@tauri-apps/plugin-shell'
import { Button } from '@/components/ui/button'

const MESSENGER_URL = 'https://www.messenger.com'

/**
 * Messenger page.
 *
 * On desktop: opens Messenger in the default system browser.
 * On Android: Android will offer to open the native Messenger app
 *             if installed (App Link), otherwise opens in Chrome.
 */
export default function MessengerPage(): React.JSX.Element {
  function handleOpen(): void {
    open(MESSENGER_URL).catch(console.error)
  }

  return (
    <div className="w-full flex flex-col min-h-full gap-0">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageCircle className="size-6" />
          Messenger
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Open Facebook Messenger in your browser or native app.
        </p>
      </div>

      {/* Launch card */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center shadow-sm max-w-sm w-full">
          <div className="flex size-16 items-center justify-center rounded-full bg-blue-500/10">
            <MessageCircle className="size-8 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-lg">Facebook Messenger</p>
            <p className="text-muted-foreground text-sm mt-1">
              Launches in your system browser or the Messenger app on Android.
            </p>
          </div>
          <Button onClick={handleOpen} className="gap-2">
            <ExternalLink className="size-4" />
            Open Messenger
          </Button>
        </div>
      </div>
    </div>
  )
}
