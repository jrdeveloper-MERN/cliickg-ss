import React from 'react';
import { RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex flex-col items-center justify-center text-center px-4 py-12 bg-admin-bg"
        >
          <div className="max-w-md w-full mx-auto flex flex-col items-center">
            <img
              src="/assets/images/error-500.svg"
              alt="500 Internal Server Error"
              className="w-72 max-w-full h-auto object-contain mb-6 drop-shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-xl sm:text-2xl font-bold text-admin-text-primary mb-2 tracking-tight">
              500 - Application Error
            </h1>
            <p className="text-xs sm:text-sm text-admin-text-secondary max-w-md mb-6 leading-relaxed">
              An unexpected application error occurred. We apologize for the inconvenience. Please reload the page to continue.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-primary flex items-center gap-2 text-xs py-2.5 px-5 cursor-pointer"
            >
              <RotateCcw size={14} /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
