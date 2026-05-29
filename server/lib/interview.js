import { spawn } from 'child_process'
import { randomUUID } from 'crypto'

const sessions = new Map()

const SYSTEM = `Interview the user about their software project plan. Your goal is to deeply understand the plan and produce a concrete task list.

Rules:
- Ask questions one at a time
- For each question, provide a recommended answer in parentheses, e.g. "(Recommended: use a simple REST API)"
- Explore every branch of the design until you have a clear picture
- After 5–10 exchanges when you have enough information, conclude with a structured task list
- Signal completion by ending your response with this exact block:
<tasks>
Task description one
Task description two
</tasks>
- Until you have enough information, always end with exactly one question`

export function createInterview(topic) {
  const id = randomUUID()
  sessions.set(id, { history: [{ role: 'user', content: topic }] })
  return id
}

export async function continueInterview(id, answer) {
  const session = sessions.get(id)
  if (!session) throw new Error('Interview session not found')

  if (answer != null) {
    session.history.push({ role: 'user', content: answer })
  }

  const historyText = session.history
    .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  const prompt = `${SYSTEM}\n\nConversation so far:\n${historyText}\n\nAssistant:`

  return new Promise((resolve, reject) => {
    const env = { ...process.env, CLAUDECODE: undefined }
    const proc = spawn(
      'claude',
      ['-p', '--output-format', 'stream-json', '--verbose', prompt],
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
      const response = text.trim()
      session.history.push({ role: 'assistant', content: response })

      const match = response.match(/<tasks>([\s\S]*?)<\/tasks>/)
      const tasks = match
        ? match[1].trim().split('\n').map(t => t.trim()).filter(Boolean)
        : null

      resolve({ text: response, tasks, done: !!tasks })
    })

    proc.on('error', reject)
  })
}

export function destroyInterview(id) {
  sessions.delete(id)
}
