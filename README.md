# HMS Implementation Package

This package is the handoff from requirements workshop to coding.

## Files
- `MASTER_IMPLEMENTATION_PROMPT.md` -> paste into your coding agent.
- `docs/SRS.md` -> requirements and business rules.
- `docs/ARCHITECTURE.md` -> application architecture.
- `docs/DATABASE.md` -> database blueprint.
- `docs/API.md` -> API conventions and endpoints.
- `docs/TRACEABILITY.md` -> BP/UC/FR/BR/test traceability.
- `docs/ROADMAP.md` -> implementation phases.
- `docs/TESTING.md` -> testing strategy.
- `docs/DECISIONS.md` -> architecture decision log.

## How to use
1. Create your HMS repository.
2. Copy the `docs` folder into the repository root.
3. Open the repository in your code editor.
4. Give the coding agent the contents of `MASTER_IMPLEMENTATION_PROMPT.md`.
5. Let it inspect the repository first.
6. Require incremental implementation by roadmap phase.
7. Do not allow the agent to skip tests or silently invent requirements.

## Expected initial structure
project/
├── docs/
│   ├── SRS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── TRACEABILITY.md
│   ├── ROADMAP.md
│   ├── TESTING.md
│   └── DECISIONS.md
└── MASTER_IMPLEMENTATION_PROMPT.md
