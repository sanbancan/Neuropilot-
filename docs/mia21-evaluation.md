# Mia21 evaluation checklist — approval required for paid requests

No live completions have been run. Discovery is a separate free public GET and
does not establish model quality, parameter support, retention, or billing access.

Start with one selected candidate: `openai/gpt-4o-mini`, if still offered by
`npm run ai:models`. Its direct OpenAI path provides a familiar comparison while
Mia21 runs the same workflow. This is a proposed first test, not a certified best
model. Do not run additional families as an implicit fallback or in a batch.

Before live requests, obtain explicit approval for the model, number of design
requests and spending limit. A design can make one interpretation request plus
up to two synthesis requests. Use synthetic requirements only. Retain incognito
mode, no user/conversation identifiers, tools off, and the default prompt output
profile for the first run.

Use the same fixed catalog snapshot and cases for each separately approved model:

| Case | Required behavior |
| --- | --- |
| Left/right motor-imagery paraphrase | Interpret the task; return only source-supported choices and explicit gaps |
| SSVEP selection | Distinguish continuous frequency-tagged stimulation from ERPs |
| P300 speller | Recognize P300 and report missing catalog coverage; do not borrow SSVEP methods |
| Meditation/alpha exploration | Preserve exploratory status and eye-state limitations; no meditation proof |
| fNIRS-only acquisition with an EEG objective | Reject incompatible acquisition recommendations |
| Two available channels but eight required | Request clarification; no conflicting montage |
| Known Cyton versus Daisy configuration | Preserve manufacturer channel/rate differences |
| Unknown custom device | Defer unverified specifications |
| Unknown/ambiguous objective | Clarify or report insufficient evidence |

For each result, record canonical model ID, provider/profile configuration,
catalog/source revision, plan state, interpretation attempts, synthesis attempts,
repair/fallback categories, source attribution, constraint satisfaction, total
latency, provider usage and billed/estimated cost where available. Usage/cost are
not currently collected automatically by NeuroPilot; do not fill them with
invented numbers. Arrange expert review of scientific claims and tradeoffs.

Only after the first model passes, request a separate evaluation for an offered
Claude model, then separately for an offered Gemini model. Repeat identical cases.
Results must be identified by model and configuration, not pooled as proof that
all Mia21 models behave identically.

Evaluate JSON mode and strict schema separately before adding
`verifiedOutputModes` to an exact-model override. Test parameter acceptance,
truncation/refusal behavior, whether the response format is actually honored,
and both interpretation and plan schemas. A successful mocked test does not
qualify as live verification. Do not promote a profile based on one valid JSON
answer alone.

Rollback is manual configuration: `AI_PROVIDER=openai`, select an OpenAI model,
set its key, clear the Mia21-specific profile, and restart. No fallback request
should silently send project input to a second provider.
