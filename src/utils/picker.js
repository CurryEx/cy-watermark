/** 弹出系统文件选择框 */
export function pickFiles({ multiple = true, accept = 'image/*' } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0'
    document.body.appendChild(input)
    const cleanup = () => setTimeout(() => input.remove(), 0)
    input.addEventListener(
      'change',
      () => {
        const files = Array.from(input.files || [])
        cleanup()
        resolve(files)
      },
      { once: true },
    )
    input.addEventListener(
      'cancel',
      () => {
        cleanup()
        resolve([])
      },
      { once: true },
    )
    input.click()
  })
}
