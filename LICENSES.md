# Third-party licenses

This project's own code is MIT licensed (see `package.json`). It uses only
permissive-licensed dependencies — no GPL, AGPL, LGPL, MPL, SSPL, or
non-commercial/personal-use-only assets. Versions are as pinned in
`package-lock.json` at time of writing; run `npx license-checker` for a live,
full transitive report.

## Runtime dependencies (shipped to the browser)

| Name | Version | Purpose | License |
|---|---|---|---|
| react | 19.2.8 | UI framework | MIT |
| react-dom | 19.2.8 | React DOM renderer | MIT |
| tesseract.js | 7.0.0 | In-browser OCR engine (receipt scanning) | Apache-2.0 |
| tesseract.js-core | 7.0.0 | WASM OCR core used by tesseract.js | Apache-2.0 |
| idb-keyval | 6.3.0 | Transitive dep of tesseract.js (IndexedDB cache) | Apache-2.0 |
| bmp-js | 0.1.0 | Transitive dep of tesseract.js (image decoding) | MIT |
| is-url | 1.2.4 | Transitive dep of tesseract.js | MIT |
| node-fetch | 2.7.0 | Transitive dep of tesseract.js | MIT |
| regenerator-runtime | 0.13.11 | Transitive dep (async/generator support) | MIT |
| scheduler | 0.27.0 | Transitive dep of react-dom | MIT |
| wasm-feature-detect | 1.9.0 | Transitive dep of tesseract.js | Apache-2.0 |
| whatwg-url / tr46 / webidl-conversions | 5.0.0 / 0.0.3 / 3.0.1 | Transitive deps of node-fetch | MIT / MIT / BSD-2-Clause |
| zlibjs | 0.3.1 | Transitive dep of tesseract.js (gzip decode for language data) | MIT |
| opencollective-postinstall | 2.0.3 | Transitive dep (funding notice, no functional code used) | MIT |

## Self-hosted OCR assets (`public/tesseract/`)

Bundled locally so receipt scanning needs no external API and no CDN call at
runtime — see the README's "Environment variables" section.

| Asset | Source | License |
|---|---|---|
| `worker.min.js` | `tesseract.js` npm package (`dist/worker.min.js`) | Apache-2.0 |
| `tesseract-core-lstm.wasm(.js)` | `tesseract.js-core` npm package | Apache-2.0 |
| `eng.traineddata.gz` | English LSTM trained data, sourced via the `@tesseract.js-data` distribution of Google's [tesseract-ocr/tessdata](https://github.com/tesseract-ocr/tessdata) | Apache-2.0 |

## Build / dev tooling (not shipped to the browser)

| Name | Version | Purpose | License |
|---|---|---|---|
| vite | 8.2.2 | Dev server & production bundler | MIT |
| @vitejs/plugin-react | 6.1.1 | React fast refresh for Vite | MIT |
| tailwindcss | 3.4.19 | Utility CSS framework | MIT |
| postcss | 8.5.26 | CSS transform pipeline used by Tailwind | MIT |
| autoprefixer | 10.5.4 | PostCSS vendor-prefixing | MIT |
| oxlint | 1.80.0 | Linter | MIT |
| playwright | 1.62.1 | Used only for manual/local end-to-end testing during development, not a runtime dependency | Apache-2.0 |

**Note:** an earlier draft used Tailwind CSS v4, whose `@tailwindcss/vite`
plugin pulls in `lightningcss`, which is MPL-2.0. To keep the dependency
tree fully permissive as required, this project uses Tailwind v3 with the
standard PostCSS pipeline instead, which has no MPL dependency.

## Icons, fonts, images

No icon library or icon font is used. All icons in the UI are hand-written
inline SVGs. The one emoji (📷, on the "Scan receipt" button) is rendered via
the system's built-in emoji font, not a bundled asset. No custom web font is
loaded — text uses the system font stack.

The Pennywise owl mark (`src/assets/logo.png`, reused as `public/favicon.png`)
is the app's own brand asset, supplied by the project author for this app —
not a stock icon or third-party library asset. It's used for the header
logo, the first-launch splash screen, and the browser favicon.
