import { useState } from 'react'
import type { ModuleConfig } from '../../../../types/module'
import type { Idea } from '../../../../types/idea'
import { ModuleResultsRenderer } from '../results/ModuleResultsRenderer'
import './ScrollResults.css'

type ScrollResultsProps = {
  modules: ModuleConfig[]
  ideas: Idea[]
}

export function ScrollResults({ modules, ideas }: ScrollResultsProps) {
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0)

  // Get the active dataset_id for a module by looking at the last dataset builder before it
  const getActiveDatasetId = (moduleIndex: number): string | null => {
    for (let i = moduleIndex; i >= 0; i--) {
      const mod = modules[i] as any
      if (mod.type === 'dataset' || mod.type === 'brainstorm') {
        return mod.dataset_id || null
      }
    }
    return null
  }

  const getModuleTypeName = (type: string) => {
    const names: Record<string, string> = {
      brainstorm: 'Brainstorm',
      vote: 'Vote',
      weighted_vote: 'Weighted Vote',
      likert_vote: 'Rating',
      frame: 'Frame',
      rank_order: 'Rank Order',
      work_estimate: 'Work Estimate',
      grouping: 'Grouping',
    }
    return names[type] || type
  }

  const currentModule = modules[selectedModuleIndex]

  // Filter ideas for the current module based on its active dataset
  const activeDatasetId = getActiveDatasetId(selectedModuleIndex)
  const filteredIdeas = currentModule?.type === 'brainstorm' || currentModule?.type === 'dataset'
    ? ideas.filter(idea => idea.dataset_id === (currentModule as any).dataset_id)
    : ideas.filter(idea => idea.dataset_id === activeDatasetId)

  return (
    <div className="scroll-results">
      {modules.length > 1 && (
        <>
          {/* Desktop tabs */}
          <div className="module-tabs module-tabs-desktop">
            {modules.map((module, index) => (
              <button
                key={index}
                className={`module-tab ${selectedModuleIndex === index ? 'active' : ''}`}
                onClick={() => setSelectedModuleIndex(index)}
              >
                <span className="tab-number">{index + 1}</span>
                <span className="tab-name">{getModuleTypeName(module.type)}</span>
              </button>
            ))}
          </div>

          {/* Mobile dropdown */}
          <div className="module-tabs module-tabs-mobile">
            <select
              className="module-select"
              value={selectedModuleIndex}
              onChange={(e) => setSelectedModuleIndex(Number(e.target.value))}
            >
              {modules.map((module, index) => (
                <option key={index} value={index}>
                  {index + 1}. {getModuleTypeName(module.type)}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="results-content">
        {currentModule && <ModuleResultsRenderer module={currentModule} ideas={filteredIdeas} />}
      </div>
    </div>
  )
}
