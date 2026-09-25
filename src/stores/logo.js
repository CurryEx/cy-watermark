/** 图片水印（Logo）状态 */
import { reactive } from 'vue'
import { decodeToBitmap, isImageFile, makeThumbnail } from '../utils/image.js'

export const logo = reactive({
  file: null,
  name: '',
  bitmap: null,
  thumb: '',
})

export async function setLogoFile(file) {
  if (!isImageFile(file)) throw new Error('请选择图片文件')
  clearLogo()
  const bitmap = await decodeToBitmap(file)
  logo.file = file
  logo.name = file.name
  logo.bitmap = bitmap
  logo.thumb = makeThumbnail(bitmap, 300)
  return logo
}

export function clearLogo() {
  logo.bitmap?.close?.()
  logo.file = null
  logo.name = ''
  logo.bitmap = null
  logo.thumb = ''
}
