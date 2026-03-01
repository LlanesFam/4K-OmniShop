import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { NavMenu } from '@/components/ui/nav-menu'

const Navbar = (): React.JSX.Element => {
  return (
    <nav className="h-16 border-b bg-background">
      <div className="mx-auto flex h-full max-w-screen-lg items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />

          {/* Desktop Menu */}
          <NavMenu className="hidden md:block" />
        </div>

        <div className="flex items-center gap-3">
          <Button asChild>
            <Link to="/login">
              Get Started <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
