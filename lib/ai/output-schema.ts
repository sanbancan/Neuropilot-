/** Generated from the application contract; no separately maintained JSON schema. */
import { zodResponseFormat } from 'openai/helpers/zod'
import { prototypePlanSchema } from '@/lib/schemas/design'

// Used as prompt context and passed to transports that explicitly support strict schema output.
// The SDK helper requires nullable optional fields; the app accepts both omission and null.
export const planOutputSchema = zodResponseFormat(
  prototypePlanSchema, 'prototype_plan',
).json_schema.schema
