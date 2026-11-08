import Image from 'next/image'
import logo from '@/public/logo.png'

type LogoProps = {
  height?: number
  size?: number
  className?: string
  priority?: boolean
}

export function Logo({ height, size = 38, className = '', priority = true }: LogoProps) {
  const dimension = height || size

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 aspect-square select-none ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src={logo}
        alt="CalibiUpX Logo"
        width={dimension}
        height={dimension}
        className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(0,112,243,0.22)]"
        priority={priority}
        unoptimized
      />
    </div>
  )
}
