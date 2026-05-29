import { ref, reactive, onMounted, onUnmounted } from 'vue'

export function useRalph() {
  const projects = ref([])
  const agents = reactive({})
  const connected = ref(false)
  let ws = null
  let reconnectTimer = null

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${protocol}//${location.host}/ws`)

    ws.onopen = () => {
      connected.value = true
      clearTimeout(reconnectTimer)
    }

    ws.onclose = () => {
      connected.value = false
      reconnectTimer = setTimeout(connect, 2000)
    }

    ws.onerror = () => ws.close()

    ws.onmessage = e => {
      try {
        handle(JSON.parse(e.data))
      } catch {}
    }
  }

  function handle(msg) {
    switch (msg.type) {
      case 'projects':
        projects.value = msg.data
        break

      case 'projects:refresh':
        fetch('/api/projects')
          .then(r => r.json())
          .then(data => { projects.value = data })
        break

      case 'agent:started':
        agents[msg.agentId] = {
          id: msg.agentId,
          projectId: msg.projectId,
          projectName: msg.projectName,
          githubSource: msg.githubSource ?? null,
          status: 'running',
          startedAt: Date.now(),
          iteration: 0,
          maxIterations: 30,
          cost: 0,
          logs: [],
        }
        break

      case 'agent:iteration':
        if (agents[msg.agentId]) {
          agents[msg.agentId].iteration = msg.iteration
          agents[msg.agentId].maxIterations = msg.maxIterations
        }
        break

      case 'agent:log':
        agents[msg.agentId]?.logs.push(msg.data)
        break

      case 'agent:cost':
        if (agents[msg.agentId]) agents[msg.agentId].cost = msg.cost
        break

      case 'agent:complete':
        if (agents[msg.agentId]) {
          agents[msg.agentId].status = msg.reason === 'complete' ? 'complete' : 'stopped'
        }
        break

      case 'agent:stderr':
        agents[msg.agentId]?.logs.push({ type: 'stderr', message: msg.message })
        break

      case 'agent:pr':
        if (agents[msg.agentId]) agents[msg.agentId].prUrl = msg.prUrl
        break
    }
  }

  function send(data) {
    if (ws?.readyState === 1) ws.send(JSON.stringify(data))
  }

  function startAgent(projectId) {
    send({ type: 'start', projectId })
  }

  function stopAgent(agentId) {
    send({ type: 'stop', agentId })
    if (agents[agentId]) agents[agentId].status = 'stopped'
  }

  function dismissAgent(agentId) {
    const agent = agents[agentId]
    if (agent?.githubSource) {
      fetch('/api/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubSource: agent.githubSource }),
      }).catch(() => {})
    }
    delete agents[agentId]
  }

  onMounted(connect)
  onUnmounted(() => {
    clearTimeout(reconnectTimer)
    ws?.close()
  })

  return { projects, agents, connected, startAgent, stopAgent, dismissAgent }
}
