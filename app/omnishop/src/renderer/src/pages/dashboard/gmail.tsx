import React from 'react'
import { Mail } from 'lucide-react'

/**
 * Gmail page — embedded Gmail webview.
 *
 * Uses an Electron <webview> tag with a persistent session partition
 * (`persist:gmail`) to keep the user logged in across app restarts.
 * nodeIntegration and contextIsolation are enforced at the main-process level.
 *
 * @see src/main/index.ts for webview security policy setup.
 */
export default function GmailPage(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col min-h-full gap-0">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="size-6" />
          Gmail
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Google Mail — your session is kept alive between restarts.
        </p>
      </div>

      {/* Webview container — fills remaining height */}
      <div className="flex-1 rounded-xl border overflow-hidden bg-muted min-h-0">
        {/* TODO: Replace this placeholder with the actual <webview> once confirmed.
            Example:
              <webview
                src="https://mail.google.com"
                partition="persist:gmail"
                className="w-full h-full"
                allowpopups
              />
        */}
        <div className="flex h-full items-center justify-center flex-col gap-3 text-center p-8">
          <Mail className="size-12 text-muted-foreground/40" />
          <p className="font-medium text-sm">Gmail webview</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            The embedded Gmail view will load here once the Electron webview tag is configured in
            the main process. Ensure <code className="font-mono">webviewTag: true</code> is set in
            your BrowserWindow preferences.
          </p>
        </div>
      </div>
    </div>
  )
}
