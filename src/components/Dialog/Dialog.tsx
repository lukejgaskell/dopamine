import { useEffect, useRef } from 'react'
import './Dialog.css'

export type DialogType = 'confirm' | 'alert' | 'success' | 'error'

export type DialogConfig = {
  type: DialogType
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

type DialogProps = DialogConfig & {
  onConfirm: () => void
  onCancel: () => void
}

export function Dialog({
  type,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Focus the confirm button when dialog opens
  useEffect(() => {
    confirmButtonRef.current?.focus()
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  const isConfirmType = type === 'confirm'
  const isDanger = type === 'error' || (type === 'confirm' && confirmLabel?.toLowerCase().includes('delete'))

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="dialog-icon dialog-icon-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        )
      case 'error':
        return (
          <svg className="dialog-icon dialog-icon-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )
      case 'confirm':
        return (
          <svg className="dialog-icon dialog-icon-confirm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
      default:
        return (
          <svg className="dialog-icon dialog-icon-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )
    }
  }

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog" ref={dialogRef} role="alertdialog" aria-modal="true">
        <div className="dialog-header">
          {getIcon()}
          <h2 className="dialog-title">{title}</h2>
        </div>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          {isConfirmType && (
            <button
              className="dialog-btn dialog-btn-cancel"
              onClick={onCancel}
            >
              {cancelLabel || 'Cancel'}
            </button>
          )}
          <button
            ref={confirmButtonRef}
            className={`dialog-btn ${isDanger ? 'dialog-btn-danger' : 'dialog-btn-confirm'}`}
            onClick={onConfirm}
          >
            {confirmLabel || (isConfirmType ? 'Confirm' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  )
}
