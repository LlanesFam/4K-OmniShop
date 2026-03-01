import type React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Particles from '@/components/ui/particles'
import { useResolvedTheme } from '@/store/useThemeStore'
import { Logo } from '@/components/ui/logo'

export default function Hero(): React.JSX.Element {
  const theme = useResolvedTheme()
  const isDark = theme === 'dark'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <Particles
        className="absolute inset-0"
        quantity={100}
        ease={80}
        color={isDark ? '#ffffff' : '#000000'}
      />
      <div className="relative z-10 max-w-3xl text-center">
        <Badge asChild className="rounded-full border-border py-1" variant="secondary">
          <Link to="/changelog">
            Just released v1.0.0 <ArrowUpRight className="ml-1 size-4" />
          </Link>
        </Badge>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Logo className="h-20 w-20" />
          <h1 className="font-semibold text-4xl tracking-tighter text-title sm:text-5xl md:text-6xl md:leading-[1.2] lg:text-7xl">
            •
          </h1>
          <h1 className="font-semibold text-4xl tracking-tighter text-foreground sm:text-5xl md:text-6xl md:leading-[1.2] lg:text-7xl">
            Omni<span className="text-fuchsia-500">Shop</span>
          </h1>
        </div>
        <h1 className="mt-6 font-semibold text-2xl tracking-tighter text-foreground sm:text-1xl md:text-3xl md:leading-[1.2] lg:text-4xl">
          Total <span className="text-yellow-300">Shop Control. </span>
          Zero <span className="text-cyan-400"> Connectivity Worries.</span>
        </h1>
        <p className="mt-6 text-foreground/80 md:text-lg">
          A professional-grade management suite for modern retailers. Track inventory, automate
          pricing with AI, and process sales offline—all in one secure dashboard.
        </p>
        <div className="mt-12 flex items-center justify-center gap-4">
          <Button asChild className="rounded-full text-base" size="lg">
            <Link to="/login">
              Get Started <ArrowUpRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
