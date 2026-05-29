<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="panel">
      <div class="panel-header">
        <h2>GitHub</h2>
        <button class="icon-btn" @click="$emit('close')">✕</button>
      </div>

      <div v-if="loading" class="state-msg">loading…</div>
      <div v-else-if="error" class="err">{{ error }}</div>

      <template v-else>
        <div v-if="!accounts.length" class="empty">
          <p>No GitHub accounts connected.</p>
        </div>

        <div v-for="account in accounts" :key="account.id" class="account">
          <div class="account-header">
            <img :src="account.avatarUrl" class="avatar" />
            <span class="login">{{ account.login }}</span>
            <button class="danger small" @click="disconnect(account.id)">disconnect</button>
          </div>

          <div class="repos-section">
            <div class="repos-header">
              <div class="repos-label">watched repos</div>
              <input
                v-model="repoSearch[account.id]"
                class="repo-search"
                placeholder="filter repos…"
              />
            </div>

            <div v-if="repoLoading[account.id]" class="state-msg">loading repos…</div>

            <div v-else class="repo-list">
              <div
                v-for="repo in filteredRepos(account.id)"
                :key="repo.fullName"
                class="repo-row"
              >
                <span class="repo-name">{{ repo.fullName }}</span>
                <span v-if="repo.private" class="private-badge">private</span>
                <button
                  class="small"
                  :class="isWatched(account, repo) ? 'danger' : 'primary'"
                  @click="toggleWatch(account, repo)"
                >
                  {{ isWatched(account, repo) ? 'unwatch' : 'watch' }}
                </button>
              </div>
              <div v-if="!filteredRepos(account.id).length" class="state-msg">no repos found</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <button class="primary" :disabled="connecting" @click="connectGitHub">
            {{ connecting ? 'waiting for browser…' : '+ connect GitHub account' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

defineEmits(['close'])

const accounts = ref([])
const repoMap = ref({})
const repoLoading = ref({})
const repoSearch = ref({})
const loading = ref(true)
const connecting = ref(false)
const error = ref('')

function filteredRepos(accountId) {
  const repos = repoMap.value[accountId] ?? []
  const q = (repoSearch.value[accountId] ?? '').toLowerCase()
  return q ? repos.filter(r => r.fullName.toLowerCase().includes(q)) : repos
}

onMounted(loadAccounts)

async function connectGitHub() {
  connecting.value = true
  error.value = ''
  try {
    const res = await fetch('/api/auth/github/connect', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    await loadAccounts()
  } catch (e) {
    error.value = e.message
  } finally {
    connecting.value = false
  }
}

async function loadAccounts() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/accounts')
    accounts.value = await res.json()
    for (const account of accounts.value) {
      loadRepos(account.id)
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function loadRepos(accountId) {
  repoLoading.value[accountId] = true
  try {
    const res = await fetch(`/api/accounts/${accountId}/repos`)
    repoMap.value[accountId] = await res.json()
  } catch {
    repoMap.value[accountId] = []
  } finally {
    repoLoading.value[accountId] = false
  }
}

function isWatched(account, repo) {
  return (account.watchedRepos ?? []).some(r => r.fullName === repo.fullName)
}

async function toggleWatch(account, repo) {
  const watched = isWatched(account, repo)
  const url = `/api/accounts/${account.id}/repos/watch`
  await fetch(url, {
    method: watched ? 'DELETE' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: repo.fullName, name: repo.name }),
  })
  await loadAccounts()
}

async function disconnect(accountId) {
  await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' })
  await loadAccounts()
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  width: 560px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h2 { font-size: 15px; font-weight: 600; color: var(--text); }

.icon-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 14px;
  padding: 2px 6px;
}

.account {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.account-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.login { font-size: 13px; color: var(--text); flex: 1; }

.repos-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.repos-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  flex-shrink: 0;
}

.repo-search {
  flex: 1;
  font-size: 11px;
  padding: 3px 7px;
  height: 22px;
}

.repo-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.repo-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.repo-name { font-size: 12px; color: var(--text); flex: 1; }

.private-badge {
  font-size: 10px;
  color: var(--text-dim);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: 3px;
}

.small { font-size: 11px; padding: 2px 8px; }

.state-msg { font-size: 12px; color: var(--text-dim); }

.empty p { font-size: 13px; color: var(--text-dim); }

.err { font-size: 12px; color: var(--red); }

.footer { display: flex; justify-content: flex-end; }
</style>
