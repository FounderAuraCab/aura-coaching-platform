import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label
            className="block mb-2"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              color: '#5A5A5A',
            }}
          >
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full pb-3 bg-transparent border-0 border-b-2 border-gray-300 focus:border-[#2C5F6F] focus:outline-none transition-all duration-500 placeholder:text-gray-400',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 400,
            color: '#2C2C2C',
          }}
          ref={ref}
          {...props}
        />
        {/* Subtle relief */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px] opacity-15"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.05) 50%, transparent 100%)',
            transform: 'translateY(2px)',
          }}
        />
        {error && (
          <p className="mt-2 text-xs text-red-500" style={{ fontFamily: 'Inter, sans-serif' }}>
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
