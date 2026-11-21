# ROYAL PIRATE — GitHub Pages ↔ ChatGPT Sites (WORK0 / #104)

Status: **NOT LINKED / NOT DEPLOYED FROM THIS PR**. This is an operational constraint, not a release claim.
Last verified documentation review: 21 Nov 2026. Human art approval: **0/8**.

## Canonical source

- Repository: `drozz2025/royal-pirate`, development base `work6/web-3d-preview`.
- Current unmerged visual candidate: [PR #696](https://github.com/drozz2025/royal-pirate/pull/696).
- Public GitHub Pages address: https://drozz2025.github.io/royal-pirate/
- ChatGPT Sites address tested by the repository's read-only auditor: https://royal-pirate.ricardomalheiro.chatgpt.site/ (owner/editor should still confirm it in Sites → Open site).
- [GitHub Actions run 44833888295](https://github.com/drozz2025/royal-pirate/actions/runs/44833888295), 20 Nov 2026 at 23:13 UTC, fetched **HTTP 200 from both public addresses**, 3 JS/CSS assets on each; the Pages version was **v0.1.117**, Sites version was **unrecognized (v?)**, result **NO_VALIDATED_RELEASE**. This does **not** verify matching code or an automatic connection.

## Verified official Sites publishing method

OpenAI's [Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites) documents:
1. Open the Site from the owner's **Sites** sidebar or choose **Edit site** while signed in as owner/editor.
2. Describe the change, review the private preview, and **save a version** before release.
3. Explicitly **publish/deploy** to update the *existing* Site URL, then verify the live Site.
4. Publication needs Site owner/editor permission (and workspace publishing permission when applicable).
5. The article does not document a public GitHub Actions → Sites deployment API, verified GitHub-source configuration, or a GitHub Pages mirroring setting. Do not assume such an integration exists.

The WORK0 GitHub connector can read/write the repo but **cannot authenticate as the Site owner or invoke a Sites publishing action** in this run. No credentials, hidden endpoints, scraping mutations, domain redirects or newly invented APIs are allowed.

## Non-destructive fallback when art+QA pass

1. Gate a single reviewed GitHub commit through `npm ci`, `npm test`, `npm run build`, native 384×512 comparison, 390×844 and 320×568 touch/shot checks, plus human checks of approved 01–08.
2. Only WORK0 merges and confirms the GitHub Pages production workflow's **deploy + HTTP/version audit**. Record exact commit SHA and version.
3. In the existing ChatGPT Site owner's edit session, use that exact source revision, review the preview, save version and explicitly deploy the **same existing Site**. Do **not** modify Site URL or create a second independently maintained codebase.
4. Validate both public addresses by real HTTP and browser navigation, compare version, eight route screenshots and touch behavior; record differences openly. If the authenticated owner/editor editor or source export is unavailable, stop at step 2 and leave Sites unchanged.

There is **no automatic parity guarantee** until an officially supported, authenticated deployment mechanism is independently verified and tested.

## Red lines

No paid service, domain change, fake Diamonds, fake players, Unity/multiplayer features, unapproved redesign of Porto/dock, credential disclosure, or claims of artistic approval based solely on pixel MAE/green CI.
