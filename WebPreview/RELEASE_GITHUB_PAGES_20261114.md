# ROYAL PIRATE — GitHub Pages release gate

Target: https://drozz2025.github.io/royal-pirate/
Branch: `work6/web-3d-preview`
Version intended: `v0.1.1`

Repository visibility confirmed public via GitHub metadata on 14 November 2026. This commit triggers `.github/workflows/royal-pirate-pages.yml` on push. The workflow must run `npm ci`, `npm test`, `npm run build -- --base=/royal-pirate/`, validate the version and self-hosted font paths, and deploy only if all checks pass.

The `github-pages` environment must have the Pages source set to GitHub Actions. Deployment or URL success must NOT be assumed until a completed GitHub Actions deployment and public HTTP check are verified. Keep the current ChatGPT Sites demo and `main` unchanged.
