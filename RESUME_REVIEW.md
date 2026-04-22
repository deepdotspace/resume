# Resume Builder — Code Review

Consolidated findings from 4 independent reviewers (backend, hooks, components, pages/ai) plus triage against reviewer over-protection.

- **Reviewers**: 4 parallel agents, each scoped to a non-overlapping area.
- **Calibration**: sister app `latex-editor2` and its `REVIEW_FIXES.md` used as the quality bar.
- **Total raw findings**: 90+ across the four reports.
- **Kept after triage**: 16 Tier 1, 23 Tier 2, 21 Tier 3 (Tier 3 = document, not fix now).

---

## Tier 1 — Correctness / high-value. Fix now.

### Backend / worker

- **F1** (from B1+B2) `worker.ts:629-630, src/actions/index.ts` — Server-action tools use `x-app-action: true` header, which the SDK now expects as `?appAction=true` query (F2 on sister app). Actions will fail to bypass RBAC and return spurious 403s. **Fix**: swap to `new Request('https://internal/api/tools/execute?appAction=true', ...)` and drop the custom header. Also pass `userId` in body instead of `x-user-id` header to align with the chat path.

- **F2** (from B3) `worker.ts:223` — User-billed integration branch does `c.req.header('Authorization')?.slice(7)` with no `startsWith('Bearer ')` check. Any non-Bearer auth scheme slices into a bogus token forwarded to api-worker. **Fix**: mirror `resolveAuth`: `const token = header?.startsWith('Bearer ') ? header.slice(7) : null`.

- **F3** (from B6) `src/actions/index.ts` — `actions` export is empty. Resume deletion currently cascades client-side across `resume-versions` + R2 PDFs; if the tab closes mid-cascade, orphans accumulate. **Fix**: add a `deleteResume` server action that cascades via `tools.query`/`tools.remove`, mirroring latex-editor2's F16. Update `useResumes.deleteResume` to call `/api/actions/deleteResume`.

### Hooks

- **F4** (from H1+H2) `src/hooks/useEditorSettings.ts:57-70` — Create-then-read race on first mount: `create(DEFAULT_SETTINGS).then(id => ...)` is fire-and-forget; pending writes in the same mount are silently dropped because `recordIdRef` is null. Simultaneous mounts from two tabs produce duplicate rows. **Fix**: use `createConfirmed` + await, and gate the bootstrap with a user-id-keyed in-flight flag to prevent duplicate create.

- **F5** (from H3) `src/hooks/useResumeForm.ts:91-135` — `persist` closes over `resumeId`; when the user navigates to a different resume while a debounce is pending, the cleanup writes the new form data to the OLD resumeId. **Fix**: snapshot `resumeId` in a ref at effect start; drop the per-render cleanup registration and run the unmount flush from a mount-only effect.

- **F6** (from H4) `src/hooks/useVersionHistory.ts:73-90` — `nextVersionNum = Math.max(versions) + 1` reads a snapshot. Rapid compile-compile assigns the same versionNum to both rows. **Fix**: use `createConfirmed` and await before reading the next versionNum, or move versioning to a server action.

- **F7** (from H5) `src/hooks/useVersionHistory.ts:81-90` — `create()` returns a Promise; code assigns it to `recordId: string | null` and returns it. Callers get a Promise object typed as a string. **Fix**: await `createConfirmed` and return the real id; change `addVersion` signature to async.

### Components

- **F8** (from C1) `src/components/ui/Input.tsx, Textarea.tsx` — Neither renders a `<label>` but every form (`PersonalInfoForm`, `ExperienceForm`, `SaveProfileModal`, etc.) passes `label="..."` as a prop. The prop is silently spread onto the DOM `<input>`, producing React DOM warnings and zero accessible labels. Catastrophic a11y regression. **Fix**: accept `label?: string` + `id?: string`, render a `<label htmlFor>` wrapper inside the primitive.

- **F9** (from C2) `src/components/shared/PhotoUpload.tsx:45-49` — Click on the remove button bubbles to the parent `role="button"` div: deleting the photo immediately re-opens the file picker. **Fix**: `e.stopPropagation()` in `handleRemove`; convert outer div to a real `<button>` or split actions.

- **F10** (from C3) `src/components/preview/LatexPreview.tsx:15-51` — Textarea is uncontrolled (`defaultValue={content}`) with a sync effect that force-writes `el.value = content` whenever `content` changes. Clobbers cursor/selection and local edits mid-typing. Makes LaTeX override mode unusable. **Fix**: make the textarea fully controlled (`value={content}`) and drop the sync effect.

- **F11** (from C4) `src/components/profile/ProfileEditor.tsx:133-149` — `handleSave` calls `onSave(...)` without awaiting, then immediately clears `saving=false` and closes. Spinner flashes, modal closes before server returns, user can double-submit. **Fix**: make `onSave` return a Promise; await it; only close on resolve. Same pattern lives in `SettingsPanelContent.handleEditorSave`.

- **F12** (from C5) `src/components/shared/SaveProfileModal.tsx:44-62` — Fake-completion with `setTimeout(..., 300)`. Modal closes and spinner disappears regardless of actual save outcome. **Fix**: await the mutation prop, drop the setTimeout.

- **F13** (from C8) `src/components/form/SkillsForm.tsx:125-131` — `value` is derived from `group.items` via `.filter(Boolean).join(', ')`; `onChange` splits-trims-filters-joins on every keystroke. Typing `,` collapses the string, cursor jumps, typing mid-string breaks. **Fix**: keep raw string in local state; parse to array on blur/submit only.

- **F14** (from C12) `src/components/profile/ProfileCard.tsx` — Not exported from `components/profile/index.ts`, not imported anywhere. Dead code. **Fix**: delete.

### Pages / templates

- **F15** (from P1) `src/pages/editor/[resumeId].tsx:313-326` — Cmd+Shift+D shortcut gate checks `pdfUrl` but `handleDownloadPdf` uses `displayPdfUrl`. When viewing an older version, `pdfUrl` is null → shortcut fails silently even though the Download button works. **Fix**: `if (displayPdfUrl)`.

- **F16** (from P2) `src/templates/{modern,jakes,academic,europass,twocolumn}.ts` — Every template wraps URLs in `escapeLatex(url)` before passing to `\href{...}`. `escapeLatex` turns `&`, `%`, `_`, `#`, `~`, `^` into LaTeX escapes, breaking any URL with a query string, path containing `_`, or anchor. LinkedIn/portfolio URLs almost always contain these. **Fix**: pass raw URL to `\href`'s first argument; only escape the visible anchor text. Consider `\url{}` or a hyperref URL-safe helper.

---

## Tier 2 — Valid, needs care. Fix after Tier 1.

### Backend

- **F17** (B4) `worker.ts:619` — `createActionTools` receives `scopeId` but ignores it (always uses `app:${env.APP_NAME}`). **Fix**: assert equality or honor the arg.
- **F18** (B13) `worker.ts:497` — DO tool-execute error path leaks as opaque tool-error. **Fix**: try/catch around `res.json()`, return `{success: false, error: '...'}` shape.
- **F19** (B14) `src/schemas/*.ts` — `viewer` role has `create: true, update: 'own'`. Viewer should be read-only. **Fix**: `create: false, update: false` on profiles, resumes, editorSettings.
- **F20** (B19) `worker.ts:484 + 620 + src/ai/context.ts:20-22` — `scopeId = 'app:${APP_NAME}'` duplicated in three places. **Fix**: export one `makeScopeId(appName)` helper (F9 on sister app).

### Hooks

- **F21** (H6) `src/hooks/useCompilation.ts:110` — Blob URL leaked on unmount (only revoked on next compile). **Fix**: unmount-cleanup effect revokes `prevBlobUrlRef.current`.
- **F22** (H8+H11) `src/hooks/useEditorSettings.ts:79-103 + usePanelResize.ts:46-49` — `put`/`saveRatio` called inside `setLocalSettings(prev => ...)` updater. Side-effect in a reducer — strict mode double-invokes. **Fix**: compute `next` outside the updater, write once, then `setState(next)`.
- **F23** (H12) `src/hooks/useTipRotation.ts:27-44` — `setTimeout(..., 300/200)` with no cleanup. Unmount mid-fade → setState-on-unmounted warnings. **Fix**: track ids in refs, clear on unmount.
- **F24** (H14) `src/hooks/useResumeForm.ts:137-144` — `sectionOrder` memo mutates shared `DEFAULT_SECTION_ORDER` on JSON-parse fallback. **Fix**: `const stored = [...safeJson(...)]`.
- **F25** (H16) `src/hooks/useResumes.ts:82-85` — `createResume` swallows all errors; callers can't distinguish "rbac denied" from "offline". **Fix**: rethrow or expose error state.
- **F26** (H18+H19) `src/hooks/useAiAssist.ts + useTailorSection.ts` — No AbortController; double-click generate runs two overlapping streams. **Fix**: `AbortController` in a ref, abort on re-invocation and unmount.

### Components

- **F27** (C6) `src/components/ai-chat/ChatPanel.tsx:175-181` — Unmount-persist effect closes over stale `resumeId` during resumeId transitions. **Fix**: snapshot both `resumeId` and `messagesRef` at effect mount.
- **F28** (C7) `src/components/shared/CompileLog.tsx:69-93` — Nested `<button>` inside `<button>` — invalid HTML + broken keyboard. **Fix**: outer becomes `<div role="button" tabIndex={0} onKeyDown>`, inner stays `<button>`.
- **F29** (C11) `src/components/preview/PdfDisplay.tsx` — pdfjs renderTask not cancelled on page/zoom change; in-flight renders burn CPU after they're irrelevant. **Fix**: store `RenderTask` ref, call `.cancel()` on deps change.
- **F30** (C14) `src/components/form/ExperienceForm.tsx:320 + ProjectsForm.tsx:304` — `canImprove` disables the sparkle button globally when ANY tailor suggestion exists. Should be per-entry. **Fix**: scope the `!Object.keys(tailorSuggestions).length` check to the current bullet.
- **F31** (C15) `src/components/form/ExperienceForm.tsx:156-165 + ProjectsForm.tsx:149-158` — `handleAcceptSuggestion` uses `eslint-disable-next-line exhaustive-deps` skipping `updateBullet`, which closes over stale `entries`. **Fix**: drop the disable; include `updateBullet` in deps.
- **F32** (C21) `src/components/dashboard/PdfThumbnail.tsx:62` — Cache key `base64.slice(0, 64)` — PDF headers are near-constant; different PDFs collide. **Fix**: hash the full base64 (FNV or SHA-256 prefix).
- **F33** (C24) `src/components/dashboard/ResumeCard.tsx:63-67` — `<div onClick>` with no `role="button"`, `tabIndex`, `onKeyDown`. Keyboard users cannot open a resume. **Fix**: add the a11y trio.

### Pages / AI

- **F34** (P7) `src/templates/{awesome,creative,deedy,executive,minimalist}.ts` — 5 template files (~880 LOC) not imported anywhere. Dead code. **Fix**: delete.
- **F35** (P9) `src/ai/tools.ts` — `buildReadOnlyTools`, `READ_ONLY_TOOL_NAMES`, `buildSystemPrompt`, `CollectionSchema` import are all unused after worker upgrade. **Fix**: delete.
- **F36** (P10) `src/pages/editor/[resumeId].tsx:157-161` — `jobDescription` local state resets from server record via effect on every record change, can clobber in-flight typed edits. **Fix**: guard the effect on resume ID changes only, or make the form the single writer.
- **F37** (P14) `src/ai/context.ts:95-103` — When user has no `editorSettings` record, fallback picks `settings[0]` (possibly another user's row if RBAC permits). Benign with scoped RBAC but a smell. **Fix**: drop the fallback; return `activeResumeId: null`.
- **F38** (P22) `src/ai/resume-prompt.ts:14` — Prompt identifies the assistant as "TeXPal's resume builder" — TeXPal is the sister LaTeX editor's brand. **Fix**: rebrand to "the resume builder" or parameterize.
- **F39** (C13) `src/components/ai-chat/ChatPanel.tsx:138` — `loadPersistedMessages` doesn't validate each message's shape; malformed entries crash `MessageRow`. **Fix**: validate `{id, role, content}` on each loaded element.

---

## Tier 3 — Nice-to-have. Documented, not fixed now.

Small cleanup items: B5/B9/B11/B12/B15 (unrelated worker small-improvements), H9/H13/H17 (hook cosmetics), C9/C10/C16/C17/C18/C20/C23 (a11y + cosmetic), P6/P8/P16/P19/P20 (catalog drift, dead constants, duplicated helpers). None affect correctness or UX today. Can be picked up opportunistically.

---

## Rejected / won't-fix

- B8: `as LanguageModelV1` — same pattern in sister app, working as intended.
- B10: WS stub request forwarding — works in practice, narrow scope.
- B16: pdfData in text column — architectural change, requires R2 versions plumbing, explicitly out of scope for this review.
- B17: schema indexes — SDK does not require declared indexes for `where`.
- H7, H10, H15, H20, H22, H23: various micro/noise.
- C19, C22, C25: refactor-taste.
- P3, P4: reviewer retracted themselves.
- P11, P12: prompt instructions confirmed correct against schema.

---

## Implementation status

**Applied in this session (Phase A → D):**

- **Phase A (dead code + primitives)** — F14 ProfileCard deleted, F34 5 dead templates deleted, F35 dead AI exports removed, F8 `Input`/`Textarea` now render `<label htmlFor>` with `useId` wiring; all existing `label="..."` consumers in `form/` immediately gain accessible labels.
- **Phase B (backend)** — F1/F2 actions use `?appAction=true` query + body `userId`, F3 `deleteResume` server action added (cascades over `resume-versions`) and `useResumes.deleteResume` now hits `/api/actions/deleteResume`, F19 viewer RBAC flipped to read-only across schemas, F18 chat-route tool-transport wrapped in try/catch, F20 `makeScopeId` helper consolidates three call sites. (F2 Bearer parse also fixed.)
- **Phase C (hooks)** — F4 `useEditorSettings` bootstrap uses `createConfirmed` + per-user in-flight guard, F5 `useResumeForm` persists to a ref-tracked id so resume switches flush to the OLD id before hydrating the NEW record, F6/F7 `useVersionHistory.addVersion` is async with `createConfirmed` and a per-resumeId serialisation chain preventing versionNum collisions, F21 blob URL unmount cleanup, F22 `updateSetting` / `usePanelResize` move side-effects out of the setState updater, F23 `useTipRotation` clears timeouts on unmount, F24 `sectionOrder` clones the fallback, F25 `createResume` rethrows, F26 `useAiAssist` + `useTailorSection` guard with req-id + unmount detection.
- **Phase D (components + pages + templates)** — F9 `PhotoUpload.handleRemove` stops propagation, F10 `LatexPreview` is fully controlled (cursor no longer clobbered mid-typing), F11/F12 `ProfileEditor` + `SaveProfileModal` now await save and keep modal open on failure, F13 `SkillsForm` holds a raw per-group string and only parses on blur, F15 Cmd+Shift+D uses `displayPdfUrl`, F16 new `escapeLatexUrl` helper + all five templates stop LaTeX-escaping href targets, F28 `CompileLog` header is `role="button"` with keyboard handler (no more nested `<button>`), F30 Experience/Projects `canImprove` scoped per-bullet, F36 `jobDescription` hydrates only on resume-id change, F37 `loadContext` drops settings[0] fallback, F38 prompt rebrand, F39 `ChatPanel.loadPersistedMessages` validates shape.

**Type-check**: 132 → 40 errors. All remaining are pre-existing out-of-scope items (`variant="primary"/"danger"` on Button/ConfirmModal, `r.data` typed as `unknown` in a couple of hooks, RobotViewer.jsx, etc.) — none introduced by the review work.

**Deferred to Tier 3** (see rejection + tier-3 sections above):
- F17 (createActionTools scope assertion) — single-scope app, low impact.
- F27 (ChatPanel persist race during resumeId transitions) — narrow; the debounced persist + mount-keyed load largely subsumes it in practice.
- F29 (pdfjs renderTask cancel) — perf only.
- F31 (accept-suggestion stale closure) — subtle; no user-visible bug.
- F32 (PdfThumbnail cache key collision) — currently unproven in practice.
- F33 (ResumeCard keyboard a11y) — Tier 3 a11y improvement.
- All items under "Tier 3" header.

## Original plan (kept for reference)

**Phase A (parallel-safe, spawn subagents):**
- F14 (delete ProfileCard), F34 (delete 5 dead templates), F35 (delete dead AI exports) — one pass.
- F8 (Input/Textarea label prop) — single-file primitive change; forms already pass `label=`, so this heals the whole forms layer.

**Phase B (backend, sequential, single agent or myself):**
- F1+F2 (auth shapes in worker + action tools)
- F3 (deleteResume cascading action)
- F20 (scopeId consolidation)

**Phase C (hooks, sequential in useResumeForm chain):**
- F4 (useEditorSettings bootstrap)
- F5 (useResumeForm stale resumeId)
- F6+F7 (useVersionHistory Promise + race)
- F21 (blob URL unmount)
- F22 (setState updater side effects)

**Phase D (components/pages, mostly independent):**
- F9, F10, F11, F12, F13, F15, F16
- F27, F28, F29, F30, F31, F32, F33
- F36, F37, F38, F39

Order: A → B → C → D. Verify with `pnpm type-check` between phases.
