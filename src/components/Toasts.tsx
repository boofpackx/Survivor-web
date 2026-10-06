import { useStore } from '../lib/store'
import { dismissToast, toastStore } from '../lib/toast'

export default function Toasts() {
  const toasts = useStore(toastStore)
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <span className="toast-icon" aria-hidden="true">{t.icon}</span>
          <div className="toast-text">
            <strong>{t.title}</strong>
            {t.body && <span>{t.body}</span>}
          </div>
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action!.run()
                dismissToast(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="toast-x" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
