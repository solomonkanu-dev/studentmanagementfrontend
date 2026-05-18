import { AlertTriangle, RefreshCw } from "lucide-react";

// Shared loading / error states for the self-fetching super-admin sections.

export function Loader({ className = "h-60" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
    </div>
  );
}

export function ErrorBlock({
  onRetry,
  className = "h-60",
}: {
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-center ${className}`}>
      <AlertTriangle className="h-7 w-7 text-meta-1" aria-hidden="true" />
      <p className="text-sm text-body">Couldn&apos;t load this data.</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}
