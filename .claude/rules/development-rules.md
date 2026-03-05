# Development Rules

**Source of truth:** All project structure, naming, conventions, UI/styling, and workflow are defined in **`CLAUDE.md`** (repository root). This file adds only agent and process rules that apply on top of it.

---

## Principles

- **YAGNI** — You Aren't Gonna Need It  
- **KISS** — Keep It Simple, Stupid  
- **DRY** — Don't Repeat Yourself  

---

## Before You Start

- **Read `CLAUDE.md`** for commands, architecture, conventions, naming, and workflow.
- **Read `./docs`** for codebase structure and code standards; follow them during implementation.
- **Analyze the skills catalog** and activate the skills needed for the task.

---

## Implementation

- Implement **real code**; do not simulate or mock.
- **Update existing files** when extending behavior; do not add new “enhanced” duplicates.
- Follow established architectural patterns and handle edge cases and errors.
- Use try/catch and security best practices where appropriate.
- After implementations, use the **code-reviewer** agent to review code.

---

## Code Quality

- No syntax errors; code must compile.
- Prioritize functionality and readability over strict formatting.
- Follow code standards in `./docs`; use reasonable quality bar for productivity.

---

## Commits & Push

- **Lint** before commit; **tests** before push (see `CLAUDE.md` §5). Do not ignore failing tests to pass CI.
- Use **conventional commit** format; keep messages clean and professional (no AI references).
- **Never** commit or push secrets (`.env`, API keys, DB credentials, etc.).

---

## When to Use Skills

- **docs-seeker** (Context7): exploring latest library/framework docs.
- **sequential-thinking**, **debug**: multi-step reasoning, debugging, code analysis.
- **ai-multimodal**: describing or generating images, video, documents.
- **gh**: GitHub operations from the shell.
- **psql**: querying Postgres for debugging (when applicable).

---

## Naming (aligned with CLAUDE.md)

Where this repo’s conventions matter and are not just “use kebab-case everywhere”:

- **Avoid redundant suffixes** when the folder already implies the type:
  - `lib/services/category.ts` ✅ (not `category-service.ts`)
  - `lib/hooks/useToast.ts` ✅ (not `use-toast-hook.ts`)
  - `lib/email/templates/digest.tsx` ✅ (not `digest-template.tsx`)

For **all other** naming (components, hooks, utils, routes, symbols), follow **`CLAUDE.md` §4 Conventions & Naming**.
