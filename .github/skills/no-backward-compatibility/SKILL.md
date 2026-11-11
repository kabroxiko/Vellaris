---
name: no-backward-compatibility
description: Beta policy for this project — break APIs, payloads, stored documents and prompts freely. Never add compatibility shims, legacy branches, dual-reads, migrations or in-code fallbacks. Load before changing any contract, stored shape, prompt or client/server boundary.
---

# No Backward Compatibility — Beta Policy

This project is in beta. There is exactly one supported shape of every API, payload, stored document, prompt and
client: the current one. Anything written by an older version is not a compatibility obligation; it is data that no
longer exists.

This skill also carries the former `no-fallbacks` rule, which it supersedes: no ad-hoc fallbacks, no heuristics that
fill in missing data, no workaround patches.

## The rule

When something changes, change it — everywhere, in one commit — and delete what it replaced.

1. **No compatibility shims.** Do not keep an old field next to a new one, do not accept both names, do not add
   `// legacy` branches, version suffixes (`_v2`, `legacy*`, `old*`) or dual-read/dual-write paths.
2. **No migrations for stored data.** A stored document that no longer matches the current shape is not upgraded in
   code; it is regenerated, or it is simply stale. Do not write back-fill scripts, `if doc["oldField"] != nil` branches,
   or "documents written before X" handling.
3. **No fallbacks.** If canonical data is missing or malformed, fail loudly (error, log, non-2xx) instead of guessing,
   coercing or synthesizing a substitute. If a fallback is genuinely wanted, the human asks for it explicitly and it is
   written down as policy with a test — not slipped in.
4. **Change every consumer in the same change.** Server, client, prompts, templates, docs, tests, fixtures and the API
   contract move together. A change that leaves one caller reading the old shape is unfinished, not backward compatible.
5. **Delete dead ends.** Renaming? Remove the old key. Field gone? Remove the reader, the writer, the assertion and the
   doc sentence. No tombstones, no "kept for historical reasons", no TODO to clean up later.
6. **Prompts are contracts too.** When a model-facing field, coordinate space or envelope key changes, update the
   template that asks for it and any rule that explains it in the same change — old outputs are not special-cased.

## What "still in beta" does not excuse

- Breaking things silently: a contract change still updates the docs, the prompts and the tests that describe it.
- Leaving two truths in the tree: a stale comment or doc sentence describing the removed shape is a bug.
- Deleting user data without saying so: dropping stale stored data is fine, but the change that does it must say so.

## Checklist before saying a change is done

- [ ] No `legacy`, `backward`, `compat`, `deprecated`, `v2`, `old` branch left behind by this change.
- [ ] Every caller, prompt, template, doc and test reads the new shape; none reads both.
- [ ] Stored documents that predate the change are regenerated or accepted as stale — never parsed "just in case".
- [ ] Missing data fails visibly instead of being filled in with a guess.
