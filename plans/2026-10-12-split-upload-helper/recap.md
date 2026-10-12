---
status: accepted
date: 2026-10-12
pr: split upload helper 0.2.3
---

# Recap: Upload helper under the directory file limit

Plugin 0.2.2 passed Claude's plugin directory security scan, then was held by
directory policy for review. The directory holds any plugin file other than an
image or font of 256 KiB or more, and the bundled helper was a single 641 KB
`carnation-upload.mjs`.

Version 0.2.3 ships the helper from Carnation main `03b6b9d` (app PR #1577) as
`carnation-upload.mjs` plus four dependency chunks in `scripts/lib/`. The
largest file is `lib/zod.mjs` at 190,612 bytes. Upload behavior and the
third-party notices are unchanged.

`build.json` now records a SHA-256 for every helper file. CI requires the
shipped files to match that list exactly, rejects WebAssembly in any of them,
and rejects any non-image file in the plugin of 256 KiB or more.

Validation: the package checks from `validate.yml` and `claude plugin validate`
passed for the plugin and the marketplace, and the helper ran from the plugin
path with no `node_modules`. In the app PR, `inspect` output from the 0.2.2 and
0.2.3 helpers was identical on uncompressed, LZW, deflate and PackBits
OME-TIFF plates.

The helper rebuilt from merged main `03b6b9d` under Node 24.20 matches every
recorded SHA-256. Directory review and publishing remain manual.
