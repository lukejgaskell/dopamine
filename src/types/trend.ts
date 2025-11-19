import type { ModuleConfig } from './module'

export interface Trend {
  id: string
  created_at: string
  user_id: string
  name: string
  modules: ModuleConfig[]
}
