import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[#2C5F6F] text-white hover:bg-[#234550] shadow-md hover:shadow-lg',
        destructive:
          'bg-red-600 text-white hover:bg-red-700',
        outline:
          'border-2 border-[#2C5F6F] bg-transparent text-[#2C5F6F] hover:bg-[#2C5F6F] hover:text-white',
        secondary:
          'bg-[#F5F3EF] text-[#2C2C2C] hover:bg-[#E8E5DF]',
        ghost:
          'hover:bg-[#F5F3EF] text-[#5A5A5A] hover:text-[#2C2C2C]',
        link:
          'text-[#2C5F6F] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-6 py-2',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={{ borderRadius: '1px' }}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
