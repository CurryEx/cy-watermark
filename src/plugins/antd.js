/**
 * Ant Design Vue 按需注册
 * 只注册项目实际用到的组件，避免把整个组件库（~1.5MB）打进包里。
 * 注意：ant-design-vue 4.x 没有 ColorPicker 组件，颜色选择用自绘的 ColorField。
 */
import {
  Alert,
  Button,
  Collapse,
  ConfigProvider,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Input,
  InputNumber,
  Menu,
  Modal,
  Progress,
  Segmented,
  Select,
  Slider,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
} from 'ant-design-vue'

// 注意：Button / Collapse / Descriptions / Input 的 install 会自动带上
// ButtonGroup / CollapsePanel / DescriptionsItem / Textarea，不要重复注册。
const components = [
  Alert,
  Button,
  Collapse,
  ConfigProvider,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Input,
  InputNumber,
  Menu,
  Modal,
  Progress,
  Segmented,
  Select,
  Slider,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
]

export default {
  install(app) {
    components.forEach((c) => {
      if (!c) return
      if (typeof c.install === 'function') app.use(c)
      else if (c.name) app.component(c.name, c)
    })
  },
}
