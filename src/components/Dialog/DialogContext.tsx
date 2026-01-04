import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Dialog, type DialogConfig, type DialogType } from './Dialog'

type DialogOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

type DialogContextType = {
  confirm: (options: DialogOptions) => Promise<boolean>
  alert: (options: DialogOptions) => Promise<void>
  success: (options: DialogOptions) => Promise<void>
  error: (options: DialogOptions) => Promise<void>
}

const DialogContext = createContext<DialogContextType | null>(null)

type DialogState = DialogConfig & {
  resolve: (value: boolean) => void
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const showDialog = useCallback((type: DialogType, options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        type,
        ...options,
        resolve,
      })
    })
  }, [])

  const confirm = useCallback((options: DialogOptions): Promise<boolean> => {
    return showDialog('confirm', options)
  }, [showDialog])

  const alert = useCallback((options: DialogOptions): Promise<void> => {
    return showDialog('alert', options).then(() => {})
  }, [showDialog])

  const success = useCallback((options: DialogOptions): Promise<void> => {
    return showDialog('success', options).then(() => {})
  }, [showDialog])

  const error = useCallback((options: DialogOptions): Promise<void> => {
    return showDialog('error', options).then(() => {})
  }, [showDialog])

  const handleConfirm = useCallback(() => {
    dialog?.resolve(true)
    setDialog(null)
  }, [dialog])

  const handleCancel = useCallback(() => {
    dialog?.resolve(false)
    setDialog(null)
  }, [dialog])

  return (
    <DialogContext.Provider value={{ confirm, alert, success, error }}>
      {children}
      {dialog && (
        <Dialog
          type={dialog.type}
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}
