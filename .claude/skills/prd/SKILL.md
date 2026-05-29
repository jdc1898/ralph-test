---
name: prd
description: Create a PRD (Product Requirements Document) as a project.md file in prd/backlog/, ready for Ralph agents to pick up and implement. Use after a grill-me session or when the user has a clear plan.
---

Create a PRD for the described feature or project.

Write it to `prd/backlog/<project-slug>/project.md`. Also create an empty `prd/backlog/<project-slug>/progress.md`.

The project.md must follow this structure:

```markdown
# <Project Name>

## Goal
<One paragraph describing what this builds and why.>

## Tasks

- [ ] <First concrete implementation task>
- [ ] <Second task>
- [ ] <...>
```

Rules for tasks:
- Each task must be self-contained and implementable in a single Claude iteration.
- Order tasks so each one builds on the previous (dependencies first).
- Be specific — include filenames, component names, and expected behaviour where relevant.
- Aim for 5–15 tasks. Too few means tasks are too large; too many means too granular.

After writing the files, tell the user the project slug so they can find it in the Ralph UI.
