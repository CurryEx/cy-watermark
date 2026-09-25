<script setup>
import { QuestionCircleOutlined } from '@ant-design/icons-vue'

const value = defineModel('value', { default: false })

defineProps({
  label: { type: String, default: '' },
  tip: { type: String, default: '' },
  help: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
</script>

<template>
  <div class="field">
    <div class="field-head">
      <span class="field-label">
        {{ label }}
        <a-tooltip v-if="tip" :title="tip">
          <QuestionCircleOutlined class="tip-icon" />
        </a-tooltip>
      </span>
      <a-switch
        :checked="value"
        size="small"
        :disabled="disabled"
        @update:checked="(v) => (value = v)"
      />
    </div>
    <slot />
    <div v-if="help" class="field-hint">{{ help }}</div>
  </div>
</template>

<style scoped>
.tip-icon {
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: help;
}
</style>
