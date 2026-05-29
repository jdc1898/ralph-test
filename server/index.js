import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { listProjects, createProject, promotePendingProject, deleteProject, deleteProjectsByRepo } from './lib/prd.js'
import { startAgent, stopAgent, isRepoRunning } from './lib/agent.js'
import { createInterview, continueInterview, destroyInterview } from './lib/interview.js'
import { getAccounts, upsertAccount, removeAccount, watchRepo, unwatchRepo } from './lib/accounts.js'
import { getGhToken, ghLogin, getUser, listRepos, updateIssueBody, addLabel, removeLabel, closeIssue } from './lib/github.js'
import { ensureRepo } from './lib/repos.js'
import { startPoller } from './lib/poller.js'

const app = express()
app.use(express.json())

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

function broadcast(data) {
  const msg = JSON.stringify(data)
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg)
  }
}

// ─── Projects ────────────────────────────────────────────────────────────────

app.get('/api/projects', async (req, res) => {
  res.json(await listProjects())
})

app.post('/api/projects', async (req, res) => {
  const { name, tasks } = req.body
  const project = await createProject(name, tasks)
  broadcast({ type: 'projects:refresh' })
  res.json(project)
})

app.post('/api/projects/:id/promote', async (req, res) => {
  const { tasks } = req.body
  try {
    const project = await promotePendingProject(req.params.id, tasks)

    if (project.githubSource) {
      const { accountId, owner, repoName, issueNumber, issueBody } = project.githubSource
      const accounts = await getAccounts()
      const account = accounts.find(a => String(a.id) === String(accountId))

      if (account) {
        const prdBlock = `\n\n---\n\n## Ralph PRD\n\n${tasks.map(t => `- [ ] ${t}`).join('\n')}`
        await updateIssueBody(account.token, owner, repoName, issueNumber, (issueBody ?? '') + prdBlock)
          .catch(e => console.error('update issue body:', e.message))
        await removeLabel(account.token, owner, repoName, issueNumber, 'todo')
          .catch(() => {})
        await addLabel(account.token, owner, repoName, issueNumber, 'in-progress')
          .catch(e => console.error('add label:', e.message))
      }
    }

    broadcast({ type: 'projects:refresh' })
    if (!isRepoRunning(project.githubSource?.repoFullName)) {
      startAgent(project, broadcast)
    }
    res.json(project)
  } catch (e) {
    res.status(500).json({ error: String(e.message) })
  }
})

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projects = await listProjects()
    const project = projects.find(p => p.id === req.params.id)
    await deleteProject(req.params.id)
    if (project?.githubSource) {
      const { accountId, owner, repoName, issueNumber } = project.githubSource
      const accounts = await getAccounts()
      const account = accounts.find(a => String(a.id) === String(accountId))
      if (account) closeIssue(account.token, owner, repoName, issueNumber).catch(() => {})
    }
    broadcast({ type: 'projects:refresh' })
    res.sendStatus(204)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/dismiss', async (req, res) => {
  const { githubSource } = req.body
  if (!githubSource) return res.sendStatus(204)
  try {
    const { accountId, owner, repoName, issueNumber } = githubSource
    const accounts = await getAccounts()
    const account = accounts.find(a => String(a.id) === String(accountId))
    if (!account) return res.sendStatus(204)
    await closeIssue(account.token, owner, repoName, issueNumber)
    res.sendStatus(204)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Interview ───────────────────────────────────────────────────────────────

app.post('/api/interview', async (req, res) => {
  const { topic } = req.body
  const id = createInterview(topic)
  try {
    const result = await continueInterview(id, null)
    res.json({ sessionId: id, ...result })
  } catch (e) {
    destroyInterview(id)
    res.status(500).json({ error: String(e.message) })
  }
})

app.post('/api/interview/:id/reply', async (req, res) => {
  const { answer } = req.body
  try {
    const result = await continueInterview(req.params.id, answer)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e.message) })
  }
})

app.delete('/api/interview/:id', (req, res) => {
  destroyInterview(req.params.id)
  res.sendStatus(204)
})

// ─── GitHub Auth (via gh CLI) ─────────────────────────────────────────────────

app.post('/api/auth/github/connect', async (req, res) => {
  try {
    let token = await getGhToken()

    if (!token) {
      await ghLogin()
      token = await getGhToken()
    }

    if (!token) throw new Error('Could not retrieve GitHub token after login')

    const user = await getUser(token)
    await upsertAccount({ id: user.id, login: user.login, avatarUrl: user.avatar_url, token })
    res.json({ login: user.login })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── GitHub Accounts & Repos ─────────────────────────────────────────────────

app.get('/api/accounts', async (req, res) => {
  const accounts = await getAccounts()
  res.json(accounts.map(({ token: _token, ...a }) => a))
})

app.delete('/api/accounts/:id', async (req, res) => {
  await removeAccount(req.params.id)
  res.sendStatus(204)
})

app.get('/api/accounts/:id/repos', async (req, res) => {
  const accounts = await getAccounts()
  const account = accounts.find(a => String(a.id) === String(req.params.id))
  if (!account) return res.status(404).json({ error: 'Account not found' })
  try {
    const repos = await listRepos(account.token)
    res.json(repos.map(r => ({ id: r.id, fullName: r.full_name, name: r.name, private: r.private })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/accounts/:id/repos/watch', async (req, res) => {
  const { fullName, name } = req.body
  try {
    await watchRepo(req.params.id, { fullName, name })
    await ensureRepo(fullName)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/accounts/:id/repos/watch', async (req, res) => {
  const { fullName } = req.body
  try {
    await unwatchRepo(req.params.id, fullName)
    await deleteProjectsByRepo(fullName)
    broadcast({ type: 'projects:refresh' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── WebSocket ────────────────────────────────────────────────────────────────

wss.on('connection', async ws => {
  ws.send(JSON.stringify({ type: 'projects', data: await listProjects() }))

  ws.on('message', async raw => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.type === 'start') {
      const projects = await listProjects()
      const project = projects.find(p => p.id === msg.projectId)
      if (project && !isRepoRunning(project.githubSource?.repoFullName)) {
        startAgent(project, broadcast)
      }
    }

    if (msg.type === 'stop') {
      stopAgent(msg.agentId)
    }
  })
})

// ─── Start ────────────────────────────────────────────────────────────────────

function autoStart(project) {
  if (!isRepoRunning(project.githubSource?.repoFullName)) {
    startAgent(project, broadcast)
  }
}

startPoller(broadcast, autoStart)

const PORT = process.env.PORT ?? 3001
server.listen(PORT, () => console.log(`Ralph server running on http://localhost:${PORT}`))
