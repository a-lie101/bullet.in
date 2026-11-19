# Automated code review

Pull requests are reviewed by a team of Claude reviewers that run on GitHub Actions. Each review starts a fresh Claude Code session, and usage is billed to the Claude subscription behind the `CLAUDE_CODE_OAUTH_TOKEN` secret, not to the API.

## What happens on a pull request

1. A PR is opened, reopened, or marked ready for review. Drafts, PRs from forks, PRs opened by bots, and PRs that only change Markdown or lockfiles are skipped. Pushing new commits doesn't start a review (see below).
2. [`.github/workflows/claude-code-review.yml`](../.github/workflows/claude-code-review.yml) runs `/review-pr`, defined in [`.claude/skills/review-pr/SKILL.md`](../.claude/skills/review-pr/SKILL.md).
3. `/review-pr` starts the reviewers that apply to the changed files, in parallel. Each runs in its own context:

   | Reviewer | Looks for |
   |---|---|
   | [`review-correctness`](../.claude/agents/review-correctness.md) | logic bugs, code that won't compile, async mistakes, client/server contract mismatches |
   | [`review-security`](../.claude/agents/review-security.md) | access control, sessions, secrets, injection, unsafe rendering, risky dependencies and CI changes |
   | [`review-data`](../.claude/agents/review-data.md) | Mongoose updates and queries: validation, races, indexes, schema changes |
   | [`review-frontend`](../.claude/agents/review-frontend.md) | React state and effects, async UI, drag and drop, keyboard access |
   | [`review-tests`](../.claude/agents/review-tests.md) | tests the PR adds or changes that can't fail, check the wrong thing, or are fragile |

   The team is scaled to the PR's size. Changes of 150 lines or fewer get one or two reviewers. Changes over 1,500 lines or 40 files get a review of the server and config code only, and the summary says what was left out; add the `claude-review` label to review the rest.
4. Up to six of the most serious findings (blockers and majors) are checked by [`review-verifier`](../.claude/agents/review-verifier.md), which tries to disprove each one and checks the proposed fix. Only confirmed issues are kept. Minor issues aren't reported.
5. Confirmed issues are posted as inline comments, plus one summary comment from the Claude GitHub App.

**To review new commits, or to get a full review of a large PR, add the `claude-review` label** (or open the PR with it). A labelled review skips the size limits. After a full review, the next one covers only the files changed since then; after a partial review of a large PR, it covers everything. Either way it doesn't repeat issues already raised. The workflow then removes the label, so you can add it again later.

## Run a review locally

The same reviewers run on your machine, under your own Claude login:

```bash
git fetch origin main
gh pr checkout 12
claude -p "/review-pr 12 --full" --allowedTools "Read" "Grep" "Glob" "Bash(gh pr view:*)" "Bash(gh pr diff:*)" "Bash(git diff:*)" "Bash(git rev-parse:*)" "Bash(git log:*)" "Bash(git fetch origin:*)"
```

This prints the review and posts nothing. To post it to the PR as a summary comment, add `--comment` to the prompt and `"Bash(gh pr comment:*)"` to the allowed tools. Running it from a separate terminal keeps the review out of any long chat you have open. If a reviewer can't run a command, the review names it instead of reporting that area as clean.

## Change the reviewers

Edit the files in `.claude/agents/` and `.claude/skills/review-pr/`. On pull requests, the GitHub Action reads `.claude/` from the base branch, so changes to the reviewers take effect once they're merged. The workflow file is different: GitHub runs the version in the PR, so changes to `.github/workflows/claude-code-review.yml` apply to the PR that makes them.

Reviewers use Sonnet and the verifier uses Opus. To use less subscription usage, change `model: opus` to `model: sonnet` in `review-verifier.md`. To review more thoroughly, raise the reviewers to `opus`.

## Limits and costs

- Reviews share your plan's usage limits with claude.ai and Claude Code. On Pro, a full review of a large PR can use a noticeable share of a 5-hour window. Check `/usage` after a few reviews.
- If the limit is reached, the review fails until the window resets. It only spills into paid usage credits if those are turned on in your claude.ai settings.
- GitHub Actions minutes are free for public repositories.
- The token from `claude setup-token` lasts a year and is tied to your account. Generate a new one and update the `CLAUDE_CODE_OAUTH_TOKEN` secret when it expires.
