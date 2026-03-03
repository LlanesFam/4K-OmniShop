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
import { Separator } from '@/components/ui/separator'
import { ReleaseNotes } from '@/components/ui/release-notes'
import { useUpdaterStore } from '@/store/useUpdaterStore'
import { installUpdate } from '@/lib/tauri'

export function UpdateDialog(): React.JSX.Element {
  const { showUpdateDialog, closeUpdateDialog, pendingVersion, releaseNotes } = useUpdaterStore()
  const [installing, setInstalling] = React.useState(false)

  async function handleInstall(): Promise<void> {
    setInstalling(true)
    try {
      await installUpdate()
    } catch {
      setInstalling(false)
    }
  }

  return (
    <Dialog open={showUpdateDialog} onOpenChange={(o) => !o && closeUpdateDialog()}>
      <DialogContent className="flex max-w-lg flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-400/15">
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

        {/* ── Release notes ── */}
        {releaseNotes && (
          <>
            <Separator />
            <div className="flex flex-col gap-2 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                What&apos;s new
              </p>
              <div className="max-h-56 overflow-y-auto rounded-lg border bg-muted/40 px-4 py-3">
                <ReleaseNotes markdown={releaseNotes} />
              </div>
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <Separator />
        <DialogFooter className="gap-2 px-5 py-4 sm:gap-2">
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
