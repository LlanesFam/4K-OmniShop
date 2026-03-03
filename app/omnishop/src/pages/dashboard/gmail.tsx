import React from 'react'
import { Mail, ExternalLink } from 'lucide-react'
import { open } from '@tauri-apps/plugin-shell'
import { Button } from '@/components/ui/button'

const GMAIL_URL = 'https://mail.google.com'

/**
 * Gmail page.
 *
 * On desktop: opens Gmail in the default system browser.
 * On Android: Android will offer to open the native Gmail app
 *             if installed (App Link), otherwise opens in Chrome.
 */
export default function GmailPage(): React.JSX.Element {
  function handleOpen(): void {
    open(GMAIL_URL).catch(console.error)
  }

  return (
    <div className="w-full flex flex-col min-h-full gap-0">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="size-6" />
          Gmail
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Open Google Mail in your browser or native app.
        </p>
      </div>

      {/* Launch card */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center shadow-sm max-w-sm w-full">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-500/10">
            <Mail className="size-8 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-lg">Google Mail</p>
            <p className="text-muted-foreground text-sm mt-1">
              Launches in your system browser or the Gmail app on Android.
            </p>
          </div>
          <Button onClick={handleOpen} className="gap-2">
            <ExternalLink className="size-4" />
            Open Gmail
          </Button>
        </div>
      </div>
    </div>
  )
}
