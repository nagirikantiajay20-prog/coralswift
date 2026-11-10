import { type LucideIcon } from 'lucide-react'
import { Image, LayoutTemplate, Layers, Factory } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/states'
import { Card } from '@/components/ui/card'

const KINDS = {
  homepage: {
    title: 'Homepage & banners',
    icon: LayoutTemplate,
    missing:
      'The API has no homepage, hero, banner, call-to-action or featured-section resource. The public site cannot be edited as a single homepage object, and nothing is simulated.',
  },
  services: {
    title: 'Services',
    icon: Layers,
    missing:
      'The API has no service resource (no title/image/display-order/visibility fields). Generic content items cannot be treated as services without source support, so none are created.',
  },
  industries: {
    title: 'Industries',
    icon: Factory,
    missing: 'The API has no industry or sector resource. No categories or offerings are invented.',
  },
  media: {
    title: 'Media library',
    icon: Image,
    missing:
      'The API has no media library (no list, image upload, replace or delete). The only upload is a downloadable attachment on a draft content item, and private onboarding documents are never exposed here.',
  },
} satisfies Record<string, { title: string; icon: LucideIcon; missing: string }>

export type UnavailableKind = keyof typeof KINDS

export default function UnavailablePage({ kind }: { kind: UnavailableKind }) {
  const k = KINDS[kind]
  return (
    <>
      <PageHeader title={k.title} />
      <Card>
        <EmptyState
          icon={k.icon}
          title="Not available: the backend does not support this yet"
          description={k.missing}
          action={
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <Link to="/admin/website" className="text-coral-ink hover:underline">
                  Website overview and backend support matrix
                </Link>
              </li>
              <li>
                <Link to="/admin/website/pages" className="text-coral-ink hover:underline">
                  Manage content items
                </Link>
              </li>
            </ul>
          }
        />
      </Card>
    </>
  )
}
