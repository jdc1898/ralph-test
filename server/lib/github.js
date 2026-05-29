import { spawn } from 'child_process'

const BASE = 'https://api.github.com'

async function ghFetch(token, path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  })
  if (res.status === 204) return null
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub API ${path}: ${res.status} ${text}`)
  }
  return res.json()
}

function runGh(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', args)
    let out = ''
    let err = ''
    proc.stdout.on('data', d => { out += d.toString() })
    proc.stderr.on('data', d => { err += d.toString() })
    proc.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `gh exited ${code}`)))
    proc.on('error', e => reject(new Error(`GitHub CLI (gh) not found. Install it from cli.github.com`)))
  })
}

export async function getGhToken() {
  try {
    return await runGh(['auth', 'token', '--hostname', 'github.com'])
  } catch {
    return null
  }
}

export async function ghLogin() {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', ['auth', 'login', '--hostname', 'github.com', '--web', '--git-protocol', 'https'])
    let err = ''
    proc.stderr.on('data', d => { err += d.toString() })
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(err.trim() || 'gh auth login failed')))
    proc.on('error', () => reject(new Error('GitHub CLI (gh) not found. Install it from cli.github.com')))
  })
}

export async function getUser(token) {
  return ghFetch(token, '/user')
}

export async function listRepos(token) {
  const repos = []
  let page = 1
  while (page <= 5) {
    const batch = await ghFetch(token, `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator`)
    repos.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return repos
}

export async function getOpenIssuesWithLabel(token, owner, repo, label) {
  return ghFetch(token, `/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=100`)
}

export async function updateIssueBody(token, owner, repo, number, body) {
  return ghFetch(token, `/repos/${owner}/${repo}/issues/${number}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
}

export async function addLabel(token, owner, repo, number, label) {
  return ghFetch(token, `/repos/${owner}/${repo}/issues/${number}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels: [label] }),
  })
}

export async function removeLabel(token, owner, repo, number, label) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/issues/${number}/labels/${encodeURIComponent(label)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok && res.status !== 404 && res.status !== 422) {
    throw new Error(`Failed to remove label ${label}: ${res.status}`)
  }
}
