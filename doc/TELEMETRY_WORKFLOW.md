# Telemetry Workflow

This is the public contributor workflow for proposing first-party Paperclip
product telemetry and later promoting accepted proposals to the generated typed
telemetry contract.

Use this workflow when a product change needs a new first-party event but the
generated contract in
`packages/shared/src/telemetry/generated/paperclip-telemetry.ts` does not contain
that event yet.

## Propose An Event

Proposal call sites use the existing typed `TelemetryClient.track()` API. There
is no separate proposed-event runtime API.

Use the proposal lane only for first-party Paperclip product telemetry. Do not
use it for plugin, third-party, test, debug, or ad-hoc analytics events.

The proposed event name is the future canonical event name. Do not prefix it
with `proposed.`.

Event names and dimension keys must match this grammar:

```text
^[a-z0-9][a-z0-9._:-]{1,63}$
```

That means 2-64 lowercase characters, numbers, dots, underscores, colons, and
hyphens, starting with a lowercase letter or number. Prefer
`<feature_namespace>.<action_or_outcome>`, for example
`skill_studio.skill_created`.

These namespaces are not proposal-eligible: `plugin.*`, `third_party.*`,
`external.*`, `test.*`, and `debug.*`.

Every proposed call site must include this marker immediately before the event
name line:

```ts
// @ts-expect-error -- proposed-telemetry(<issue>): <rationale>
```

`<issue>` is the public Paperclip issue or PR identifier that explains the
product work, for example
`https://github.com/paperclipai/paperclip/issues/2450` or `PAP-2450`. `<rationale>` should say
what product or reliability decision this event will inform. It is source-review
context, not telemetry payload.

Use this copy-pasteable multi-line shape:

```ts
client.track(
  // @ts-expect-error -- proposed-telemetry(https://github.com/paperclipai/paperclip/issues/2450): measure Skill Studio create completion
  "skill_studio.skill_created",
  {
    sharing_scope: scope,
    category_count: categories.length,
  },
);
```

The directive's target line must hold the event name alone. That shape is
recommended because `@ts-expect-error` suppresses every TypeScript error on its
target line, and its TS2578 expiry signal only fires when it suppresses nothing.
If the whole `track()` call is on one line, a post-adoption payload mismatch can
keep the directive "used" and prevent the loud failure that should tell you to
promote the call site. This is a documented recommendation, not a CI gate.

## Dimension Rules

Keep proposal dimensions deliberately small and reviewable:

- Use an inline object literal with at most 20 keys.
- Use only primitive values: `string`, finite `number`, or `boolean`.
- Do not emit `null`, arrays, objects, bigint, functions, symbols, `NaN`, or
  infinities.
- Cap string values at 256 characters.
- Use low-cardinality operational values or explicitly hashed/normalized refs.
- Never send prompts, transcripts, document bodies, issue bodies, local paths,
  hostnames, repository remotes, command strings, secrets, tokens, emails, URLs,
  or arbitrary free text.

If a value is private before hashing or normalization, hash or normalize it
before emission and make that behavior obvious at the call site. Do not rely on
backend review to clean up sensitive client payloads.

## Static Extractability

Proposal inventory is based on static extraction and source review. Keep call
sites extractable:

- Call the typed first-party telemetry client's `track()` method.
- Put the `proposed-telemetry(<issue>): <rationale>` marker immediately above
  the event-name line.
- Pass a string literal event name on its own line. Do not use variables,
  template literals, concatenation, or helper calls for the name.
- Pass an inline object expression for dimensions. Do not use object variables,
  spreads, computed keys, conditional object construction, or nested objects.
- Use literal identifier keys or literal string keys matching the telemetry
  grammar.
- Keep every dimension value statically typed as `string`, `number`, or
  `boolean`. Avoid `any`, `unknown`, nullable values, and unions containing
  non-primitives.

When multiple call sites use the same proposed event, they must agree on the
primitive type for each shared dimension key.

Run the extractor before opening the PR when it is available in your checkout:

```bash
node scripts/extract-proposed-events.mjs
```

The extractor output uses `proposed-telemetry-extractor.v2` and lists proposal
names, dimension names and primitive types, rationale, and file/line provenance.
The marker workflow is still load-bearing when extractor automation is absent or
held; reviewers should be able to inspect the source and follow the convention
without repository secrets.

## PR Checklist For Proposals

Before asking for review on a proposal PR:

- Confirm the event answers a concrete product or reliability question.
- Confirm no existing generated event answers the same question.
- Confirm every dimension is low-cardinality and public-contract safe.
- Confirm every proposed call site has the `proposed-telemetry` marker in the
  multi-line shape.
- Run the narrow checks for the code path you changed.
- Run the extractor if `scripts/extract-proposed-events.mjs` exists in your
  checkout.

A proposed event may be accepted, rejected, renamed, or held for more evidence.
Keep proposal names easy to rename: do not expose them in user-facing copy,
configuration, saved data, or public APIs.

## Promote An Accepted Event

Promotion happens after the generated telemetry contract includes the event in
`packages/shared/src/telemetry/generated/paperclip-telemetry.ts`.

For each accepted event:

1. Sync the generated contract into this repo.
2. Search for the accepted event name and review every proposed call site. This
   look-up-by-event-name sanity step is a process backstop, not a mechanical
   guarantee.
3. Re-run typecheck and confirm the directive on the event-name line has become
   a TS2578 error.
4. Remove the `@ts-expect-error -- proposed-telemetry(...)` directive.
5. Let the payload object typecheck against the generated contract, then fix any
   required-dimension, dimension-type, or enum-domain mismatch.
6. Add a first-party helper in `packages/shared/src/telemetry/events.ts` when a
   stable helper API makes the emitter clearer.
7. Keep direct `client.track("<event>", { ... })` calls only when a helper would
   add no value.
8. Apply any event or dimension renames made during contract review.
9. Keep emitters raw. Do not lowercase, alias-map, or normalize enum-like values
   unless the generated contract explicitly requires that emitted value.
10. Use shared constants from `packages/shared/src/constants.ts` for enum-like
    dimensions when they already exist.
11. Add or update focused tests for helper behavior and privacy-preserving
    hashing or normalization.

For rejected events, remove the proposed call site instead of converting it to
dynamic telemetry.

Verify a promotion with at least:

```bash
pnpm --filter @paperclipai/shared typecheck
pnpm vitest run \
  packages/shared/src/telemetry/readme-contract.test.ts \
  packages/shared/src/telemetry/client-types.test.ts
```

If the promoted call site lives outside `packages/shared`, also run the narrow
server or UI test that covers the emitting path.

The promotion is complete when no accepted or rejected proposal call sites remain
for the feature and the extractor no longer reports those proposal names.
