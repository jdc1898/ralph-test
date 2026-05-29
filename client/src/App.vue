<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="logo">ralph</span>
      <span class="conn-dot" :class="{ connected }"></span>
    </div>

    <div class="sidebar-section">
      <div class="section-label">projects</div>
      <div v-if="!visibleProjects.length" class="empty-hint">no projects yet</div>
      <div
        v-for="p in visibleProjects"
        :key="p.id"
        class="project-row"
        :class="{ active: activeAgentForProject(p.id) }"
      >
        <div class="project-info">
          <span class="project-name">{{ p.name }}</span>
          <span class="badge" :class="p.status">{{ p.status }}</span>
        </div>
        <div class="project-tasks">
          {{ completedTasks(p) }}/{{ p.tasks.length }} tasks
        </div>
        <button
          v-if="p.status === 'pending'"
          class="review-btn"
          @click="pendingProject = p"
        >
          review
        </button>
        <button
          v-else-if="p.status === 'backlog' && !activeAgentForProject(p.id)"
          class="primary run-btn"
          @click="startAgent(p.id)"
        >
          run
        </button>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="primary" @click="showNewProject = true">+ new project</button>
      <button class="github-btn" @click="showGitHub = true">GitHub</button>
    </div>
  </aside>

  <main class="main">
    <div v-if="!agentList.length" class="empty-state">
      <div class="empty-icon">⬡</div>
      <p>No agents running.</p>
      <p>Pick a project and hit <strong>run</strong>.</p>
    </div>

    <div v-else class="agent-grid">
      <AgentPanel
        v-for="agent in agentList"
        :key="agent.id"
        :agent="agent"
        @stop="stopAgent"
        @dismiss="dismissAgent"
      />
    </div>
  </main>

  <NewProjectModal
    v-if="showNewProject"
    @close="showNewProject = false"
    @created="showNewProject = false"
  />

  <GitHubPanel
    v-if="showGitHub"
    @close="showGitHub = false"
  />

  <PendingPrdModal
    v-if="pendingProject"
    :project="pendingProject"
    @close="pendingProject = null"
    @promoted="pendingProject = null"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRalph } from './composables/useRalph.js'
import AgentPanel from './components/AgentPanel.vue'
import NewProjectModal from './components/NewProjectModal.vue'
import GitHubPanel from './components/GitHubPanel.vue'
import PendingPrdModal from './components/PendingPrdModal.vue'

const { projects, agents, connected, startAgent, stopAgent, dismissAgent } = useRalph()

const showNewProject = ref(false)
const showGitHub = ref(false)
const pendingProject = ref(null)

const agentList = computed(() => Object.values(agents))

const visibleProjects = computed(() =>
  projects.value.filter(p => !Object.values(agents).some(a => a.projectId === p.id))
)

function activeAgentForProject(projectId) {
  return Object.values(agents).find(a => a.projectId === projectId && a.status === 'running')
}

function completedTasks(project) {
  return project.tasks.filter(t => t.done).length
}
</script>

<style scoped>
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--border);
}

.logo {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
}

.conn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-dim);
  transition: background 0.3s;
}
.conn-dot.connected { background: var(--green); }

.sidebar-section {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.section-label {
  padding: 4px 14px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  margin-bottom: 4px;
}

.empty-hint { padding: 6px 14px; color: var(--text-dim); font-style: italic; }

.project-row {
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-left: 2px solid transparent;
  transition: background 0.1s;
}
.project-row:hover { background: var(--surface-2); }
.project-row.active { border-left-color: var(--green); }

.project-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.project-name {
  font-size: 12px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.project-tasks { font-size: 11px; color: var(--text-dim); }

.run-btn { margin-top: 4px; font-size: 11px; padding: 2px 8px; }

.review-btn {
  margin-top: 4px;
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(245,158,11,0.1);
  border-color: var(--yellow);
  color: var(--yellow);
}
.review-btn:hover { background: rgba(245,158,11,0.2); }

.sidebar-footer {
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.github-btn {
  width: 100%;
  font-size: 12px;
}

.main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-dim);
  text-align: center;
}
.empty-icon { font-size: 32px; opacity: 0.3; }

.agent-grid {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}
</style>
