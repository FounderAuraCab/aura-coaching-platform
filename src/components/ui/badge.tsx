import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center px-3 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[#2C5F6F] text-white',
        secondary: 'bg-[#F5F3EF] text-[#5A5A5A]',
        success: 'bg-emerald-100 text-emerald-700',
        warning: 'bg-amber-100 text-amber-700',
        destructive: 'bg-red-100 text-red-700',
        outline: 'border border-[#2C5F6F] text-[#2C5F6F] bg-transparent',
        pending: 'bg-blue-100 text-blue-700',
        locked: 'bg-gray-100 text-gray-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{
        borderRadius: '1px',
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
