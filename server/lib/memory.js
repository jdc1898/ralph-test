import { readFile, writeFile, mkdir, copyFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { spawn } from 'child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../data')
const CLAUDE_MD_DIR = join(ROOT, 'claude-md')
const MEMORY_DIR = join(ROOT, 'memory')

const MAX_LINES = 150

function runClaude(prompt, cwd) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, CLAUDECODE: undefined }
    const proc = spawn('claude', ['-p', '--output-format', 'stream-json', '--verbose', prompt], { env, cwd })
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
    proc.on('close', () => resolve(text.trim()))
    proc.on('error', reject)
  })
}

function claudeMdPath(repoFullName) {
  const [owner, repo] = repoFullName.split('/')
  return join(CLAUDE_MD_DIR, owner, `${repo}.md`)
}

function memoryPath(repoFullName) {
  const [owner, repo] = repoFullName.split('/')
  return join(MEMORY_DIR, owner, `${repo}.md`)
}

export async function generateClaudeMd(repoFullName, repoPath) {
  const dest = claudeMdPath(repoFullName)
  if (existsSync(dest)) return

  await mkdir(dirname(dest), { recursive: true })

  const prompt = `Analyze this codebase and write a CLAUDE.md file that gives an AI agent everything it needs to start contributing without reading every file. Include:
- Stack and key dependencies (1-2 lines each)
- Directory structure (important dirs/files only)
- How to run tests and the dev server
- Key conventions and patterns
- Any non-obvious gotchas

Be concise. Max 80 lines. Output ONLY the markdown content, no preamble.`

  console.log(`[memory] generating CLAUDE.md for ${repoFullName}…`)
  const content = await runClaude(prompt, repoPath)
  if (content) {
    await writeFile(dest, content)
    console.log(`[memory] CLAUDE.md ready for ${repoFullName}`)
  }
}

export async function appendMemory(repoFullName, { issueNumber, issueTitle, progressNotes, changedFiles }) {
  const dest = memoryPath(repoFullName)
  await mkdir(dirname(dest), { recursive: true })

  const synthesisPrompt = `You just finished implementing a GitHub issue in a codebase. Write a concise memory entry (max 20 lines) that would help a future agent working on this same codebase. Focus exclusively on reusable codebase knowledge:
- Architectural patterns or conventions you discovered
- Which files/modules are important and what they do
- Non-obvious decisions, constraints, or gotchas
- How the relevant area of the codebase is structured

Do NOT summarize what the issue asked for or what you did. Focus on what a future agent needs to know about the codebase itself.

Issue: #${issueNumber} ${issueTitle}
Changed files:\n${changedFiles || '(none)'}
Progress notes:\n${progressNotes}

Output ONLY the markdown, starting with: ## #${issueNumber} ${issueTitle}`

  console.log(`[memory] synthesising learnings for ${repoFullName} #${issueNumber}…`)
  const entry = await runClaude(synthesisPrompt, process.cwd()).catch(() => null)
  if (!entry) return

  let current = ''
  try { current = await readFile(dest, 'utf8') } catch {}

  const updated = current ? `${current}\n\n${entry}` : entry
  const lines = updated.split('\n')

  if (lines.length <= MAX_LINES) {
    await writeFile(dest, updated)
    console.log(`[memory] updated memory for ${repoFullName}`)
    return
  }

  // Over limit — compress with Claude, fall back to truncation
  console.log(`[memory] compressing memory for ${repoFullName} (${lines.length} lines)…`)
  const compressed = await runClaude(
    `Compress this codebase memory log into a dense summary under 80 lines. Preserve all architectural decisions, patterns, and important file knowledge. Remove redundancy. Output only the markdown.\n\n${updated}`,
    process.cwd()
  ).catch(() => null)

  await writeFile(dest, compressed || lines.slice(-MAX_LINES).join('\n'))
  console.log(`[memory] compressed memory for ${repoFullName}`)
}

export async function copyContextToWorktree(repoFullName, cwd) {
  const claudeSrc = claudeMdPath(repoFullName)
  const memorySrc = memoryPath(repoFullName)

  if (existsSync(claudeSrc) && !existsSync(join(cwd, 'CLAUDE.md'))) {
    await copyFile(claudeSrc, join(cwd, 'CLAUDE.md'))
  }

  if (existsSync(memorySrc)) {
    const memDir = join(cwd, '.ralph')
    await mkdir(memDir, { recursive: true })
    await copyFile(memorySrc, join(memDir, 'memory.md'))
  }
}

export async function hasMemory(repoFullName) {
  return existsSync(memoryPath(repoFullName))
}
