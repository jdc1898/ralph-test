<template>
  <div class="panel" :class="{ collapsed }">
    <div class="panel-header" @click="collapsed = !collapsed">
      <div class="panel-title">
        <span class="chevron">{{ collapsed ? '›' : '⌄' }}</span>
        <template v-if="agent.githubSource">
          <span class="repo-badge">{{ agent.githubSource.repoFullName }}</span>
          <span class="issue-ref">#{{ agent.githubSource.issueNumber }} {{ agent.githubSource.issueTitle }}</span>
        </template>
        <span v-else class="project-name">{{ agent.projectName }}</span>
        <span class="badge" :class="agent.status">{{ agent.status }}</span>
      </div>
      <div class="panel-meta" @click.stop>
        <span v-if="stats" class="stats">{{ stats }}</span>
        <a v-if="agent.prUrl" :href="agent.prUrl" target="_blank" rel="noopener" class="pr-link">View PR ↗</a>
        <button v-if="agent.status === 'running'" class="danger" @click="$emit('stop', agent.id)">
          stop
        </button>
        <button v-else @click="$emit('dismiss', agent.id)">dismiss</button>
      </div>
    </div>

    <div v-show="!collapsed" class="log-area" ref="logEl">
      <div v-if="!agent.logs.length" class="empty">waiting for output…</div>
      <LogEntry v-for="(entry, i) in agent.logs" :key="i" :data="entry" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onUnmounted } from 'vue'
import LogEntry from './LogEntry.vue'

const props = defineProps({ agent: Object })
defineEmits(['stop', 'dismiss'])

const logEl = ref(null)
const collapsed = ref(false)
const now = ref(Date.now())

const ticker = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(ticker))

const duration = computed(() => {
  if (!props.agent.startedAt) return null
  const total = Math.floor((now.value - props.agent.startedAt) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
})

const stats = computed(() => {
  const parts = []
  if (props.agent.cost > 0) parts.push(`$${props.agent.cost.toFixed(3)}`)
  if (duration.value) parts.push(duration.value)
  if (props.agent.iteration > 0) parts.push(`iter ${props.agent.iteration}/${props.agent.maxIterations}`)
  return parts.join(' - ')
})

watch(
  () => props.agent.logs.length,
  async () => {
    await nextTick()
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  },
)
</script>

<style scoped>
.panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.panel.collapsed {
  flex: none;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  gap: 12px;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
}
.panel-header:hover { background: #222; }

.chevron {
  color: var(--text-dim);
  font-size: 14px;
  width: 12px;
  display: inline-block;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.project-name {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.repo-badge {
  font-size: 11px;
  color: #aaa;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.issue-ref {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.stats { color: var(--text-dim); font-size: 11px; }

.pr-link {
  font-size: 11px;
  color: var(--blue);
  text-decoration: none;
  border: 1px solid rgba(59,130,246,0.35);
  border-radius: 4px;
  padding: 1px 7px;
  white-space: nowrap;
}
.pr-link:hover { background: rgba(59,130,246,0.1); }

.log-area {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.empty { color: var(--text-dim); font-style: italic; }
</style>
