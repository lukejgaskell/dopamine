import { useState } from 'react'
import type { ModuleConfig } from '../types/module'
import type { Idea } from '../types/idea'
import ModuleResultsRenderer from './results/ModuleResultsRenderer'
import './ScrollResults.css'

interface ScrollResultsProps {
  modules: ModuleConfig[]
  ideas: Idea[]
}

export default function ScrollResults({ modules, ideas }: ScrollResultsProps) {
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0)

  // Debug: log what we're receiving
  console.log('ScrollResults - modules:', modules)
  console.log('ScrollResults - ideas:', ideas)

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

  return (
    <div className="scroll-results">
      {modules.length > 1 && (
        <div className="module-tabs">
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
      )}

      <div className="results-content">
        {currentModule && <ModuleResultsRenderer module={currentModule} ideas={ideas} />}
      </div>
    </div>
  )
}
