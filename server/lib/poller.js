import { getAccounts } from './accounts.js'
import { getOpenIssuesWithLabel } from './github.js'
import { isIssueTracked, createProjectFromIssue, createPendingProject } from './prd.js'
import { generatePrd } from './prd-generator.js'
import { startAgent } from './agent.js'

const POLL_INTERVAL = 60_000

export function startPoller(broadcast, onAutoStart) {
  poll(broadcast, onAutoStart)
  setInterval(() => poll(broadcast, onAutoStart), POLL_INTERVAL)
}

async function poll(broadcast, onAutoStart) {
  let accounts
  try {
    accounts = await getAccounts()
  } catch {
    return
  }

  for (const account of accounts) {
    for (const repo of account.watchedRepos ?? []) {
      try {
        await processRepo(account, repo, broadcast, onAutoStart)
      } catch (e) {
        console.error(`Poller error for ${repo.fullName}:`, e.message)
      }
    }
  }
}

async function processRepo(account, repo, broadcast, onAutoStart) {
  const [owner, repoName] = repo.fullName.split('/')
  const issues = await getOpenIssuesWithLabel(account.token, owner, repoName, 'todo')

  for (const issue of issues) {
    if (await isIssueTracked(repo.fullName, issue.number)) continue

    console.log(`[poller] New todo issue: ${repo.fullName}#${issue.number} — ${issue.title}`)

    const githubSource = {
      accountId: account.id,
      repoFullName: repo.fullName,
      owner,
      repoName,
      issueNumber: issue.number,
      issueId: issue.id,
      issueTitle: issue.title,
      issueBody: issue.body ?? '',
      issueUrl: issue.html_url,
    }

    const { tasks, pending } = await generatePrd(issue.title, issue.body ?? '')

    if (pending) {
      await createPendingProject(issue.title, githubSource)
      broadcast({ type: 'projects:refresh' })
    } else {
      const project = await createProjectFromIssue(issue.title, tasks, githubSource)
      broadcast({ type: 'projects:refresh' })
      onAutoStart(project)
    }
  }
}
