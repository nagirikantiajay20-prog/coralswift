import type { SettingItem, SettingsView } from '../types'

const SENSITIVE = /pass(word|wd)?|secret|token|api[_-]?key|credential|smtp|private|signature/i
export const MASK = '••••••••'
export const isSensitiveKey = (k: string) => SENSITIVE.test(k)

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const STORED_KEYS = ['stored', 'settings', 'values', 'current']
const SETTABLE_KEYS = [
  'keys',
  'available_keys',
  'allowed_keys',
  'settable_keys',
  'settable',
  'available',
]

const show = (v: unknown) =>
  v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v)

/**
 * GET /admin/settings is an untyped dict ("stored settings and the keys that can be set").
 * The exact shape is NOT in the spec, so this accepts the plausible layouts defensively:
 * a stored map under `stored|settings|values|current` (or the dict itself when flat) plus an optional
 * list/map of settable keys. Unknown shapes yield no items (and the response keys for diagnosis).
 */
export function normalizeSettings(data: unknown): SettingsView {
  if (!isObj(data)) return { items: [], responseKeys: [] }
  const responseKeys = Object.keys(data)
  const storedHolder = STORED_KEYS.map((k) => data[k]).find(isObj)
  const settableRaw = SETTABLE_KEYS.map((k) => data[k]).find((v) => Array.isArray(v) || isObj(v))
  const flat =
    !storedHolder &&
    !settableRaw &&
    Object.values(data).every((v) => !isObj(v) && !Array.isArray(v))
  const stored: Record<string, unknown> = storedHolder ?? (flat ? data : {})
  const settable = Array.isArray(settableRaw)
    ? settableRaw.map((e) => (isObj(e) ? String(e.key ?? e.name ?? '') : String(e))).filter(Boolean)
    : isObj(settableRaw)
      ? Object.keys(settableRaw)
      : []
  const keys = [...new Set([...Object.keys(stored), ...settable])].sort()
  const items: SettingItem[] = keys.map((key) => ({
    key,
    stored: key in stored,
    value: key in stored ? show(stored[key]) : null,
    sensitive: isSensitiveKey(key),
    editable: true,
  }))
  return { items, responseKeys }
}

/** Display value: sensitive values are never rendered. */
export const displayValue = (i: SettingItem) =>
  i.value === null ? 'Not set' : i.sensitive ? MASK : i.value

export const filterSettings = (items: SettingItem[], q: string) => {
  const s = q.trim().toLowerCase()
  return s
    ? items.filter(
        (i) =>
          i.key.toLowerCase().includes(s) ||
          (!i.sensitive && (i.value ?? '').toLowerCase().includes(s)),
      )
    : items
}
