/**
 * JPEG EXIF 处理
 *
 * 工具链本身是"画到 canvas 再编码"，天然就会丢掉全部元数据（EXIF / GPS / 拍摄信息）。
 * 这里额外提供两件事：
 *  1. extractJpegExif / injectJpegExif —— 当用户显式勾选"保留 EXIF"时，
 *     把原图的 APP1(Exif) 段原样搬回导出结果里。
 *  2. neutralizeOrientation —— 像素已经按照 EXIF 方向摆正了，若原样搬回
 *     Orientation 标签，看图软件会再旋转一次，所以搬回前把方向强制改成 1。
 *  3. parseExif —— 只读解析常用字段，用于界面展示。
 */

/* ----------------------------- 基础读写 ----------------------------- */

const TAG_NAMES = {
  0x0100: 'ImageWidth',
  0x0101: 'ImageHeight',
  0x010e: 'ImageDescription',
  0x010f: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x011a: 'XResolution',
  0x011b: 'YResolution',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x013b: 'Artist',
  0x8298: 'Copyright',
  0x829a: 'ExposureTime',
  0x829d: 'FNumber',
  0x8769: 'ExifIFD',
  0x8822: 'ExposureProgram',
  0x8827: 'ISO',
  0x8825: 'GPSIFD',
  0x9000: 'ExifVersion',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x9201: 'ShutterSpeedValue',
  0x9202: 'ApertureValue',
  0x9204: 'ExposureBiasValue',
  0x9207: 'MeteringMode',
  0x9209: 'Flash',
  0x920a: 'FocalLength',
  0x927c: 'MakerNote',
  0x9286: 'UserComment',
  0xa001: 'ColorSpace',
  0xa002: 'PixelXDimension',
  0xa003: 'PixelYDimension',
  0xa405: 'FocalLengthIn35mmFilm',
  0xa430: 'CameraOwnerName',
  0xa431: 'BodySerialNumber',
  0xa432: 'LensSpecification',
  0xa433: 'LensMake',
  0xa434: 'LensModel',
}

const TYPE_SIZE = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  6: 1, // SBYTE
  7: 1, // UNDEFINED
  8: 2, // SSHORT
  9: 4, // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
}

const GPS_TAGS = {
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude',
  0x0007: 'GPSTimeStamp',
  0x001d: 'GPSDateStamp',
}

/* ------------------------- 段提取 / 回填 ------------------------- */

/**
 * 从 JPEG ArrayBuffer 中提取 APP1(Exif) 段
 * @returns {Uint8Array|null} 完整的段（含 FFE1 + 长度字节）
 */
export function extractJpegExif(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer)
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null
    const len = view.byteLength
    let offset = 2
    while (offset < len - 1) {
      if (view.getUint8(offset) !== 0xff) {
        offset++
        continue
      }
      const marker = view.getUint8(offset + 1)
      if (marker === 0xff) {
        offset++
        continue
      }
      // 无长度字段的标记
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2
        continue
      }
      if (marker === 0xda) break // SOS，后面是压缩数据
      if (offset + 4 > len) break
      const size = view.getUint16(offset + 2)
      if (marker === 0xe1) {
        const dataStart = offset + 4
        // "Exif\0\0"
        if (
          dataStart + 6 <= len &&
          view.getUint8(dataStart) === 0x45 &&
          view.getUint8(dataStart + 1) === 0x78 &&
          view.getUint8(dataStart + 2) === 0x69 &&
          view.getUint8(dataStart + 3) === 0x66 &&
          view.getUint8(dataStart + 4) === 0x00 &&
          view.getUint8(dataStart + 5) === 0x00
        ) {
          return new Uint8Array(arrayBuffer.slice(offset, offset + size + 2))
        }
      }
      offset += 2 + size
    }
  } catch {
    /* 忽略损坏的 EXIF */
  }
  return null
}

/**
 * 把 EXIF 段插回 JPEG 的 SOI 之后
 * @param {ArrayBuffer} jpegBuffer 导出的 JPEG 数据
 * @param {Uint8Array} segment     extractJpegExif 得到的段
 * @returns {ArrayBuffer}
 */
export function injectJpegExif(jpegBuffer, segment) {
  if (!segment || segment.byteLength === 0) return jpegBuffer
  const src = new Uint8Array(jpegBuffer)
  if (src.byteLength < 2 || src[0] !== 0xff || src[1] !== 0xd8) return jpegBuffer
  const out = new Uint8Array(src.byteLength + segment.byteLength)
  out.set(src.subarray(0, 2), 0) // SOI
  out.set(segment, 2) // APP1
  out.set(src.subarray(2), 2 + segment.byteLength)
  return out.buffer
}

/* ------------------------------ 解析 ------------------------------ */

function readIfd(dv, le, ifdStart, out, visited) {
  if (ifdStart <= 0 || ifdStart >= dv.byteLength || visited.has(ifdStart)) return
  visited.add(ifdStart)

  const count = dv.getUint16(ifdStart, le)
  for (let i = 0; i < count; i++) {
    const entry = ifdStart + 2 + i * 12
    if (entry + 12 > dv.byteLength) return
    const tag = dv.getUint16(entry, le)
    const type = dv.getUint16(entry + 2, le)
    const num = dv.getUint32(entry + 4, le)
    const size = (TYPE_SIZE[type] || 1) * num
    const valueOffset = size > 4 ? dv.getUint32(entry + 8, le) : entry + 8

    if (tag === 0x8769 || tag === 0x8825) {
      readIfd(dv, le, dv.getUint32(entry + 8, le), out, visited)
      continue
    }
    if (tag === 0x927c || tag === 0x9286) continue // MakerNote / UserComment 噪音大，跳过

    const name = TAG_NAMES[tag] || GPS_TAGS[tag]
    if (!name) continue
    if (valueOffset + size > dv.byteLength) continue

    const value = readValue(dv, le, type, num, valueOffset, tag)
    if (value !== null && value !== undefined && value !== '') out[name] = value
  }
}

function readValue(dv, le, type, num, offset, tag) {
  const vals = []
  for (let i = 0; i < Math.min(num, 32); i++) {
    switch (type) {
      case 1:
      case 7:
        vals.push(dv.getUint8(offset + i))
        break
      case 6:
        vals.push(dv.getInt8(offset + i))
        break
      case 3:
        vals.push(dv.getUint16(offset + i * 2, le))
        break
      case 8:
        vals.push(dv.getInt16(offset + i * 2, le))
        break
      case 4:
        vals.push(dv.getUint32(offset + i * 4, le))
        break
      case 9:
        vals.push(dv.getInt32(offset + i * 4, le))
        break
      case 5:
        vals.push([dv.getUint32(offset + i * 8, le), dv.getUint32(offset + i * 8 + 4, le)])
        break
      case 10:
        vals.push([dv.getInt32(offset + i * 8, le), dv.getInt32(offset + i * 8 + 4, le)])
        break
      case 11:
        vals.push(dv.getFloat32(offset + i * 4, le))
        break
      case 12:
        vals.push(dv.getFloat64(offset + i * 8, le))
        break
      case 2: {
        let str = ''
        for (let j = 0; j < num; j++) {
          const c = dv.getUint8(offset + j)
          if (c === 0) break
          str += String.fromCharCode(c)
        }
        return str.trim()
      }
      default:
        return null
    }
  }
  return formatValue(tag, vals)
}

function formatValue(tag, vals) {
  const first = vals[0]
  const rat = (r) => (Array.isArray(r) ? (r[1] ? r[0] / r[1] : 0) : Number(r) || 0)

  switch (tag) {
    case 0x829a: {
      const v = rat(first)
      if (!v) return null
      return v >= 1 ? `${Math.round(v * 10) / 10}s` : `1/${Math.round(1 / v)}s`
    }
    case 0x829d:
      return `f/${Math.round(rat(first) * 10) / 10}`
    case 0x920a:
      return `${Math.round(rat(first))}mm`
    case 0xa432:
      return vals
        .slice(0, 4)
        .filter((v) => rat(v))
        .map((v) => Math.round(rat(v)))
        .join('-')
    case 0x9204: {
      const v = rat(first)
      return `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}EV`
    }
    case 0x8827:
      return `ISO ${first}`
    default:
      if (Array.isArray(first)) return vals.map((v) => Math.round(rat(v) * 100) / 100).join(', ')
      if (typeof first === 'number') return vals.length === 1 ? first : vals.join(', ')
      return String(first ?? '')
  }
}

function dmsToDeg(vals, ref) {
  if (!Array.isArray(vals) || vals.length < 3) return null
  const rat = (r) => (r[1] ? r[0] / r[1] : 0)
  let deg = rat(vals[0]) + rat(vals[1]) / 60 + rat(vals[2]) / 3600
  if (!Number.isFinite(deg)) return null
  if (ref === 'S' || ref === 'W') deg = -deg
  return Math.round(deg * 1e6) / 1e6
}

/** 解析 JPEG 的 EXIF（只解析常用字段，失败返回 {}） */
export function parseExif(arrayBuffer) {
  const result = {}
  try {
    const seg = extractJpegExif(arrayBuffer)
    if (!seg) return result
    const dv = new DataView(seg.buffer, seg.byteOffset, seg.byteLength)
    const tiff = 10
    if (tiff + 8 > seg.byteLength) return result
    const b0 = dv.getUint8(tiff)
    const b1 = dv.getUint8(tiff + 1)
    if (!((b0 === 0x49 && b1 === 0x49) || (b0 === 0x4d && b1 === 0x4d))) return result
    const le = b0 === 0x49
    if (dv.getUint16(tiff + 2, le) !== 0x002a) return result

    const raw = {}
    readIfd(dv, le, tiff + dv.getUint32(tiff + 4, le), raw, new Set())

    // GPS 转十进制度
    const lat = dmsToDeg(raw.GPSLatitude, raw.GPSLatitudeRef)
    const lon = dmsToDeg(raw.GPSLongitude, raw.GPSLongitudeRef)
    if (lat !== null && lon !== null) result.GPS = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
    if (raw.GPSAltitude != null) {
      const alt = Array.isArray(raw.GPSAltitude)
        ? raw.GPSAltitude[0] / (raw.GPSAltitude[1] || 1)
        : raw.GPSAltitude
      result.GPSAltitude = `${Math.round(alt)}m`
    }

    const keys = [
      'Make',
      'Model',
      'LensModel',
      'Software',
      'Artist',
      'Copyright',
      'ImageDescription',
      'DateTimeOriginal',
      'DateTime',
      'ExposureTime',
      'FNumber',
      'ISO',
      'ExposureBiasValue',
      'FocalLength',
      'FocalLengthIn35mmFilm',
      'BodySerialNumber',
      'CameraOwnerName',
      'PixelXDimension',
      'PixelYDimension',
      'Orientation',
    ]
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') result[k] = raw[k]
    }
    return result
  } catch {
    return {}
  }
}

/** 把 Orientation 强制改为 1（像素已摆正，避免看图软件二次旋转） */
export function neutralizeOrientation(segment) {
  try {
    const dv = new DataView(segment.buffer, segment.byteOffset, segment.byteLength)
    const tiff = 10
    const b0 = dv.getUint8(tiff)
    const le = b0 === 0x49
    const ifd0 = tiff + dv.getUint32(tiff + 4, le)
    const count = dv.getUint16(ifd0, le)
    for (let i = 0; i < count; i++) {
      const entry = ifd0 + 2 + i * 12
      if (dv.getUint16(entry, le) === 0x0112) {
        dv.setUint16(entry + 8, 1, le)
        return true
      }
    }
  } catch {
    /* ignore */
  }
  return false
}

export const EXIF_FIELD_LABELS = {
  Make: '厂商',
  Model: '机型',
  LensModel: '镜头',
  Software: '软件',
  Artist: '作者',
  Copyright: '版权',
  ImageDescription: '图像描述',
  DateTimeOriginal: '拍摄时间',
  DateTime: '修改时间',
  ExposureTime: '快门',
  FNumber: '光圈',
  ISO: '感光度',
  ExposureBiasValue: '曝光补偿',
  FocalLength: '焦距',
  FocalLengthIn35mmFilm: '等效焦距',
  BodySerialNumber: '机身序列号',
  CameraOwnerName: '机主',
  PixelXDimension: '记录宽度',
  PixelYDimension: '记录高度',
  Orientation: '方向',
  GPS: 'GPS 坐标',
  GPSAltitude: '海拔',
}
