# Complete Exercise Catalog Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import all 1,324 dataset exercises and their local images/GIFs into EVRY while preserving existing workout, routine, adaptive, and cycle behavior.

**Architecture:** The backend owns the catalog, database metadata, and static media. A deterministic mapper converts the source taxonomy into EVRY enums while preserving raw source fields and multilingual JSON. The frontend consumes enriched exercise responses and renders local media through URLs derived from the configured API origin.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL, Express static middleware, Jest, Next.js 15, React 19, TypeScript, Tailwind CSS.

## Global Constraints

- Keep current `Exercise` fields and IDs usable by workouts, routines, stats, and adaptive recommendations.
- The imported source dataset is MIT for data/instructions; media remains © Gym visual and must retain the attribution and 180×180 resolution requirement.
- Do not infer `pregnancy_safe` or medical-safety tags from generic exercise metadata.
- Preserve cycle behavior as opt-in via `trackCycle`; catalog behavior is gender-neutral.
- Keep user-created exercises separate from source imports (`isCustom=true`, `sourceId=null`).
- Do not commit `.env` values or generated `node_modules`, `.next`, or `dist` output.

---

### Task 1: Vendor and validate the source catalog

**Files:**
- Create: `EVRY-Backend/prisma/seed-data/exercises.json`
- Create: `EVRY-Backend/assets/exercises/images/*.jpg` (1,324 files)
- Create: `EVRY-Backend/assets/exercises/videos/*.gif` (1,324 files)
- Create: `EVRY-Backend/LICENSE-DATASET`
- Create: `EVRY-Backend/NOTICE-MEDIA.md`
- Modify: `EVRY-Backend/.gitignore`
- Modify: `EVRY-Backend/README.md`

**Interfaces:**
- Produces the vendored source consumed by the importer: JSON records keyed by four-digit `id`, with `image` and `gif_url` paths relative to the asset roots.

- [ ] **Step 1: Copy the source files from the pinned dataset checkout.**

  Copy `data/exercises.json`, `images/`, and `videos/` from the checked-out commit `7455efae41b330c265e7cd4b78dfa848e7ce5ebd` into the paths above. Copy the dataset `LICENSE` and `NOTICE.md` contents without changing the required attribution.

- [ ] **Step 2: Add an asset integrity checker.**

  Create `EVRY-Backend/scripts/verify-exercise-assets.ts` that loads the JSON, asserts exactly 1,324 records, checks unique four-digit IDs, and verifies every referenced JPG/GIF exists under `assets/exercises`. Exit non-zero with the missing paths when validation fails.

- [ ] **Step 3: Keep generated runtime output out of Git.**

  Add `assets/exercises` only as intentional source content; keep `dist`, `coverage`, and local database files ignored. Update README setup instructions with `npm run exercises:verify` and the media attribution notice.

- [ ] **Step 4: Run validation and commit.**

  Run: `npm run exercises:verify`

  Expected: `1324 records; 1324 images; 1324 gifs; 0 missing`.

  Commit in `EVRY-Backend`: `git add prisma/seed-data assets/exercises scripts/verify-exercise-assets.ts LICENSE-DATASET NOTICE-MEDIA.md .gitignore README.md && git commit -m "feat: vendor complete exercise catalog media"`.

### Task 2: Extend Prisma without breaking legacy exercises

**Files:**
- Modify: `EVRY-Backend/prisma/schema.prisma` in `model Exercise`
- Create: `EVRY-Backend/prisma/migrations/20260809120000_enrich_exercises/migration.sql`
- Modify: `EVRY-Backend/prisma/seed.ts`
- Modify: `EVRY-Backend/package.json`

**Interfaces:**
- Produces Prisma fields `sourceId`, `category`, `bodyPart`, `target`, `secondaryMuscles`, `equipmentLabel`, `instructions`, `instructionSteps`, `mediaId`, `imagePath`, `gifPath`, and `attribution`.
- Keeps `sourceId` nullable and unique so existing curated exercises and user-created exercises remain valid.

- [ ] **Step 1: Write the migration assertions first.**

  Add a Jest/Node schema check in `EVRY-Backend/scripts/check-exercise-schema.ts` that reads the generated Prisma client after migration and asserts the enriched fields are present in the expected create/update payload shape.

- [ ] **Step 2: Add nullable metadata fields and indexes.**

  Add the fields listed above, with `String[] @default([])` for `secondaryMuscles`, `Json?` for the two instruction maps, and `String?` for optional media/source fields. Add `@unique` to nullable `sourceId` and indexes for `category`, `bodyPart`, and `equipmentLabel`.

- [ ] **Step 3: Write the SQL migration.**

  Use `ALTER TABLE "Exercise" ADD COLUMN` statements with nullable defaults, then create the nullable unique/index constraints. Do not alter or delete existing exercise rows or foreign keys.

- [ ] **Step 4: Make seed commands explicit.**

  Add scripts:

  ```json
  "exercises:verify": "ts-node scripts/verify-exercise-assets.ts",
  "exercises:import": "ts-node prisma/import-exercises.ts"
  ```

- [ ] **Step 5: Generate the client and commit.**

  Run: `npx prisma generate`

  Run: `npm run build`

  Commit in `EVRY-Backend`: `git add prisma/schema.prisma prisma/migrations package.json scripts/check-exercise-schema.ts && git commit -m "feat: enrich exercise schema for source metadata"`.

### Task 3: Implement deterministic source mapping and idempotent import

**Files:**
- Create: `EVRY-Backend/src/modules/exercises/exercise-catalog.ts`
- Create: `EVRY-Backend/src/modules/exercises/exercise-catalog.spec.ts`
- Create: `EVRY-Backend/prisma/import-exercises.ts`
- Modify: `EVRY-Backend/prisma/seed.ts`

**Interfaces:**
- `mapBodyPartToMuscleGroup(bodyPart: string, target: string): MuscleGroup`
- `mapEquipment(equipment: string): Equipment`
- `isCompoundExercise(name: string, target: string, bodyPart: string): boolean`
- `deriveCatalogTags(equipment: string, name: string, instructions: string): string[]`
- `toExerciseCreateInput(record: DatasetExercise): Prisma.ExerciseCreateInput`

- [ ] **Step 1: Write mapping tests before implementation.**

  Cover `body weight -> BODYWEIGHT`, `smith machine -> MACHINE`, `resistance band -> BAND`, `upper arms + triceps -> TRICEPS`, `upper legs + glutes -> GLUTES`, `waist -> CORE`, and that `deriveCatalogTags` adds only `equipment_free` for bodyweight plus `accessibility_seated` for explicit seated/chair names.

- [ ] **Step 2: Implement source normalization.**

  Normalize casing/whitespace, map unsupported equipment to `OTHER`, preserve the original equipment in `equipmentLabel`, parse instruction maps into JSON-compatible objects, and derive `isCompound` from explicit movement/name signals without adding safety claims.

- [ ] **Step 3: Implement idempotent upserts.**

  `prisma/import-exercises.ts` must load the vendored JSON, call `toExerciseCreateInput`, then `upsert({ where: { sourceId }, create, update })`. Updates must refresh source metadata/media while preserving `ownerId`, `isCustom`, and any user-created fields. Print inserted/updated totals and fail on duplicate/missing source IDs.

- [ ] **Step 4: Keep the legacy seed useful.**

  Replace the hard-coded seed loop with `await importSourceExercises(prisma)` followed by the current curated seed upserts, so a clean install gets both the complete source catalog and EVRY-specific legacy exercises without deleting rows referenced by existing workouts.

- [ ] **Step 5: Run unit/import checks and commit.**

  Run: `npm test -- --runInBand src/modules/exercises/exercise-catalog.spec.ts`

  Run: `npm run exercises:import` against a test database or the configured local database.

  Expected: 1,324 source rows, repeat import produces 0 duplicates, mapping tests pass.

  Commit: `git add src/modules/exercises/exercise-catalog.ts src/modules/exercises/exercise-catalog.spec.ts prisma/import-exercises.ts prisma/seed.ts && git commit -m "feat: import complete exercise dataset idempotently"`.

### Task 4: Serve enriched catalog data and local media

**Files:**
- Modify: `EVRY-Backend/src/main.ts`
- Modify: `EVRY-Backend/src/modules/exercises/exercises.controller.ts`
- Modify: `EVRY-Backend/src/modules/exercises/exercises.service.ts`
- Modify: `EVRY-Backend/src/modules/exercises/dto/create-exercise.dto.ts`
- Create: `EVRY-Backend/src/modules/exercises/dto/list-exercises.dto.ts`
- Create: `EVRY-Backend/src/modules/exercises/exercises.service.spec.ts`
- Modify: `EVRY-Backend/.env.example`
- Modify: `EVRY-Backend/README.md`

**Interfaces:**
- `GET /api/exercises?muscleGroup=&q=&tag=&equipment=&category=` returns enriched exercises with `imageUrl`/`gifUrl`.
- `GET /api/exercises/:id` returns the same enriched shape for detail screens.
- Static media is available at `/media/exercises/images/:file` and `/media/exercises/videos/:file`.

- [ ] **Step 1: Write service serialization tests.**

  Assert source exercises receive absolute URLs from `MEDIA_BASE_URL`, custom exercises receive `null` URLs, and legacy filters still apply.

- [ ] **Step 2: Mount safe static directories.**

  In `main.ts`, mount `express.static(join(process.cwd(), 'assets/exercises'))` at `/media/exercises` with immutable cache headers. Do not expose the whole filesystem or `.env` files.

- [ ] **Step 3: Add query DTO/filtering.**

  Validate `equipment` against the existing enum, accept `category` as a bounded string, retain case-insensitive `q`, and compose filters so owner visibility remains `ownerId IS NULL OR ownerId = currentUser`.

- [ ] **Step 4: Serialize metadata consistently.**

  Add a private serializer that returns existing fields plus raw metadata, `instructions`, `instructionSteps`, and `imageUrl`/`gifUrl`. For missing language text, the frontend will choose English; the backend must not fabricate translations.

- [ ] **Step 5: Verify and commit.**

  Run: `npm test -- --runInBand src/modules/exercises/exercises.service.spec.ts`

  Run: `npm run build`

  Commit: `git add src/main.ts src/modules/exercises .env.example README.md && git commit -m "feat: expose enriched exercises and local media"`.

### Task 5: Add typed media/instruction support to the frontend

**Files:**
- Modify: `EVRY/lib/types.ts`
- Modify: `EVRY/lib/api.ts`
- Create: `EVRY/lib/exercise-media.ts`
- Create: `EVRY/lib/exercise-media.spec.ts`

**Interfaces:**
- `Ejercicio` gains optional source metadata, localized instructions, `imageUrl`, and `gifUrl` while remaining compatible with custom exercise responses.
- `getExerciseInstruction(exercise, locale = 'es'): string[]` returns localized steps with `es -> en -> []` fallback.
- `getExerciseMediaUrl(url: string | null): string | null` resolves backend-relative media paths against `NEXT_PUBLIC_API_BASE_URL`.

- [ ] **Step 1: Write utility tests.**

  Cover Spanish preference, English fallback, empty instructions, absolute URLs, and `/media/...` relative URLs.

- [ ] **Step 2: Implement types and pure utilities.**

  Keep all dataset-specific types in `lib/exercise-media.ts` or adjacent exported interfaces; do not spread `any` through page components.

- [ ] **Step 3: Run frontend type-check and commit.**

  Run: `npm run type-check`

  Commit in `EVRY`: `git add lib/types.ts lib/api.ts lib/exercise-media.ts lib/exercise-media.spec.ts && git commit -m "feat: add typed exercise media support"`.

### Task 6: Update exercise discovery and detail UI

**Files:**
- Modify: `EVRY/components/ExercisePicker.tsx`
- Create: `EVRY/components/ExerciseMedia.tsx`
- Modify: `EVRY/app/(app)/workout/[id]/page.tsx`
- Modify: `EVRY/app/(app)/workout/new/page.tsx`
- Modify: `EVRY/app/(app)/workout/routines/new/page.tsx`
- Modify: `EVRY/app/(app)/workout/routines/[id]/page.tsx`
- Modify: `EVRY/app/globals.css`

**Interfaces:**
- `ExerciseMedia` accepts `{ imageUrl, gifUrl, name, variant?: 'thumbnail'|'detail' }` and renders GIF first with image fallback and accessible alt text.

- [ ] **Step 1: Add the media component with an explicit fallback.**

  Render a fixed-ratio card; on GIF error, switch to the JPG; on both errors, render the existing fitness icon and the exercise name. Never show a broken external image URL.

- [ ] **Step 2: Replace picker icon-only rows.**

  Add thumbnail, source category/equipment labels, and preserve current search/group/tag behavior. Debounce search requests to avoid one request per keystroke.

- [ ] **Step 3: Add detail instructions.**

  Show the local GIF, Spanish steps, and attribution for source exercises. Custom/legacy exercises keep the current no-media layout.

- [ ] **Step 4: Wire selected exercise previews into new workout/routine flows.**

  Reuse `ExerciseMedia`; do not alter workout-set payloads or cycle/readiness logic.

- [ ] **Step 5: Run checks and commit.**

  Run: `npm run type-check`

  Run: `npm run build`

  Commit: `git add components app lib && git commit -m "feat: show exercise media and instructions"`.

### Task 7: Documentation, attribution, and end-to-end verification

**Files:**
- Modify: `EVRY/README.md`
- Modify: `EVRY-Backend/README.md`
- Modify: `EVRY-Backend/NOTICE-MEDIA.md` if the final served path needs an EVRY-specific attribution section
- Create: `EVRY-Backend/scripts/verify-exercise-import.ts`

- [ ] **Step 1: Add a post-import invariant check.**

  Verify the database contains exactly 1,324 rows with non-null `sourceId`, unique source IDs, and non-null `imagePath`/`gifPath`; report any orphaned asset or database path.

- [ ] **Step 2: Document local setup.**

  Document the migration, `npm run exercises:verify`, `npm run exercises:import`, `MEDIA_BASE_URL`, static media routes, and the distinction between MIT data and Gym visual media terms.

- [ ] **Step 3: Run the complete verification matrix.**

  ```powershell
  cd EVRY-Backend
  npm run exercises:verify
  npm run build
  npm test -- --runInBand
  cd ..\EVRY
  npm run type-check
  npm run build
  ```

  Expected: all commands exit 0; the invariant check reports 1,324 imported source exercises; existing auth, workout, routine, cycle, and readiness routes still compile.

- [ ] **Step 4: Review repository status and commit documentation.**

  Confirm `.env` remains untracked/ignored, no generated output is staged, and both repositories have one clear commit per task. Commit: `git add README.md scripts/verify-exercise-import.ts && git commit -m "docs: document exercise catalog operations"`.

- [ ] **Step 5: Show progress and final handoff.**

  Report commit hashes, verification results, exact local run commands, and the legal note that locally storing media does not transfer Gym visual ownership.
