import EnquiriesPage from '@/features/business-enquiries/pages/EnquiriesPage'
import { ConfidentialBanner } from '../components/ConfidentialBanner'

/** The backend has one enquiry resource: strategic enquiries are `/admin/enquiries?type=strategic`. */
export default function StrategicEnquiriesPage() {
  return (
    <>
      <ConfidentialBanner />
      <EnquiriesPage scope="strategic" />
    </>
  )
}
