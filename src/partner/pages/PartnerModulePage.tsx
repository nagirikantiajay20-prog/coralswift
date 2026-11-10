import { ModulePlaceholder } from '@/components/common/ModulePlaceholder'
import { PARTNER_MODULES, type PartnerModuleKey } from '../config/modules'

/** Honest per-module scaffold; replaced by real pages in Phases 23+. */
export default function PartnerModulePage({ module }: { module: PartnerModuleKey }) {
  const m = PARTNER_MODULES[module]
  return (
    <ModulePlaceholder
      title={m.title}
      description={m.description}
      capabilities={m.capabilities}
      note="Scaffold only. The backend exposes the endpoints listed, but this module is built in a later phase."
    />
  )
}
