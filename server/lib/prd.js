import { readdir, readFile, writeFile, mkdir, rm } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../prd')

function parseTasks(content) {
  return content
    .split('\n')
    .filter(line => /^- \[(x| )\] /.test(line))
    .map(line => {
      const match = line.match(/^- \[(x| )\] (.+)/)
      return { text: match[2], done: match[1] === 'x' }
    })
}

async function readGithubSource(dir) {
  const file = join(dir, 'github.json')
  if (!existsSync(file)) return null
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

async function readDir(status) {
  const dir = join(ROOT, status)
  if (!existsSync(dir)) return []

  const entries = await readdir(dir, { withFileTypes: true })
  const projects = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const projectMd = join(dir, entry.name, 'project.md')
    if (!existsSync(projectMd)) continue

    const content = await readFile(projectMd, 'utf8')
    const projectDir = join(dir, entry.name)
    const githubSource = await readGithubSource(projectDir)

    projects.push({
      id: entry.name,
      name: entry.name.replace(/-/g, ' '),
      status,
      path: projectDir,
      tasks: parseTasks(content),
      githubSource,
    })
  }

  return projects
}

export async function listProjects() {
  const [backlog, done, pending] = await Promise.all([
    readDir('backlog'),
    readDir('done'),
    readDir('pending'),
  ])
  return [...backlog, ...done, ...pending]
}

export async function createProject(name, tasks) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const dir = join(ROOT, 'backlog', slug)
  await mkdir(dir, { recursive: true })

  const content = `# ${name}\n\n## Tasks\n\n${tasks.map(t => `- [ ] ${t}`).join('\n')}\n`
  await writeFile(join(dir, 'project.md'), content)
  await writeFile(join(dir, 'progress.md'), '')

  return {
    id: slug,
    name,
    status: 'backlog',
    path: dir,
    tasks: tasks.map(t => ({ text: t, done: false })),
    githubSource: null,
  }
}

function issueSlug(repoFullName, issueNumber) {
  return `${repoFullName.replace('/', '-')}-${issueNumber}`
}

export async function createProjectFromIssue(name, tasks, githubSource) {
  const slug = issueSlug(githubSource.repoFullName, githubSource.issueNumber)
  const dir = join(ROOT, 'backlog', slug)
  await mkdir(dir, { recursive: true })

  const content = `# ${name}\n\n## Tasks\n\n${tasks.map(t => `- [ ] ${t}`).join('\n')}\n`
  await writeFile(join(dir, 'project.md'), content)
  await writeFile(join(dir, 'progress.md'), '')
  await writeFile(join(dir, 'github.json'), JSON.stringify(githubSource, null, 2))

  return {
    id: slug,
    name,
    status: 'backlog',
    path: dir,
    tasks: tasks.map(t => ({ text: t, done: false })),
    githubSource,
  }
}

export async function createPendingProject(name, githubSource) {
  const slug = issueSlug(githubSource.repoFullName, githubSource.issueNumber)
  const dir = join(ROOT, 'pending', slug)
  await mkdir(dir, { recursive: true })

  await writeFile(join(dir, 'project.md'), `# ${name}\n\n## Tasks\n\n`)
  await writeFile(join(dir, 'progress.md'), '')
  await writeFile(join(dir, 'github.json'), JSON.stringify(githubSource, null, 2))

  return {
    id: slug,
    name,
    status: 'pending',
    path: dir,
    tasks: [],
    githubSource,
  }
}

export async function promotePendingProject(id, tasks) {
  const pendingDir = join(ROOT, 'pending', id)
  if (!existsSync(pendingDir)) throw new Error('Pending project not found')

  const githubSource = await readGithubSource(pendingDir)
  const backlogDir = join(ROOT, 'backlog', id)
  await mkdir(backlogDir, { recursive: true })

  const name = id.replace(/-/g, ' ')
  const content = `# ${name}\n\n## Tasks\n\n${tasks.map(t => `- [ ] ${t}`).join('\n')}\n`
  await writeFile(join(backlogDir, 'project.md'), content)
  await writeFile(join(backlogDir, 'progress.md'), '')
  if (githubSource) {
    await writeFile(join(backlogDir, 'github.json'), JSON.stringify(githubSource, null, 2))
  }

  await rm(pendingDir, { recursive: true })

  return {
    id,
    name,
    status: 'backlog',
    path: backlogDir,
    tasks: tasks.map(t => ({ text: t, done: false })),
    githubSource,
  }
}

export async function isIssueTracked(repoFullName, issueNumber) {
  for (const status of ['backlog', 'done', 'pending']) {
    const dir = join(ROOT, status)
    if (!existsSync(dir)) continue
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const file = join(dir, entry.name, 'github.json')
      if (!existsSync(file)) continue
      try {
        const data = JSON.parse(await readFile(file, 'utf8'))
        if (data.repoFullName === repoFullName && data.issueNumber === issueNumber) return true
      } catch {}
    }
  }
  return false
}
