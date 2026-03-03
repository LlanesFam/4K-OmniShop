import * as React from 'react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'

interface AppLoaderProps {
  /** Controls visibility — animates out when false */
  visible: boolean
  /** Label below the spinner */
  label?: string
  className?: string
}

/**
 * Full-screen loading overlay with a custom animated spinner and the OmniShop
 * logo. Fades out smoothly when `visible` becomes false.
 */
export function AppLoader({
  visible,
  label = 'Loading…',
  className
}: AppLoaderProps): React.JSX.Element {
  const [rendered, setRendered] = React.useState(visible)

  // Keep DOM mounted during the fade-out transition, then unmount
  React.useEffect(() => {
    if (visible) {
      setRendered(true)
      return undefined
    } else {
      // Must be >= the CSS transition duration (700ms)
      const t = setTimeout(() => setRendered(false), 700)
      return () => clearTimeout(t)
    }
  }, [visible])

  if (!rendered) return <></>

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background',
        className
      )}
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease-in-out',
        pointerEvents: visible ? 'auto' : 'none'
      }}
    >
      {/* Logo */}
      <div className="relative flex items-center justify-center">
        {/* Outer spinning ring */}
        <span
          className="absolute size-20 rounded-full border-2 border-transparent border-t-primary animate-spin"
          style={{ animationDuration: '1s' }}
        />
        {/* Middle slower ring */}
        <span
          className="absolute size-14 rounded-full border-2 border-transparent border-t-primary/40 animate-spin"
          style={{ animationDuration: '1.6s', animationDirection: 'reverse' }}
        />
        {/* Logo in the centre */}
        <Logo className="size-8 relative z-10" />
      </div>

      {/* Label */}
      <p className="text-sm font-medium text-muted-foreground animate-pulse">{label}</p>
    </div>
  )
}
