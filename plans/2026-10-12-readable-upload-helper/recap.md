---
status: accepted
date: 2026-10-12
pr: readable upload helper 0.2.2
---

# Recap: Readable upload helper

Claude's plugin directory held 0.2.0 and 0.2.1 for manual review because the
bundled helper inlined two base64 WebAssembly zstd decoders from geotiff, which
its security scan cannot read. Version 0.2.2 rebuilds the helper from Carnation
`2ead5ad` (app PR #1573), which leaves geotiff's pixel decoders out of the
headless build. The helper only reads TIFF structure and uploads original bytes,
so upload behavior is unchanged. The bundle drops from 983 KB to 641 KB, and
lerc, pako and zstddec leave the third-party notices.

CI now rejects a helper bundle containing `WebAssembly`. Manifests, marketplace
metadata, validation and submission paperwork agree on 0.2.2. The listing icon
must be uploaded on the directory listing, because the directory cannot display
an icon given as a path inside the plugin.

Package/version/helper hash checks, strict Claude plugin and marketplace
validation, and Node 24 helper execution passed. In the app PR, `inspect` output
from the old and new helpers was identical on uncompressed, LZW, deflate and
PackBits OME-TIFFs.

Follow-up: after app PR #1573 merges, confirm the helper rebuilt from the merged
main commit matches this bundle's SHA-256 and record that commit. Directory
review and publishing remain manual.
