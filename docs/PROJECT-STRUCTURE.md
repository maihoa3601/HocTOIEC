# Project structure and build

The project uses browser ES modules and a Cloudflare Worker. The directory refactor separates source, canonical content, tooling, tests and disposable build output without changing the product routes.

## Source ownership

| Location | Edit here for |
| --- | --- |
| src/client | Browser pages, learning logic, planner and CSS |
| src/server | Account APIs, server grading and content review authorization |
| public | Entry HTML, favicon and future static media |
| data | Drive catalog, reviewed bank, authored content inputs and audit |
| drizzle | Append-only schema migrations |
| scripts | Build, preview, watch and content generation tools |
| scripts/lib | Build metadata and localhost SQLite/D1 adapter |
| tests | Source/data unit checks and generated Worker integration checks |

The runtime content-review tables may override canonical questions at request time. A normal application build does not regenerate the canonical bank or alter live revisions.

## Build contract

`npm run build` reads src/client, src/server, public, data and .openai/hosting.json. It resolves and verifies the output path, rejects a symlink output, and replaces only the checkout's dist directory. Sources are collected before output cleanup. Generated files are ignored by Git.

Browser files are copied into dist/client with their current URL names. The generated client bank has no answer, accept or explanation fields. Full bank content is embedded only in the server bundle, which serves the current bank and grades submissions. The Worker serves the client asset map; its bundle and private source/data paths have no public file route.

Pre-cut exam manifests, images and audio under data/exam-media are copied byte-for-byte to dist/client/exam-media. Sites serves these static files directly. The production gateway may return a complete audio clip (HTTP 200) rather than a partial range response. Binary media is not embedded in the Worker bundle. Other private data files remain outside client assets.

The exam audio player buffers the selected clip into a browser Blob URL before seeking. It waits for metadata, preserves playback speed and position, and releases URLs when changing groups or pages. Result audio is buffered on playback or a cue click. This supports the first question-cue click even when the gateway does not support HTTP ranges, without preloading all clips in an exam.

SHA-256 bank/question metadata is computed from parsed canonical content with the existing algorithm. Directory locations do not enter those hashes. The refactor preserves catalog bytes, bank version, question IDs, Sites identity, D1 migrations and browser storage keys.

`npm test` runs all *.test.mjs files through the Node test runner. Most tests import source directly and use canonical data. The build integration test creates a clean bundle, checks reproducibility and stale-file cleanup, resolves browser assets/imports, verifies server grading and checks private files cannot be requested publicly.

## Local development

`npm run dev` builds and runs the backend preview, watches source/data/public/migrations/tooling, and rebuilds/restarts on changes. Reload the browser when rebuilding finishes. `npm run preview` runs the most recent build without watching. Both bind only to 127.0.0.1:4173 and retain the same ignored preview database.

The local sign-in identity simulation belongs to scripts/preview.mjs; it is never included in the production bundle. .env.example documents runtime variable names. Production values remain in Sites settings.

## Publishing

Push the exact source, build, then package dist with the Sites source workflow. Keep .openai/hosting.json and drizzle migrations in the source checkout. The Sites helper copies migration metadata into the deployment archive. Rebuilding from a fresh checkout requires Node.js 24+ and no npm dependency installation.
