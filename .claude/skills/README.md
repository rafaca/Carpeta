# Skills

Design and animation skills vendored from [emilkowalski/skill](https://github.com/emilkowalski/skill)
(MIT, see `LICENSE`). Pinned at upstream commit `da80201`.

They live in the repo rather than in a global `~/.agents/skills` install so they're
available in every session on this project — including Claude Code on the web, which
starts from a fresh clone and never sees a local machine's global install.

| Skill | What it does | Auto-triggers |
| --- | --- | --- |
| `animation-vocabulary` | Turns a vague description of a motion effect into its exact term | yes |
| `apple-design` | Apple's fluid-motion and interface design approach, translated for the web | yes |
| `emil-design-eng` | Emil Kowalski's philosophy on UI polish and component design | yes |
| `find-animation-opportunities` | Sweeps a UI for places that should animate but don't | yes |
| `improve-animations` | Audits motion across the codebase and writes implementation plans | yes |
| `pick-ui-library` | Opinionated library picks per frontend task | invoke only |
| `prototype` | Builds several variants of a UI piece behind a visual picker | invoke only |
| `review-animations` | Reviews animation code against a high craft bar | invoke only |

Four are invoke-only (`disable-model-invocation: true` in their frontmatter) — call them
by name, e.g. `/prototype a hold-to-delete button`.

## Updating

```sh
git clone --depth 1 https://github.com/emilkowalski/skill.git /tmp/emil-skill
rm -rf .claude/skills/*/ && cp -R /tmp/emil-skill/skills/. .claude/skills/
```

Then update the pinned commit above.
