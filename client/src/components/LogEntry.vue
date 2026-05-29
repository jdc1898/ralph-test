<template>
  <div class="log-entry" :class="kind">
    <span class="prefix">{{ prefix }}</span>
    <span class="body">{{ body }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ data: Object })

const kind = computed(() => {
  const { type, subtype } = props.data
  if (type === 'result') return subtype === 'error' ? 'error' : 'result'
  if (type === 'system') return 'system'
  if (type === 'assistant') {
    const content = props.data.message?.content?.[0]
    if (content?.type === 'tool_use') return 'tool'
    if (content?.type === 'thinking') return 'thinking'
    return 'assistant'
  }
  if (type === 'user') return 'tool-result'
  if (type === 'stderr') return 'error'
  return 'dim'
})

const prefix = computed(() => {
  const { type, subtype } = props.data
  if (type === 'system') return '⬡'
  if (type === 'result') return subtype === 'error' ? '✗' : '✓'
  if (type === 'assistant') {
    const content = props.data.message?.content?.[0]
    return content?.type === 'tool_use' ? '⚙' : '›'
  }
  if (type === 'user') return '◁'
  if (type === 'stderr') return '!'
  return '·'
})

const body = computed(() => {
  const { type, message, result, subtype } = props.data
  if (type === 'stderr') return props.data.message

  if (type === 'system' && subtype === 'init') return `model: ${props.data.model}`

  if (type === 'result') {
    const cost = props.data.total_cost_usd != null
      ? `  $${props.data.total_cost_usd.toFixed(4)}`
      : ''
    return (result ?? 'done').slice(0, 200) + cost
  }

  if (type === 'assistant') {
    const content = message?.content
    if (!content?.length) return ''
    const parts = []
    for (const block of content) {
      if (block.type === 'thinking') {
        parts.push(block.thinking?.replace(/\n/g, ' ').slice(0, 80) + '…')
      }
      if (block.type === 'text') parts.push(block.text.trim())
      if (block.type === 'tool_use') {
        const detail = block.input?.file_path ?? block.input?.command ?? block.input?.query ?? JSON.stringify(block.input ?? {})
        parts.push(`${block.name}: ${detail}`)
      }
    }
    return parts.join('  ').slice(0, 300)
  }

  if (type === 'user') {
    const content = message?.content
    if (!content?.length) return ''
    const block = content[0]
    if (block?.type === 'tool_result') {
      const inner = Array.isArray(block.content)
        ? block.content.map(c => c.text ?? '').join('\n')
        : String(block.content ?? '')
      return inner.slice(0, 250)
    }
    return ''
  }

  return ''
})
</script>

<style scoped>
.log-entry {
  display: flex;
  gap: 8px;
  padding: 2px 4px;
  line-height: 1.5;
  color: var(--text-muted);
  border-radius: 3px;
  overflow: hidden;
}
.prefix {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
  opacity: 0.7;
}
.body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  flex: 1;
  min-width: 0;
}
.assistant { color: var(--text); }
.tool { background: rgba(245,158,11,0.06); }
.tool .prefix, .tool .body { color: var(--yellow); }
.tool-result .prefix, .tool-result .body { color: var(--blue); opacity: 0.85; }
.result.error, .error { color: var(--red); }
.result:not(.error) { color: var(--green); }
.system { color: var(--text-dim); font-style: italic; }
.thinking { color: var(--purple); opacity: 0.65; font-style: italic; }
</style>
