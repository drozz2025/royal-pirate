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

## WORK0 audit — 21 Nov 2026, 15h Lisboa (read only; no Sites deploy)

- **Integration candidate only:** [#696](https://github.com/drozz2025/royal-pirate/pull/696) @ [cec8b3f](https://github.com/drozz2025/royal-pirate/commit/cec8b3f0b300bdf0cf503ddc9c6bc8e9cd3d854a) carries source-only visual transfers from WORK4 #760 / WORK8 #761 plus native same-frame ROI and touch tests. This is **not** a Pages or Sites deployment. All eight art approvals remain `false`.
- **Official supported local-source linking (important nuance):** [Manage a site](https://learn.chatgpt.com/docs/sites/managing-a-site) states that a compatible **local source project** stores its authorized hosting identity in `.openai/hosting.json` and, once provisioned, saved versions can be associated with the source Git commit. This supports an authorized local project workflow, **not** evidence of a public GitHub Actions → existing Sites automatic deploy API.
- No `.openai/` directory or hosting identity was found on the integration branch. We cannot confirm whether the existing [Royal Pirate Site](https://royal-pirate.ricardomalheiro.chatgpt.site/) is or can be associated with this specific source revision without the owner/editor Sites session and its existing project ID. **Do not add a `project_id:null` manifest** to the repository or provision a second Site in place of the existing address.
- Attempt to inspect the owner browser context failed with *Browser access requires the originating browser context*; there is no authenticated Sites publishing action available in this run. No token or credentials were requested, exposed or stored. Only authorized **save version → review → deploy existing Site** is documented, and no deploy was attempted.
- **Safe parity method after 8/8 and mobile QA:** get the existing Site's project ID and permissions in owner/editor Work/Codex; verify the exact canonical Git SHA and build support; save review candidate; publish explicitly to the same hostname; then test Pages and Sites HTTP/version/asset hashes and all eight routes. A read-only audit script already exists in `WebPreview/scripts/audit-sites-parity.mjs`. HTTP 200 without matching assets is not parity. Alternative: keep the published Pages URL as canonical and leave Sites unchanged until editing access exists.
