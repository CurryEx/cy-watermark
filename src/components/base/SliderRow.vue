<script setup>
import { computed } from 'vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'

const value = defineModel('value', { default: 0 })

const props = defineProps({
  label: { type: String, default: '' },
  tip: { type: String, default: '' },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  inputStep: { type: Number, default: 0 },
  suffix: { type: String, default: '' },
  digits: { type: Number, default: -1 },
  disabled: { type: Boolean, default: false },
  showInput: { type: Boolean, default: true },
  help: { type: String, default: '' },
  warn: { type: Boolean, default: false },
})

const fmt = (v) => {
  const n = Number(v)
  const shown = props.digits >= 0 ? n.toFixed(props.digits) : Math.round(n * 100) / 100
  return `${shown}${props.suffix}`
}

const inputStep = computed(() => props.inputStep || props.step)
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
      <a-input-number
        v-if="showInput"
        :value="value"
        size="small"
        class="field-number"
        :min="min"
        :max="max"
        :step="inputStep"
        :disabled="disabled"
        @update:value="(v) => (value = v ?? min)"
      />
    </div>
    <a-slider
      :value="value"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :tooltip-formatter="fmt"
      @update:value="(v) => (value = v)"
    />
    <div v-if="help" class="field-hint" :class="{ 'is-warn': warn }">{{ help }}</div>
  </div>
</template>

<style scoped>
.tip-icon {
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: help;
}
.field-number {
  width: 76px;
}
.field-number :deep(.ant-input-number-input) {
  font-variant-numeric: tabular-nums;
}
</style>
