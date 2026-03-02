import type React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Particles from '@/components/ui/particles'
import { useResolvedTheme } from '@/store/useThemeStore'
import { OmnishopWordmark } from '@/components/ui/omnishop-wordmark'
import { PageTransition } from '@/components/ui/page-transition'
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate'

export default function Hero(): React.JSX.Element {
  const theme = useResolvedTheme()
  const isDark = theme === 'dark'
  const { navigateTo, exiting } = useTransitionNavigate()

  return (
    <PageTransition exiting={exiting}>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <Particles
          className="absolute inset-0"
          quantity={100}
          ease={80}
          color={isDark ? '#ffffff' : '#000000'}
        />
        <div className="relative z-10 max-w-3xl text-center">
          <Badge asChild className="rounded-full border-border py-1" variant="outline">
            <Link to="/changelog">v1.1.0-beta</Link>
          </Badge>
          <div className="mt-6 flex items-center justify-center">
            <OmnishopWordmark className="w-64 sm:w-80 md:w-96 lg:w-[480px]" />
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
            <Button
              className="rounded-full text-base"
              size="lg"
              onClick={() => navigateTo('/login')}
            >
              Get Started <ArrowUpRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
