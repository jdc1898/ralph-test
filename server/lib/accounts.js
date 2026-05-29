import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { removeRepo } from './repos.js'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../data')
const FILE = join(DATA_DIR, 'github-accounts.json')

async function read() {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'))
  } catch {
    return []
  }
}

async function save(accounts) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(FILE, JSON.stringify(accounts, null, 2))
}

export async function getAccounts() {
  return read()
}

export async function upsertAccount(account) {
  const accounts = await read()
  const idx = accounts.findIndex(a => String(a.id) === String(account.id))
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...account }
  } else {
    accounts.push({ watchedRepos: [], ...account })
  }
  await save(accounts)
  return accounts.find(a => String(a.id) === String(account.id))
}

export async function removeAccount(id) {
  const accounts = await read()
  await save(accounts.filter(a => String(a.id) !== String(id)))
}

export async function watchRepo(accountId, repo) {
  const accounts = await read()
  const account = accounts.find(a => String(a.id) === String(accountId))
  if (!account) throw new Error('Account not found')
  account.watchedRepos ??= []
  if (!account.watchedRepos.some(r => r.fullName === repo.fullName)) {
    account.watchedRepos.push(repo)
  }
  await save(accounts)
}

export async function unwatchRepo(accountId, repoFullName) {
  const accounts = await read()
  const account = accounts.find(a => String(a.id) === String(accountId))
  if (account) {
    account.watchedRepos = (account.watchedRepos ?? []).filter(r => r.fullName !== repoFullName)
  }
  await save(accounts)
  removeRepo(repoFullName).catch(e => console.error(`[repos] remove failed for ${repoFullName}:`, e.message))
}
