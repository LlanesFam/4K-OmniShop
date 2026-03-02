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
import { ReleaseNotes } from '@/components/ui/release-notes'
import { useUpdaterStore } from '@/store/useUpdaterStore'

export function WhatsNewDialog(): React.JSX.Element {
  const { showWhatsNew, closeWhatsNew, whatsNew } = useUpdaterStore()

  if (!whatsNew) return <></>

  return (
    <Dialog open={showWhatsNew} onOpenChange={(o) => !o && closeWhatsNew()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-yellow-400/15">
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

        {/* Release notes */}
        <div className="max-h-72 overflow-y-auto rounded-lg border bg-muted/40 px-4 py-3">
          <ReleaseNotes markdown={whatsNew.releaseNotes} />
        </div>

        <DialogFooter>
          <Button onClick={closeWhatsNew} className="gap-2">
            <Sparkles className="size-4" />
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
