import { Lock } from 'lucide-react'

/** Visible confidentiality indicator. Access itself is enforced by the backend, not by this banner. */
export const ConfidentialBanner = () => (
  <div
    role="note"
    className="mb-4 flex items-start gap-2 rounded-md border border-line bg-warm p-3 text-sm"
  >
    <Lock className="mt-0.5 size-4 shrink-0 text-coral-ink" aria-hidden />
    <p>
      <strong>Confidential.</strong> Commercially sensitive. Do not share outside authorized staff.
      Every attachment download is audited by the backend.
    </p>
  </div>
)
