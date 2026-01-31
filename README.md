# SELF HEAL

## What it does
SelfHeal is an agentic CI fix app that pulls a failing GitHub Actions run, drafts a patch, verifies it, and opens a PR. It also surfaces the patch, verification output, and a debug bundle for traceability.

## How to run
```bash
npm install
npm run dev
```
Open http://localhost:3000

Notes:
- Create `.env.local` in the repo root (do **not** commit it).
- At minimum set `OPENAI_API_KEY`. Optional: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BASE`, `VERIFY_CMD`.
- Restart the dev server after changing `.env.local`.

## Demo steps
1. On the home page, enter `owner`, `repo`, `base` (and token if needed).
2. Click **View Runs** and pick a failed run.
3. On the run page, click **Heal**.
4. Watch the Job timeline update; the **Latest** line updates as each stage completes.
5. Review **PR Summary**, **Verification**, and **Patch Preview** panels.
6. Open the PR link once it appears (toast confirms creation).
7. Optional: Click **Download debug bundle** for the exact context used.
8. Optional: Use **Clear history** to collapse the timeline for a clean screenshot.
