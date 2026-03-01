import React from 'react'
import { MessageCircle } from 'lucide-react'

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
  return (
    <div className="w-full flex flex-col min-h-full gap-0">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageCircle className="size-6" />
          Messenger
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Facebook Messenger — your session is kept alive between restarts.
        </p>
      </div>

      {/* Webview container — fills remaining height */}
      <div className="flex-1 rounded-xl border overflow-hidden bg-muted min-h-0">
        {/* TODO: Replace this placeholder with the actual <webview> once
            Electron's webview feature is confirmed enabled in electron.vite.config.ts.
            Example:
              <webview
                ref={webviewRef}
                src="https://www.messenger.com"
                partition="persist:messenger"
                className="w-full h-full"
                allowpopups
              />
        */}
        <div className="flex h-full items-center justify-center flex-col gap-3 text-center p-8">
          <MessageCircle className="size-12 text-muted-foreground/40" />
          <p className="font-medium text-sm">Messenger webview</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            The embedded Messenger view will load here once the Electron webview tag is configured
            in the main process. Ensure <code className="font-mono">webviewTag: true</code> is set
            in your BrowserWindow preferences.
          </p>
        </div>
      </div>
    </div>
  )
}
