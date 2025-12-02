import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertIcon } from './Icons';
import { Button } from './Button';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(
      'Uncaught error in ErrorBoundary',
      { componentStack: errorInfo.componentStack },
      error
    );
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans text-slate-900">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-200">
              <AlertIcon className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-slate-600 mb-6">
              Something unexpected happened. Please refresh the page to continue.
            </p>

            {this.state.error && (
              <div className="bg-red-50 p-4 rounded-lg text-left mb-6 overflow-auto max-h-32 text-xs font-mono text-red-700 border border-red-200">
                {this.state.error.toString()}
              </div>
            )}

            <Button onClick={this.handleReload} fullWidth>
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
