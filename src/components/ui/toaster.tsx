import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[#FEFDFB] group-[.toaster]:text-[#2C2C2C] group-[.toaster]:border-[#E8E5DF] group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-[#5A5A5A]',
          actionButton:
            'group-[.toast]:bg-[#2C5F6F] group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-[#F5F3EF] group-[.toast]:text-[#5A5A5A]',
        },
      }}
      style={{
        fontFamily: 'Inter, sans-serif',
      }}
      {...props}
    />
  )
}

export { Toaster }
