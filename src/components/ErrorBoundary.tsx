import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('G Wallet ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0E14] text-[#F4F6FB] flex items-center justify-center p-6">
          <div className="gw-glass max-w-lg w-full rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Session Security Notice</h2>
            <p className="text-sm text-slate-400 mb-6 break-words">
              {this.state.errorMessage.slice(0, 240)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gw-gold-gradient text-[#060D1F] font-semibold text-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload G Wallet
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
