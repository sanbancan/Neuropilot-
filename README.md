This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Inter and JetBrains Mono, a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## BCI reasoning and scientific grounding

NeuroPilot supports Mia21's unified Chat Completions API for GPT, Claude and
Gemini, plus direct OpenAI as a configurable rollback. Keys and model selection
stay server-side. No tool loop, authentication, persistent memory or multi-agent
orchestration is included. See `.env.example` for configuration.

The workflow is: validate request → interpret objective → resolve explicit
technical constraints → retrieve scoped scientific context → generate and
validate a plan → bounded repair or transparent catalog fallback.

`lib/ai/model.ts` remains the provider-neutral model interface. Interpretation and
BCI synthesis use that interface; model discovery, compatibility profiles and
wire normalization live in `lib/ai/providers/`. Interpretation makes at most one call, and synthesis
makes at most two (including repair). SDK requests have a 30-second timeout with
SDK retries disabled. Refusals at either stage return `422 MODEL_REFUSED` without
substitute generation. No paid calls run in automated tests.

### Provider configuration and rollback

List current Mia21 models with a **free, credential-free GET**:

```bash
npm run ai:models
```

Copy `.env.example` to `.env.local` if needed. Select a model from that command's
output and configure the server (do not commit actual credentials):

```dotenv
AI_PROVIDER=mia21
AI_MODEL=openai/gpt-4o-mini
MIA21_API_KEY=your-mia21-key
AI_MODEL_PROFILE=
```

`openai/gpt-4o-mini` is the proposed first evaluation candidate, not a live-tested
recommendation. Other families use the same workflow; change only `AI_MODEL`, for
example to an offered `anthropic/claude-sonnet-5` or `gemini/gemini-2.5-flash`.
Availability changes: use the discovered IDs rather than assuming an example is
still offered. Restart the server after changing deployment environment values.

For direct OpenAI rollback:

```dotenv
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=your-openai-key
AI_MODEL_PROFILE=
```

Without `AI_MODEL`, direct OpenAI retains `OPENAI_MODEL` and then the existing
`gpt-4o-mini` default. With no OpenAI key, offline/demo mode still works. Explicit
Mia21 selection requires both a Mia21 key and a discovered model; it never falls
through to OpenAI or pretends a configuration failure is a demo response. Clear
an exact-model override when switching models or providers.

The configured provider is selected once per design request. No automatic
provider/model fallback is implemented. Only the appropriate provider key goes
to its fixed HTTPS endpoint; Mia21 does not inherit OpenAI organization/project
headers. API redirects are rejected and raw SDK logging is disabled.

### Capabilities and model-specific settings

Mia21 public discovery uses `GET https://api.mia21.com/api/v1/models`, with a
five-minute in-process cache, coalesced concurrent refreshes, and a five-second
fetch timeout. Missing capability flags stay unknown. Expired catalogs are not
silently reused after a discovery failure. Selection accepts canonical IDs and
unambiguous aliases; it never substitutes an alternative model.

| Feature | NeuroPilot Phase 3 behavior |
| --- | --- |
| GPT, Claude, Gemini text requests | Same provider-neutral interpretation and synthesis interface |
| JSON generation through Mia21 | Explicit schema prompting, local Zod + scientific validation, bounded repair |
| JSON mode / strict JSON Schema | Off by default for Mia21; requires an exact-model, operator-verified override |
| Output budget | 4096 tokens by default; capped by advertised output limit when present |
| Reasoning GPT parameters | `max_completion_tokens`, no default temperature |
| Other models | `max_tokens`; Mia21 temperature omitted unless explicitly configured |
| Tools, streaming, vision, documents, web search | Discovered/recorded capabilities; not enabled in NeuroPilot's text workflow |
| Persistent memory | Disabled request mode; no user/space/conversation IDs or memory API calls |

Mia21's advertised capabilities do **not** establish JSON mode, strict schema,
temperature, token-parameter or scientific-quality compatibility for every model.
The public model list does not supply a universal strict-output guarantee. Model
family defaults are conservative request profiles, not live compatibility
certifications. Provider parameter rejection is reported, not silently worked
around. After evaluating a model, configure its exact profile without code changes:

```dotenv
AI_MODEL_PROFILE='{"model":"anthropic/claude-sonnet-5","outputMode":"prompt","tokenParameter":"max_tokens","maxOutputTokens":4096,"temperature":null}'
```

After separately establishing JSON mode compatibility, an operator can opt in:

```dotenv
AI_MODEL_PROFILE='{"model":"your-exact-discovered-model","outputMode":"json_object","verifiedOutputModes":["json_object"]}'
```

For strict schema use `outputMode: "json_schema"` and
`verifiedOutputModes: ["json_schema"]`. Both interpretation and synthesis supply
their own complete schema. The flag is an operator attestation, not automatic
validation or a claim that this repository performed live testing. Profile
objects reject unknown fields; a profile for a different model fails locally.
`meta.provider.liveEvaluated` remains false because no live evaluation results
are stored or certified by the application. All output modes retain the same
parsing, repair and scientific checks.

Tool responses, even alongside valid JSON, are not accepted as successful plans.
No tool executor is present. Refusals, content filtering, HTTP policy refusals,
truncation and provider errors are normalized without bypassing safety decisions.

### Failure reporting and memory exclusion

Setup/discovery/model-selection failures return HTTP 503 with
`error.code = AI_PROVIDER_ERROR` and a sanitized `providerCode`. Runtime provider
failures use the existing explicitly labeled catalog fallback, with their exact
category in `meta.fallbackReason` and `meta.interpretationFailure` when relevant.
Interpretation infrastructure failures do not trigger another synthesis request.
HTTP authentication, rate/quota, unavailable service, and rejected parameters
have separate categories. Refusals still return HTTP 422 without a substitute
plan. No upstream response bodies, headers or API keys are returned to clients.

`meta.provider` records provider, model family, canonical model ID, output mode,
profile source, discovery state, and advertised capabilities. It is additive;
older response fixtures without the optional field remain parseable. The
dashboard shows the selected provider/model alongside the existing failure labels.

Mia21 requests send `X-Incognito: true` and omit user, space and conversation IDs.
No initialization, history, file upload, web search, memory or bot API is called.
This disables the application's memory integration; it is not a contractual
zero-retention guarantee for vendor infrastructure/logs. Vendor retention must be
checked before sensitive data is used.

Official references: [Mia21 API documentation](https://docs.mia21.com/) and
[OpenAI Chat Completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
The public discovery command has been checked against Mia21; completion behavior
has been tested with mocks only. Live evaluation is pending approval. See
[the evaluation checklist](docs/mia21-evaluation.md).

### Objective and plan states

Natural-language interpretation is no longer gated by keyword matching. Offline
hints preserve demo functionality and ask questions for objectives they cannot
resolve. P300 is recognized separately from SSVEP; recognition does not assert
catalog coverage. An explicit `P300` request cannot be silently remapped to SSVEP.

`POST /api/design` still returns `{ plan, meta }`. Valid requests return HTTP 200
with one of these `plan.status` values:

- `complete`: all required sections have reviewed coverage and resolved inputs;
  this means a complete proposal, not an experimentally validated system.
- `partial`: supported portions plus explicit evidence/requirement gaps.
- `clarification_required`: essential intent or constraints need resolution.
- `unsupported`: incompatible requirements, such as an EEG paradigm with fNIRS-only acquisition.
- `insufficient_evidence`: the selected catalog cannot support technical recommendations.

Classifier and sampling may be null; electrodes, protocols, features and other
recommendation arrays may be empty. The dashboard shows status, questions, gaps,
claims, assumptions, limitations, source metadata, and deferred fields. Edit the
existing form to answer clarification questions; this phase has no conversation
storage. Previously saved Phase 1 response fixtures require migration.

The optional request `requirements` object provides precise constraints:

```json
{
  "goal": "Explore left-versus-right motor imagery using EEG.",
  "modality": "EEG",
  "hardware": "OpenBCI Cyton",
  "constraints": "I only have 8 channels.",
  "requirements": {
    "availableChannels": 8,
    "requiredChannels": 4,
    "samplingRateHz": 250,
    "electrodeSites": ["C3", "Cz", "C4"],
    "deploymentTarget": "desktop"
  }
}
```

Structured values are preferred for exact specifications. Conservative literal
extraction handles common channel, sampling and deployment expressions in the
existing form. It is not a complete natural-language constraint parser.

### Retrieval, sources and scientific limits

Live Neo4j and offline seed snapshots use the same deterministic retrieval
function, including indirect relationships, dataset relevance, modality checks,
hardware configuration matching, channel/rate constraints and deployment target.
Pipeline ordering is stable. Reasoning paths come from actual retrieved edges,
not static prewritten paths. Successful empty database queries remain empty;
connection/decoding errors trigger an explicitly disclosed offline fallback.

`meta.coverage` separates sufficient/partial/missing/incompatible knowledge from
`meta.retrieval` operational state. `meta.interpretationFailure` distinguishes an
interpretation fallback from a plan-generation failure. `meta.attempts` counts
synthesis attempts; `meta.interpretationAttempts` counts interpretation attempts.

`lib/graph/sources.ts` records identifiers, bibliographic metadata, URLs, review
dates and deliberately narrow scope notes. Source kinds cover publications,
official dataset documentation, manufacturer specifications and curated entries.
Legacy assertions remain `curated:legacy-v1`, explicitly unverified. Reviewed
publication entries reflect checked metadata/abstracts, not verification of all
claims in a full paper or of any user's project. Manufacturer modes are separate
configurations (Cyton, Daisy and Ganglion); they do not prove experiment suitability.

The production catalog currently supports only partial designs: reviewed montage,
protocol, evaluation and deployment coverage remains incomplete. P300 has no design
catalog yet. Unknown devices and all fNIRS-specific designs remain unsupported by
the present catalog. The system must expose these gaps rather than fabricate them.

Every populated technical section needs section-specific provenance. Backend
validation checks catalog membership, source/relationship attribution, known
hardware modes, channel constraints, modality, status completeness, dataset
identity/synthetic status, and selected unsupported performance claims. The model
receives the complete output schema and full relevant context, including dataset
limitations. Validation cannot prove arbitrary prose scientifically true. Expert
review and additional source-backed catalog entries remain necessary. No real
experimental observations or performance results are generated.

### Safe Neo4j catalog migration

The old unscoped catalog is not automatically trusted or modified. Load the new
catalog into the same database using `npm run db:seed`. The script reads Neo4j
credentials directly from the project-root `.env.local`, so stale exported shell
variables cannot select another instance. It parses the file without executing
shell code and withholds connection details from logs. This is a separate database
operation; it is not run by the app, build, or tests.

The script transactionally MERGEs only `NeuroPilotKnowledge` and
`NeuroPilotSource` records with `catalogId = neuropilot-science-v2`. Relationship
endpoints and IDs are scoped to that catalog. It never clears the database,
deletes unrelated data, or removes legacy records. Repeated sequential seeds are
idempotent; obsolete entries are not automatically deleted. A configured database
without this scoped catalog will correctly report missing knowledge until seeded.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

If the environment prevents Turbopack worker port binding, use the supported
alternative `npm run build -- --webpack`. Existing Google Fonts may require network
access during builds.

Tests use the existing Node test runner and `tsx`, with mocked model transports,
SDK fetch, graph readers and catalog transactions. They cover Phase 1 regressions,
paraphrases/ambiguity, P300 separation, plan states, technical conflicts,
live/offline retrieval parity, provenance, non-destructive seeding, all three Mia21
model families, compatibility overrides, discovery caching and failure paths.
No live Neo4j integration or paid-provider quality claim can be inferred from these tests.

### Provisional architectures and generation diagnostics

Personalized design synthesis remains an AI operation using the configured provider
(including Mia21 GPT, Claude, or Gemini) and retrieved Neo4j context. A question about
an acquisition device or deployment target no longer blocks otherwise useful synthesis.
Known, compatible objectives can return partial proposals with targeted questions;
unknown objectives, incompatible modalities, conflicting requirements, and missing
paradigm knowledge retain explicit gates. The existing interpretation/synthesis workflow is retained; no agents were added.

Claims distinguish `scientific_evidence`, reviewed `engineering_recommendation`, and
`provisional_engineering_recommendation`. The last may use relevant, source-linked
unverified catalog relationships and is visibly labeled provisional. Every named signal,
electrode, processing method, feature, and classifier must carry component-specific
retrieved provenance. Model-derived protocol steps require provisional annotations
containing the exact step title and links to retrieved paradigm or processing context.
These steps do not become reviewed experimental protocols. Hardware selection and
sampling specifications continue to require reviewed manufacturer records. Complete
plans still require sufficient reviewed coverage; provisional architectures normally
remain partial. Catalog assertions and source review never establish experimental
validation or predicted performance.

`meta.generator` and `meta.model` identify the delivered design's actual origin.
A fallback's provider/model chip is explicitly labeled **Configured**. Its safe
`meta.diagnostics` reports synthesis (`succeeded`, `failed`, or `skipped`), a gate
reason, and broad validation categories (`schema`, `provenance`,
`technical_consistency`, `plan_state`). Combine these with `meta.fallbackReason`,
`meta.attempts`, `meta.interpretationFailure`, and retrieval status when diagnosing a
request. `coverage.provisionalSections` distinguishes existing unreviewed context
from absent evidence; `missingSections` continues to describe missing reviewed support.
No raw model errors, rejected content, credentials, or user text are added to diagnostics
or logs. Responses are not persisted as diagnostic history; save the relevant metadata
from the request being investigated. The returned plan itself contains the requested
user-facing proposal and must be handled according to the application's data policy.

Deterministic offline/failure output remains a conservatively filtered, explicitly
labeled catalog starting point. It is not expanded into a substitute personalized AI
design. Tests mock all model generation. Live Mia21 quality and output-budget evaluation
remain separate activities requiring approval for paid calls; these changes do not seed
or modify Neo4j.
