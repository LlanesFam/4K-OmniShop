import { AreaChart, Boxes, MessageSquare, Package, ShoppingCart, Users } from 'lucide-react'

export const features = [
  {
    title: 'Store Management',
    icon: ShoppingCart,
    description: 'Manage products, categories, and price lists with ease.',
    href: '/login'
  },
  {
    title: 'Sales Tracking',
    icon: AreaChart,
    description: 'Track transactions and generate insightful sales reports.',
    href: '/login'
  },
  {
    title: 'User Approvals',
    icon: Users,
    description: 'Administer user registrations and manage pending approvals.',
    href: '/login'
  },
  {
    title: 'Social Integration',
    icon: MessageSquare,
    description: 'Connect with customers via Messenger and manage emails with Gmail integration.',
    href: '/login'
  },
  {
    title: 'Product Catalog',
    icon: Package,
    description: 'A complete overview of all your products.',
    href: '/login'
  },
  {
    title: 'Categories',
    icon: Boxes,
    description: 'Organize your products into custom categories.',
    href: '/login'
  }
]
