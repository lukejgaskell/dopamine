import type { ModuleConfig } from './module'

export type Trend = {
  id: string
  created_at: string
  user_id: string
  name: string
  modules: ModuleConfig[]
}
