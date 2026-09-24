# Real identity-only input fixtures

Copied byte-for-byte on 2026-09-23 from:

`flow://rolling/export-fenced-histogram-captures-and-check-serving-5735100a/`

| File | Bytes | Raw SHA256 |
| --- | ---: | --- |
| histogram-mirror-manifest.json | 2404 | `499adbea8e1441ddb07d9918d14220704dcde626a43a8795726a50d4275100d5` |
| original-runtime-metadata-verified.json | 5210 | `a6f3e5d666e8a42aa8cb3bb5abe917116f694d0d69f44bfea11d356be86edf4e` |
| identity-test-inputs-and-results.json | 12706 | `bdcb936a84477d4f28229f3e94f439f257b64f2c193ad495929e85fa879b08ab` |

These are source identities, metadata and an archived identity diagnosis, NOT serving receipts, primary target exports or projection outputs. The tests preserve their raw hashes. The old v2.1 source identity guards are exercised as an identity-only negative, and the v2.3 local mapping/capture-DB/run gate with a distinct projection namespace as an identity-only positive.

Tests construct a **test-local** schema-2/operator-v2 wrapper for linkage checks; this does not issue a real operator attestation. It embeds the unchanged actual backend receipt and uses its canonical sorted-key JSON digest, not a claim about the original separately archived receipt bytes. No real verification file or pin is configured/activated by these fixtures. No scientific or whole-product admission claim follows.

`../str_context_source_map.ts` is a separate **SYNTHETIC ONLY** helper for other generator/API tests. It invents metadata and operator assertions from explicitly supplied test identities and must never be used to attest real data.
