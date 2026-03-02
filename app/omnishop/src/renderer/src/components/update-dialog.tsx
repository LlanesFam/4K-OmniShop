import * as React from 'react'
import { ArrowDownToLine, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReleaseNotes } from '@/components/ui/release-notes'
import { useUpdaterStore } from '@/store/useUpdaterStore'

export function UpdateDialog(): React.JSX.Element {
  const { showUpdateDialog, closeUpdateDialog, pendingVersion, releaseNotes } = useUpdaterStore()
  const [installing, setInstalling] = React.useState(false)

  async function handleInstall(): Promise<void> {
    setInstalling(true)
    try {
      await window.api.installUpdate()
    } catch {
      setInstalling(false)
    }
  }

  return (
    <Dialog open={showUpdateDialog} onOpenChange={(o) => !o && closeUpdateDialog()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-teal-400/15">
              <ArrowDownToLine className="size-5 text-teal-400" />
            </div>
            <div>
              <DialogTitle>Update Ready</DialogTitle>
              <DialogDescription className="mt-0.5">
                Version <span className="font-semibold text-foreground">{pendingVersion}</span> has
                been downloaded and is ready to install.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Release notes */}
        {releaseNotes && (
          <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/40 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What&apos;s new
            </p>
            <ReleaseNotes markdown={releaseNotes} />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={closeUpdateDialog} disabled={installing}>
            Later
          </Button>
          <Button
            onClick={handleInstall}
            disabled={installing}
            className="gap-2 bg-teal-500 text-white hover:bg-teal-600"
          >
            {installing ? (
              <>
                <RotateCcw className="size-4 animate-spin" />
                Restarting…
              </>
            ) : (
              <>
                <ArrowDownToLine className="size-4" />
                Restart &amp; Install
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
