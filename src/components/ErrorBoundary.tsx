import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-8 glass-panel rounded-3xl border-2 border-pink-200/90 shadow-glow-dual text-center space-y-4 animate-scaleIn bg-white/90">
          <div className="w-16 h-16 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-chobee-navy-950 font-display">
            {this.props.fallbackTitle || 'Oops, something went wrong'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            The page encountered a temporary issue while loading. You can refresh or try returning to the dashboard.
          </p>
          {this.state.error?.message && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-mono rounded-xl max-w-lg mx-auto overflow-x-auto text-left border border-red-200">
              {this.state.error.message}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-chobee-pink-500 to-purple-600 text-white font-bold text-xs shadow-soft-pink hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry / Reload</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
