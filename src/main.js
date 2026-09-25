import { createApp } from 'vue'
import 'ant-design-vue/dist/reset.css'
import Antd from './plugins/antd.js'
import './styles/main.css'
import App from './App.vue'

createApp(App).use(Antd).mount('#app')
