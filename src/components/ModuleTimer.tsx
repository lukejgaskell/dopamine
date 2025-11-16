import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { TimerState, ModuleConfig } from '../types/module'
import './ModuleTimer.css'

interface ModuleTimerProps {
  timeLimit: number // in minutes
  isHost: boolean
  scrollId: string
  moduleIndex: number
  modules: ModuleConfig[]
  timerState?: TimerState
}

export default function ModuleTimer({
  timeLimit,
  isHost,
  scrollId,
  moduleIndex,
  modules,
  timerState
}: ModuleTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60)
  const intervalRef = useRef<number | null>(null)

  // Calculate time remaining based on timer state
  useEffect(() => {
    if (timerState?.isRunning && timerState.startedAt) {
      const startTime = new Date(timerState.startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const remaining = Math.max(0, timeLimit * 60 - elapsed)
      setTimeRemaining(remaining)
    } else if (timerState?.pausedAt !== null && timerState?.pausedAt !== undefined) {
      setTimeRemaining(timerState.pausedAt)
    } else {
      setTimeRemaining(timeLimit * 60)
    }
  }, [timerState, timeLimit])

  // Countdown interval
  useEffect(() => {
    if (timerState?.isRunning && timeRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState?.isRunning])

  const updateTimerState = async (newState: TimerState) => {
    const updatedModules = [...modules]
    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      timerState: newState
    }

    await supabase
      .from('scrolls')
      .update({ modules: updatedModules })
      .eq('id', scrollId)
  }

  const handleStart = async () => {
    await updateTimerState({
      isRunning: true,
      startedAt: new Date().toISOString(),
      pausedAt: null
    })
  }

  const handlePause = async () => {
    await updateTimerState({
      isRunning: false,
      startedAt: null,
      pausedAt: timeRemaining
    })
  }

  const handleReset = async () => {
    await updateTimerState({
      isRunning: false,
      startedAt: null,
      pausedAt: null
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const percentage = (timeRemaining / (timeLimit * 60)) * 100
  const isRunning = timerState?.isRunning || false

  return (
    <div className="module-timer">
      <div className="timer-display">
        <div
          className={`timer-circle ${timeRemaining === 0 ? 'expired' : ''} ${isRunning ? 'running' : ''}`}
          style={{ '--progress': `${percentage}%` } as React.CSSProperties}
        >
          <span className="timer-text">{formatTime(timeRemaining)}</span>
        </div>
      </div>
      {isHost && (
        <div className="timer-controls">
          {!isRunning && timeRemaining > 0 && (
            <button onClick={handleStart} className="timer-btn start">
              Start
            </button>
          )}
          {isRunning && (
            <button onClick={handlePause} className="timer-btn pause">
              Pause
            </button>
          )}
          <button onClick={handleReset} className="timer-btn reset">
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
