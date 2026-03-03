import * as React from 'react'
import { Sparkles } from 'lucide-react'
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

export function WhatsNewDialog(): React.JSX.Element {
  const { showWhatsNew, closeWhatsNew, whatsNew } = useUpdaterStore()

  if (!whatsNew) return <></>

  return (
    <Dialog open={showWhatsNew} onOpenChange={(o) => !o && closeWhatsNew()}>
      <DialogContent className="flex max-w-lg flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow-400/15">
              <Sparkles className="size-5 text-yellow-400" />
            </div>
            <div>
              <DialogTitle>What&apos;s New</DialogTitle>
              <DialogDescription className="mt-0.5">
                You&apos;re now on version{' '}
                <span className="font-semibold text-foreground">{whatsNew.version}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Release notes ── */}
        <Separator />
        <div className="flex flex-col gap-2 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Release Notes
          </p>
          <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/40 px-4 py-3">
            <ReleaseNotes markdown={whatsNew.releaseNotes} />
          </div>
        </div>

        {/* ── Footer ── */}
        <Separator />
        <DialogFooter className="px-5 py-4">
          <Button onClick={closeWhatsNew} className="gap-2">
            <Sparkles className="size-4" />
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
