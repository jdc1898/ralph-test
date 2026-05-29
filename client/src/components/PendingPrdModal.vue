<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <div class="issue-meta">
          <span class="repo">{{ project.githubSource?.repoFullName }}</span>
          <span class="issue-num">#{{ project.githubSource?.issueNumber }}</span>
        </div>
        <h2>{{ project.name }}</h2>
      </div>

      <div class="chat" ref="chatEl">
        <div v-for="(msg, i) in messages" :key="i" class="msg" :class="msg.role">
          <div class="bubble">{{ msg.text }}</div>
        </div>
        <div v-if="loading" class="msg assistant">
          <div class="bubble dim">thinking…</div>
        </div>
      </div>

      <div v-if="!done && !loading" class="field">
        <textarea
          v-model="replyText"
          rows="3"
          placeholder="Your answer… (Enter to send)"
          @keydown.enter.exact.prevent="sendReply"
          @keydown.ctrl.enter.prevent="sendReply"
          @keydown.meta.enter.prevent="sendReply"
        />
      </div>

      <div v-if="done" class="done-notice">✓ PRD complete — starting agent…</div>
      <div v-if="errMsg" class="err">{{ errMsg }}</div>

      <div class="actions">
        <button class="danger" :disabled="rejecting" @click="reject">reject</button>
        <button @click="$emit('close')">cancel</button>
        <button v-if="!done && !loading" class="primary" :disabled="!replyText.trim()" @click="sendReply">send</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  project: { type: Object, required: true },
})
const emit = defineEmits(['close', 'promoted'])

const messages = ref([])
const replyText = ref('')
const sessionId = ref(null)
const loading = ref(false)
const done = ref(false)
const errMsg = ref('')
const rejecting = ref(false)
const chatEl = ref(null)

onMounted(beginInterview)

async function scrollDown() {
  await nextTick()
  if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
}

async function beginInterview() {
  const { issueTitle, issueBody } = props.project.githubSource ?? {}
  const topic = [
    `GitHub Issue: ${issueTitle ?? props.project.name}`,
    issueBody ? `\n${issueBody}` : '',
    '\nI need to break this into concrete implementation tasks.',
  ].join('')

  loading.value = true
  messages.value.push({ role: 'user', text: `Issue: ${issueTitle ?? props.project.name}` })
  await scrollDown()

  try {
    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to start')

    sessionId.value = data.sessionId
    messages.value.push({ role: 'assistant', text: data.text })
    if (data.done) await finish(data.tasks)
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

    messages.value.push({ role: 'assistant', text: data.text.replace(/<tasks>[\s\S]*?<\/tasks>/, '').trim() })
    if (data.done) await finish(data.tasks)
  } catch (e) {
    errMsg.value = e.message
  } finally {
    loading.value = false
    await scrollDown()
  }
}

async function reject() {
  rejecting.value = true
  try {
    await fetch(`/api/projects/${props.project.id}`, { method: 'DELETE' })
    if (sessionId.value) fetch(`/api/interview/${sessionId.value}`, { method: 'DELETE' }).catch(() => {})
    emit('close')
  } catch (e) {
    errMsg.value = e.message
  } finally {
    rejecting.value = false
  }
}

async function finish(tasks) {
  done.value = true
  await scrollDown()

  try {
    await fetch(`/api/projects/${props.project.id}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    })
    emit('promoted')
  } catch (e) {
    errMsg.value = `Failed to promote: ${e.message}`
    done.value = false
  } finally {
    if (sessionId.value) {
      fetch(`/api/interview/${sessionId.value}`, { method: 'DELETE' }).catch(() => {})
    }
  }
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
  width: 640px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header { display: flex; flex-direction: column; gap: 4px; }

.issue-meta {
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: var(--text-dim);
}

.repo { color: var(--text-muted); }
.issue-num { color: var(--blue); }

h2 { font-size: 14px; font-weight: 600; color: var(--text); }

.chat {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  max-height: 360px;
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

.field { display: flex; flex-direction: column; }
textarea { resize: none; }

.done-notice { font-size: 12px; color: var(--green); }
.err { font-size: 12px; color: var(--red); }

.actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
