import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Pixel Minds ErrorBoundary Caught Exception]:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      // oxlint-disable-next-line react/no-did-update-set-state
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReturnHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 select-none pm-bg-canvas">
          <div className="max-w-md w-full pm-glass-card rounded-3xl border border-white/90 dark:border-white/10 p-6 sm:p-8 text-center space-y-5 shadow-xl">
            {/* Custom Inline SVG Error Badge */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Error Message & Reassurance */}
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0e1b33] dark:text-[#f8fafc] font-['Outfit',sans-serif] tracking-tight">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Your account data and session remain safe. You can retry rendering this view or navigate back to the home screen.
              </p>
            </div>

            {/* Collapsible Technical Details */}
            <details className="text-left group rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 overflow-hidden text-xs">
              <summary className="px-3.5 py-2.5 font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none flex items-center justify-between transition">
                <span>Technical details</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform group-open:rotate-180 text-slate-400"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/40 dark:border-white/5">
                <p className="font-mono text-[11px] text-rose-600 dark:text-rose-400 break-words whitespace-pre-wrap leading-normal">
                  {this.state.error?.message || 'An unexpected runtime error occurred.'}
                </p>
              </div>
            </details>

            {/* Recovery Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="pm-glass-control inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-[#0e1b33] dark:text-slate-200 min-h-10 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleReturnHome}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0e1b33] hover:bg-[#162B45] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold shadow-xs min-h-10 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Return Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
