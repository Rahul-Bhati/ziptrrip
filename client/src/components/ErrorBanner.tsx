interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/** Error message box. role="alert" makes screen readers announce it immediately. */
export function ErrorBanner({ message, onRetry, onDismiss }: Props) {
  return (
    <div className="banner banner-error" role="alert">
      <span>{message}</span>
      <span className="banner-actions">
        {onRetry && (
          <button type="button" className="btn btn-small" onClick={onRetry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button type="button" className="btn-icon" onClick={onDismiss} aria-label="Dismiss">
            ✕
          </button>
        )}
      </span>
    </div>
  );
}
