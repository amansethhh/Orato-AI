import React from "react";

/**
 * Global Error Boundary — catches render crashes and shows
 * a styled fallback UI instead of a blank page.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[Orato] Uncaught render error:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              An unexpected error occurred. Don't worry — your data is safe.
            </p>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-left">
              <p className="text-xs font-mono text-red-700 dark:text-red-400 break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
