import { Aperture } from 'lucide-react'

interface BrandProps {
  compact?: boolean
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand__mark" aria-hidden="true">
        <Aperture />
      </span>
      <span className="brand__name">
        img <strong>tools</strong>
      </span>
    </div>
  )
}
