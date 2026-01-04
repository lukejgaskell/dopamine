import type { ModuleConfig } from './module'

export type Scroll = {
  id: string
  created_at: string
  user_id: string
  name: string
  key: string
  status: string
  step: string
  modules: ModuleConfig[]
}
