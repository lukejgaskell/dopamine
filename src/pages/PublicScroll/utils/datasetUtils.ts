import type { ModuleConfig } from '../../../types/module'

export function getActiveDatasetId(
  modules: ModuleConfig[],
  currentModuleIndex: number
): string | null {
  for (let i = currentModuleIndex; i >= 0; i--) {
    const mod = modules[i] as any
    if (mod.type === 'dataset' || mod.type === 'brainstorm') {
      return mod.dataset_id || null
    }
  }
  return null
}

export function isVotingModule(moduleType: string): boolean {
  return [
    'vote',
    'weighted_vote',
    'likert_vote',
    'work_estimate',
    'rank_order',
  ].includes(moduleType)
}
