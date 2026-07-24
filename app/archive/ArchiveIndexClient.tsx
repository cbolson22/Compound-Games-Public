'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type ArchiveIndexContentType from './ArchiveIndexContent'

const ArchiveIndexContent = dynamic(() => import('./ArchiveIndexContent'), { ssr: false })

export default function ArchiveIndexClient(props: ComponentProps<typeof ArchiveIndexContentType>) {
  return <ArchiveIndexContent {...props} />
}
