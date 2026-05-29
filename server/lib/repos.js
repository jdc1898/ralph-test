import { access, mkdir, rm } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { generateClaudeMd } from './memory.js'

const REPOS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../repos')

function runCmd(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd })
    let out = ''
    let err = ''
    proc.stdout.on('data', d => { out += d })
    proc.stderr.on('data', d => { err += d })
    proc.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `exit ${code}`)))
    proc.on('error', reject)
  })
}

export function getRepoPath(repoFullName) {
  const [owner, repo] = repoFullName.split('/')
  return join(REPOS_DIR, owner, repo)
}

export async function removeRepo(repoFullName) {
  const repoPath = getRepoPath(repoFullName)
  await rm(repoPath, { recursive: true, force: true })
  console.log(`[repos] removed ${repoFullName}`)
}

export async function ensureRepo(repoFullName) {
  const repoPath = getRepoPath(repoFullName)

  try {
    await access(join(repoPath, '.git'))
    // Already cloned — fetch latest
    await runCmd('git', ['fetch', '--all', '--prune'], repoPath)
    console.log(`[repos] fetched ${repoFullName}`)
  } catch {
    // Not cloned yet — clone it
    const [owner] = repoFullName.split('/')
    await mkdir(join(REPOS_DIR, owner), { recursive: true })
    await runCmd('gh', ['repo', 'clone', repoFullName, repoPath], REPOS_DIR)
    console.log(`[repos] cloned ${repoFullName} → ${repoPath}`)
    generateClaudeMd(repoFullName, repoPath).catch(e =>
      console.error(`[memory] CLAUDE.md failed for ${repoFullName}:`, e.message)
    )
  }

  return repoPath
}
