export function buildPrompt(projectPath, projectName, hasMemo) {
  const lines = [
    '# Agent instructions',
    '',
    `- Find the highest-priority incomplete task in @${projectPath}/project.md and implement it.`,
    `- Append a brief summary of what you did to @${projectPath}/progress.md and check off the completed task in @${projectPath}/project.md.`,
    '- Commit and push your changes.',
    '',
    '# Guidelines',
    '',
    '- Only work on a single task per run.',
    '- If all tasks are complete, output <promise>COMPLETE</promise>.',
  ]

  if (hasMemo) {
    lines.splice(2, 0, '- Read @.ralph/memory.md before starting — it contains context about prior work in this codebase.', '')
  }

  return lines.join('\n')
}
