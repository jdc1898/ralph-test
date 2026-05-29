<template>
  <div class="overlay" @click.self="handleClose">
    <div class="modal" :class="{ wide: mode === 'interview' }">
      <h2>{{ mode === 'interview' ? 'interview' : 'new project' }}</h2>

      <div class="field">
        <label>project name</label>
        <input v-model="name" placeholder="e.g. snackbar-webshop" />
      </div>

      <!-- manual mode -->
      <template v-if="mode === 'manual'">
        <div class="field">
          <label>tasks (one per line)</label>
          <textarea v-model="tasksRaw" rows="8"
            placeholder="Set up Vue 3 project with Vite&#10;Create a homepage layout&#10;Add dark mode toggle" />
        </div>
        <div class="hint">
          not sure what tasks to add?
          <button class="link-btn" @click="enterInterview">grill me instead</button>
        </div>
        <div class="actions">
          <button @click="$emit('close')">cancel</button>
          <button class="primary" :disabled="!canSubmit" @click="submit">create project</button>
        </div>
      </template>

      <!-- interview mode -->
      <template v-else>
        <div v-if="!sessionId" class="field">
          <label>describe your plan</label>
          <textarea v-model="topic" rows="4" autofocus
            placeholder="I want to build a dashboard that shows real-time metrics..." />
        </div>

        <div v-if="messages.length" class="chat" ref="chatEl">
          <div v-for="(msg, i) in messages" :key="i" class="msg" :class="msg.role">
            <div class="bubble" :class="{ dim: msg.role === 'assistant' && loading && i === messages.length - 1 }">
              {{ msg.role === 'assistant' ? stripTasks(msg.text) : msg.text }}
            </div>
          </div>
          <div v-if="loading" class="msg assistant">
            <div class="bubble dim">thinking…</div>
          </div>
        </div>

        <div v-if="sessionId && !done && !loading" class="field">
          <textarea v-model="replyText" rows="3"
            placeholder="Your answer… (Enter to send, Shift+Enter for newline)"
            @keydown.enter.exact.prevent="sendReply"
            @keydown.ctrl.enter.prevent="sendReply"
            @keydown.meta.enter.prevent="sendReply" />
        </div>

        <div v-if="done" class="done-notice">✓ tasks generated — switching to review…</div>
        <div v-if="errMsg" class="err">{{ errMsg }}</div>

        <div class="actions">
          <button @click="exitInterview">← back</button>
          <button v-if="!sessionId" class="primary"
            :disabled="!topic.trim() || loading"
            @click="beginInterview">start interview</button>
          <button v-else-if="!done && !loading" class="primary"
            :disabled="!replyText.trim()"
            @click="sendReply">send</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const emit = defineEmits(['close', 'created'])

const mode = ref('manual')
const name = ref('')
const tasksRaw = ref('')

const topic = ref('')
const sessionId = ref(null)
const messages = ref([])
const replyText = ref('')
const loading = ref(false)
const done = ref(false)
const errMsg = ref('')
const chatEl = ref(null)

const tasks = computed(() =>
  tasksRaw.value.split('\n').map(t => t.trim()).filter(Boolean)
)
const canSubmit = computed(() => name.value.trim() && tasks.value.length > 0)

function handleClose() {
  cleanupSession()
  emit('close')
}

function enterInterview() {
  mode.value = 'interview'
}

function exitInterview() {
  cleanupSession()
  mode.value = 'manual'
}

function cleanupSession() {
  if (sessionId.value) {
    fetch(`/api/interview/${sessionId.value}`, { method: 'DELETE' }).catch(() => {})
    sessionId.value = null
  }
  messages.value = []
  replyText.value = ''
  done.value = false
  errMsg.value = ''
}

async function scrollDown() {
  await nextTick()
  if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
}

async function beginInterview() {
  if (!topic.value.trim()) return
  errMsg.value = ''
  loading.value = true
  messages.value.push({ role: 'user', text: topic.value.trim() })
  await scrollDown()

  try {
    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.value.trim() }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to start interview')

    sessionId.value = data.sessionId
    messages.value.push({ role: 'assistant', text: data.text })
    if (data.done) finish(data.tasks)
  } catch (e) {
    errMsg.value = e.message
  } finally {
    loading.value = false
    await scrollDown()
  }
}

async function sendReply() {
  if (!replyText.value.trim() || loading.value) return
  const answer = replyText.value.trim()
  replyText.value = ''
  errMsg.value = ''
  loading.value = true
  messages.value.push({ role: 'user', text: answer })
  await scrollDown()

  try {
    const res = await fetch(`/api/interview/${sessionId.value}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')

    messages.value.push({ role: 'assistant', text: data.text })
    if (data.done) finish(data.tasks)
  } catch (e) {
    errMsg.value = e.message
  } finally {
    loading.value = false
    await scrollDown()
  }
}

function finish(generatedTasks) {
  done.value = true
  tasksRaw.value = generatedTasks.join('\n')
  setTimeout(() => {
    mode.value = 'manual'
    done.value = false
  }, 1800)
}

function stripTasks(text) {
  return text.replace(/<tasks>[\s\S]*?<\/tasks>/, '').trim()
}

async function submit() {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.value.trim(), tasks: tasks.value }),
  })
  const project = await res.json()
  emit('created', project)
  emit('close')
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

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  width: 480px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal.wide { width: 640px; }

h2 { color: var(--text); font-size: 15px; font-weight: 600; }

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }

textarea { resize: vertical; }

.hint {
  font-size: 12px;
  color: var(--text-dim);
}

.link-btn {
  background: none;
  border: none;
  color: var(--blue);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  text-decoration: underline;
}
.link-btn:hover { color: #60a5fa; background: none; border: none; }

.chat {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  max-height: 340px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.msg.assistant { justify-content: flex-start; }

.bubble {
  max-width: 82%;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg.user .bubble {
  background: var(--blue);
  color: #fff;
  border-radius: 8px 8px 2px 8px;
}

.msg.assistant .bubble {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px 8px 8px 2px;
}

.bubble.dim { color: var(--text-dim); font-style: italic; }

.done-notice {
  font-size: 12px;
  color: var(--green);
}

.err {
  font-size: 12px;
  color: var(--red);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
