import { relative } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

export function buildPrompt(projectPath, projectName) {
  const projectFile = relative(ROOT, `${projectPath}/project.md`)
  const progressFile = relative(ROOT, `${projectPath}/progress.md`)

  return [
    '# Agent instructions',
    '',
    `- Find the highest-priority task in @${projectFile} and implement it.`,
    `- Append your progress to @${progressFile} and check off the completed task in @${projectFile}.`,
    '- Commit and push your changes.',
    '',
    '# Guidelines',
    '',
    '- Only work on a single task.',
    '- If the Project is complete, output <promise>COMPLETE</promise>.',
  ].join('\n')
}
