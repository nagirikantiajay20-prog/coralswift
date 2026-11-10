/** One system setting. `value` is null when the key is settable but nothing is stored. */
export interface SettingItem {
  key: string
  value: string | null
  stored: boolean
  /** Looks like a credential: value is masked and never prefilled. */
  sensitive: boolean
  /** Listed by the backend as settable (or already stored). */
  editable: boolean
}

export interface SettingsView {
  items: SettingItem[]
  /** Top-level keys of the response, shown when the shape is not recognised. */
  responseKeys: string[]
}
