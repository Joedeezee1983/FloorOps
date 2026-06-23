import { MACHINE_STATUS_LABELS, MACHINE_STATUS_STYLES } from '@/constants'
import type { MachineStatus } from '@/types'

export interface StatusBadgeProps {
  status: MachineStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const styles = MACHINE_STATUS_STYLES[status]
  const textSize = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${textSize} ${styles.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {MACHINE_STATUS_LABELS[status]}
    </span>
  )
}
