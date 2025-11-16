import type { ModuleConfig } from './module'

export interface Scroll {
  id: string
  created_at: string
  user_id: string
  name: string
  type: string
  key: string
  status: string
  step: string
  modules: ModuleConfig[]
}
