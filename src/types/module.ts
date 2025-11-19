export type ModuleType =
  | 'brainstorm'
  | 'dataset'
  | 'vote'
  | 'weighted_vote'
  | 'likert_vote'
  | 'rank_order'
  | 'work_estimate'
  | 'grouping'

export interface TimerState {
  isRunning: boolean
  startedAt: string | null // ISO timestamp when timer was started
  pausedAt: number | null // seconds remaining when paused
}

// Result types for each module
export interface VoteResult {
  oddeaId: string
  count: number
}

export interface UserVoteResult {
  oddeaId: string
  oddeaIds: string[]
}

export interface UserRatingResult {
  oddeaId: string
  rating: number
}

export interface UserWeightedVoteResult {
  oddeaId: string
  points: number
}

export interface UserRankingResult {
  oddeaId: string
  rank: number
}

export interface UserEstimateResult {
  oddeaId: string
  estimate: number
}

export interface GroupResult {
  id: string
  name: string
  itemIds: string[]
}

export interface ModuleResults {
  // Map of oddeaId to userId to their response
  votes?: Record<string, string[]> // oddeaId -> userId[]
  ratings?: Record<string, Record<string, number>> // userId -> { oddeaId -> rating }
  weightedVotes?: Record<string, Record<string, number>> // userId -> { oddeaId -> points }
  rankings?: Record<string, string[]> // userId -> [oddeaIds in order]
  estimates?: Record<string, Record<string, number>> // userId -> { oddeaId -> estimate }
  groups?: Record<string, GroupResult[]> // userId -> groups
}

export interface BaseModuleConfig {
  type: ModuleType
  prompt?: string
  timerState?: TimerState
  results?: ModuleResults
}

export interface BrainstormModuleConfig extends BaseModuleConfig {
  type: 'brainstorm'
  timeLimit?: number // in minutes
  allowAnonymous?: boolean
}

export interface DatasetModuleConfig extends BaseModuleConfig {
  type: 'dataset'
  datasetId: string
  datasetName: string
}

export interface VoteModuleConfig extends BaseModuleConfig {
  type: 'vote'
  maxVotesPerUser?: number
}

export interface WeightedVoteModuleConfig extends BaseModuleConfig {
  type: 'weighted_vote'
  totalPoints?: number
  maxPointsPerItem?: number
}

export interface LikertVoteModuleConfig extends BaseModuleConfig {
  type: 'likert_vote'
  scale?: number // default 5
  lowLabel?: string
  highLabel?: string
}

export interface RankOrderModuleConfig extends BaseModuleConfig {
  type: 'rank_order'
  maxItems?: number
}

export interface WorkEstimateModuleConfig extends BaseModuleConfig {
  type: 'work_estimate'
  estimateType?: 'hours' | 'days' | 'points' | 'tshirt'
}

export interface GroupingModuleConfig extends BaseModuleConfig {
  type: 'grouping'
  maxGroups?: number
}

export type ModuleConfig =
  | BrainstormModuleConfig
  | DatasetModuleConfig
  | VoteModuleConfig
  | WeightedVoteModuleConfig
  | LikertVoteModuleConfig
  | RankOrderModuleConfig
  | WorkEstimateModuleConfig
  | GroupingModuleConfig

export type ModuleCategory = 'datasetBuilder' | 'analysis'

export const MODULE_DEFINITIONS = {
  brainstorm: {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Collect ideas from participants',
    category: 'datasetBuilder' as ModuleCategory,
    defaultConfig: {
      type: 'brainstorm' as const,
      timeLimit: 10,
      allowAnonymous: false,
    }
  },
  vote: {
    id: 'vote',
    name: 'Vote',
    description: 'Simple up/down voting',
    category: 'analysis' as ModuleCategory,
    defaultConfig: {
      type: 'vote' as const,
      maxVotesPerUser: 3,
    }
  },
  weighted_vote: {
    id: 'weighted_vote',
    name: 'Weighted Vote',
    description: 'Vote with point allocation',
    category: 'analysis' as ModuleCategory,
    defaultConfig: {
      type: 'weighted_vote' as const,
      totalPoints: 10,
      maxPointsPerItem: 5,
    }
  },
  likert_vote: {
    id: 'likert_vote',
    name: 'Likert Vote',
    description: 'Rate on a scale (1-5)',
    category: 'analysis' as ModuleCategory,
    defaultConfig: {
      type: 'likert_vote' as const,
      scale: 5,
      lowLabel: 'Low',
      highLabel: 'High',
    }
  },
  rank_order: {
    id: 'rank_order',
    name: 'Rank Order',
    description: 'Order items by preference',
    category: 'analysis' as ModuleCategory,
    defaultConfig: {
      type: 'rank_order' as const,
      maxItems: 10,
    }
  },
  work_estimate: {
    id: 'work_estimate',
    name: 'Work Estimate',
    description: 'Estimate effort for items',
    category: 'analysis' as ModuleCategory,
    defaultConfig: {
      type: 'work_estimate' as const,
      estimateType: 'hours' as const,
    }
  },
  grouping: {
    id: 'grouping',
    name: 'Grouping',
    description: 'Organize items into categories',
    category: 'analysis' as ModuleCategory,
    defaultConfig: {
      type: 'grouping' as const,
      maxGroups: 5,
    }
  },
}
