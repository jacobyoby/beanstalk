import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8">
          <div className="panel max-w-md space-y-4 p-6 text-center">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Something went wrong</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button type="button" onClick={this.handleRetry} className="btn btn-primary">
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
