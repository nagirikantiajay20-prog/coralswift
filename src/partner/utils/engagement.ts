/** Labels for the backend `EngagementPathway` enum (openapi.json). The only engagement data the API exposes. */
export const PATHWAY_LABEL: Record<string, string> = {
  direct_project_engagement: 'Direct project engagement',
  vendor_subcontracting: 'Vendor / subcontracting partnership',
  strategic_merger_integration: 'Strategic partnership discussion',
}
/** Strategic pathway: show the name only, never any detail (confidential; handled by Coral Swift directly). */
export const pathwayLabel = (p?: string) =>
  p ? (PATHWAY_LABEL[p] ?? p.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())) : undefined
