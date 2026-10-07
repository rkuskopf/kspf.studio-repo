# Issue #110 CMS changes for review

No remote changes have been applied. The current drafts use display names as numbers. The layout now places `display_name` below media, so the content needs the following migration to show project names there.

Add optional text `project_number` to the existing project component, preserving every existing field. Blank values fall back to the visible homepage feed position (`01`, `02`, etc.).

Suggested draft content changes:

| Current display name | New project number | Proposed display name |
| --- | --- | --- |
| 001 | 001 | Aesop |
| 002 | 002 | Arcteryx |
| 003 | 003 | Jak Architecture |
| 004 | 004 | alt. cosmetics |
| 005 | 005 | Albus Lumen |
| 006 | 006 | AP—REPS |

These preserve the existing editorial numbers. Project titles, categories, slides, sorting, and visibility remain unchanged. Only the six homepage project stories above need content edits; the project-page tracer and hidden Christopher Myles Henderson story are excluded.

Verify changes in the draft preview at https://localhost:8001/ before publishing. Draft content edits and publishing require separate authorization from this local implementation.
