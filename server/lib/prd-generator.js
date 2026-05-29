import { spawn } from 'child_process'

function buildPrompt(title, body) {
  return `You are a strict technical project manager reviewing a GitHub issue to decide if it contains enough detail for a developer agent to implement without any human guidance.

GitHub Issue: ${title}
${body ? `\nDescription:\n${body}` : '(no description provided)'}

To proceed WITHOUT asking questions, the issue must clearly specify ALL of the following:
1. What exact feature or change is needed (not vague like "improve" or "fix")
2. Where in the codebase or UI it applies
3. The expected behaviour or outcome
4. Any relevant technical constraints or stack details

If ANY of those are missing or ambiguous, you MUST output PENDING and ask the specific questions needed to fill the gaps. Do not guess or invent details.

If the issue is fully specified, output ONLY the task list — one task per line, no bullets, no numbering:
Create the database migration for the users table
Add POST /api/users endpoint with validation
Build the UserForm component in Vue

If information is missing, output PENDING on the first line followed by your questions (one per line):
PENDING
What specific aspects of the dashboard need improving?
Which metrics or data should be displayed?`
}

export async function generatePrd(issueTitle, issueBody) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, CLAUDECODE: undefined }
    const proc = spawn(
      'claude',
      ['-p', '--output-format', 'stream-json', '--verbose', buildPrompt(issueTitle, issueBody)],
      { env }
    )

    let buffer = ''
    let text = ''

    proc.stdout.on('data', chunk => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.type === 'result') text = data.result ?? ''
        } catch {}
      }
    })

    proc.on('close', () => {
      const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
      if (lines[0] === 'PENDING') {
        resolve({ tasks: null, pending: true, questions: lines.slice(1).join('\n') })
      } else {
        resolve({ tasks: lines, pending: false, questions: null })
      }
    })

    proc.on('error', reject)
  })
}
