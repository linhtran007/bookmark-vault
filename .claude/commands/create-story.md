
---
name: brainstorm story
description: "Use this BEFORE any dev change. Goal: produce a SMALL-SCOPE dev Story doc (not a business spec). Must ground everything in the actual repo/docs to avoid hallucinations."
---

# Brainstorm story: Ideas → Dev Story (Small Scope)

## Overview
Turn a vague idea into a **single, small, implementable dev Story** that fits in one agent context.  
This is **for developers**, not business stakeholders. Keep it tight, technical, and evidence-based.

**Output:** a markdown Story file that a dev can read and say:  
> “Yes, this matches the repo reality, the flow is correct, and the scope is small enough.”

---

## Definition: Story (in this skill)
A **Story** is a small scope change that can be completed in one focused work chunk (often ≤ 1 day).  
If it’s bigger, split into multiple Stories (don’t create an Epic here).

**Heuristic:** If you can’t explain the Story in < 10 bullet points + a small diff plan, it’s too big.

NOT: pass this phase if story to large
MUST: if story too big try recomnended user using another skill recomnended clear context and do another skill

---

## The Process

### 1) Ground in repo reality (NO design yet)
**You MUST inspect the current project state first:**
- Read relevant files, docs, config, existing patterns
- Identify where similar behavior already exists
- Collect “evidence links” (file paths + key snippets or line refs if available)

**Rules:**
- **No guessing.** If you can’t find it in repo/docs, mark it as unknown and ask try to interact with user much as possible
- Prefer existing conventions over inventing new structures (recomnended)

Output_To_Story_File: Yes

### 2) Clarify with ONE question at a time
Ask **one** question per message. Prefer multiple-choice.

MUST: using recomnended for use chosing multiple-choice and why

Focus on dev-relevant clarity:
- What is the user trying to do (precise behavior)?
- Where in the product does it happen (route/screen/component/module)?
- Constraints (API contract, DB schema, performance, backwards compatibility)
- Success criteria (what passes / what fails)
- Out of scope (explicitly)

If unclear, ask the *smallest* question that unlocks progress.

Output_To_Story_File: Yes

### 3) Propose 2–3 approaches (lightweight)
Offer 2–3 implementation approaches with trade-offs:
- **Recommended approach first**
- Explain why it best matches current repo patterns
- Mention risk and complexity

Keep this short. This is not an architecture doc.

MUST: short but clean flow easy understand using good pratice for option 1

Output_To_Story_File: Yes

### 4) Write the Story doc (the deliverable)
Once you’re confident with the use knowledge, create the Story file using the template below.

**Story sections should be concise.**
Aim for dev-readable clarity, not narrative.

MUST: this story about action a user interact with system from e2e how it change how it react to current code base.
NOT: a short walk never help user clear

Output_To_Story_File: Yes

### 5) After the Story
- Save the Story to: `docs/stories/YYYY-MM-DD-<slug>.md`
- If git workflow is available: commit the story doc ask use read and review

---

## Key Principles
- **Small scope** only (split aggressively)
- **Evidence-based** (repo/docs drive decisions)
- **One question at a time**
- **No hallucinations / no assumptions**
- **Prefer existing patterns**
- When Output_To_Story_File is yes it ALWAYS ALWAYS ALAWAYS HAVE IN THE FINAL FILE WITH CHECKSUME.
- **Dev language** (routes, modules, types, queries, edge cases)
- One question at a time - Don't overwhelm with multiple questions
- Multiple choice preferred - Easier to answer than open-ended when possible
- YAGNI ruthlessly - Remove unnecessary features from all designs
- Explore alternatives - Always propose 2-3 approaches before settling
- Incremental validation - Present design in sections, validate each
- Be flexible - Go back and clarify when something doesn't make sense


---

# Story File Template (MUST follow)

Create a file:
`docs/stories/YYYY-MM-DD-<slug>.md`

Use this exact structure:

---

## Title
Short, specific: “Add X to Y when Z”

## User intent (what user wants)
- **User**: who triggers this (end user / admin / internal tool / API client)
- **Goal**: what they want to do (1 sentence)
- **Why now**: optional, only if relevant to dev constraints

## Support needed (what I, the agent, will provide) (MUST ASK QUESTION!!)
- What I will do: analyze repo, propose solution, produce tasks, list risks
- What I will not do: anything out of scope

## How the user uses this (current flow)
Describe the **current behavior** as it exists now.
- Entry point: route/screen/command/API
- Steps (bullets)
- Current outputs / side effects

## Repo evidence (NO assumptions)
List concrete references proving the current flow.
Format:
- `path/to/file.ext` — what it shows (1 line)
- `path/to/another.ts` — what it shows (1 line)

If you cannot locate evidence, write:
- **Unknown:** <what’s unknown>  
  **Need:** <what to confirm>

## Problem statement (what’s wrong / missing)
- What is missing or broken
- Who it affects
- Repro conditions (if bug)

## Proposed solution (recommended)
- Behavior change (bullets)
- Where changes happen (files/modules/components)
- Data changes (types/schema) if any
- Error handling & edge cases
- Backwards compatibility notes

## Alternatives considered
1) Approach A — pros/cons
2) Approach B — pros/cons
3) (Optional) Approach C — pros/cons

## Acceptance criteria (must be testable)
Write as checks:
- [ ] When <condition>, system does <expected>
- [ ] When <invalid>, system returns <error/behavior>
- [ ] No regression in <existing flow>

## Implementation plan (tasks)
Break into small tasks, each should be “done” in one action:
- Task 1: …
- Task 2: …
- Task 3: …

Include:
- code touch points (paths)
- migrations (if any)
- feature flags (if any)

## Testing plan
- Unit tests: what to cover
- Integration/E2E: what flow
- Manual QA steps: quick checklist

## Risks & open questions
- Risks: performance, edge cases, compatibility
- Open questions: things to confirm (keep short)

## Out of scope
Explicitly list what is NOT included.

---

# Output discipline
- Keep the Story doc short: **~1–2 pages max**
- If it grows: split into multiple Stories (link them)

---

# When to split
Split if any of these are true:
- touches > 3 subsystems (e.g., DB + API + UI + auth)
- requires a new domain model
- needs multi-sprint work
- unclear requirements after 2 clarification questions

Create separate story files and link them in “Out of scope” or “Follow-ups”.

---

