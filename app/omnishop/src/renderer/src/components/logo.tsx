import { useResolvedTheme } from '@/store/useThemeStore'
import { cn } from '@/lib/utils'
import logoDark from '@/assets/images/logo-dark.png'
import logoLight from '@/assets/images/logo-light.png'

export const Logo = ({ className, ...props }: React.ComponentProps<'img'>): React.JSX.Element => {
  const theme = useResolvedTheme()
  const logoSrc = theme === 'dark' ? logoDark : logoLight

  return <img alt="logo" className={cn('size-7', className)} src={logoSrc} {...props} />
}
