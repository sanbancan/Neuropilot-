import { z } from 'zod'

export const recognizedParadigms = ['motor-imagery', 'ssvep', 'meditation-alpha', 'p300', 'other', 'unknown'] as const
export const technicalRequirementsSchema = z.object({
  availableChannels: z.number().int().positive().max(1024).nullable(),
  requiredChannels: z.number().int().positive().max(1024).nullable(),
  samplingRateHz: z.number().positive().max(100000).nullable(),
  electrodeSites: z.array(z.string().min(1)).max(128),
  deploymentTarget: z.string().min(1).max(300).nullable(),
})
export type TechnicalRequirements = z.infer<typeof technicalRequirementsSchema>
export const emptyRequirements: TechnicalRequirements = {
  availableChannels: null, requiredChannels: null, samplingRateHz: null, electrodeSites: [], deploymentTarget: null,
}

export const objectiveInterpretationSchema = z.object({
  summary: z.string().min(1),
  paradigm: z.enum(recognizedParadigms),
  candidates: z.array(z.enum(recognizedParadigms)),
  modality: z.enum(['EEG', 'fNIRS', 'unknown']),
  questions: z.array(z.string().min(1)),
})
export type ObjectiveInterpretation = z.infer<typeof objectiveInterpretationSchema>

export const scientificSourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['publication', 'dataset_documentation', 'manufacturer_specification', 'curated_entry']),
  title: z.string().min(1),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  doi: z.string().nullable(),
  url: z.string().url().nullable(),
  venue: z.string().nullable(),
  verification: z.enum(['reviewed', 'unverified']),
  reviewedAt: z.string().nullable(),
  scope: z.string().min(1),
})
export type ScientificSource = z.infer<typeof scientificSourceSchema>

export const coverageSchema = z.object({
  status: z.enum(['sufficient', 'partial', 'missing', 'incompatible']),
  missingSections: z.array(z.string()),
  provisionalSections: z.array(z.string()).optional(),
  issues: z.array(z.string()),
  reviewedRelationships: z.number().int().nonnegative(),
  unverifiedRelationships: z.number().int().nonnegative(),
})
export type KnowledgeCoverage = z.infer<typeof coverageSchema>
export const retrievalSchema = z.object({
  status: z.enum(['ok', 'empty', 'fallback']),
  reason: z.enum(['not_configured', 'database_unavailable']).nullable(),
})
export type RetrievalStatus = z.infer<typeof retrievalSchema>
