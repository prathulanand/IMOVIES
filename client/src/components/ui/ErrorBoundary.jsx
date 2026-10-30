import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from './Button';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/admin/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5">
          <div
            className="im-glass p-4 p-md-5 rounded-4 mx-auto text-center"
            style={{ maxWidth: '640px', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            <div className="p-3 rounded-circle bg-danger bg-opacity-10 text-danger d-inline-flex mb-3">
              <AlertTriangle size={36} />
            </div>
            <h3 className="fw-bold text-light mb-2">Something went wrong</h3>
            <p className="text-secondary mb-4 small">
              An unexpected error occurred while rendering this view. You can reload the page or return to the dashboard.
            </p>

            {this.state.error?.message && (
              <div
                className="p-3 mb-4 rounded-3 text-start bg-dark border border-danger border-opacity-25 small text-danger font-monospace text-break"
                style={{ fontSize: '0.82rem' }}
              >
                {this.state.error.message}
              </div>
            )}

            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Button variant="outline" onClick={this.handleReload} icon={RefreshCw}>
                Reload Page
              </Button>
              <Button variant="primary" onClick={this.handleReset} icon={Home}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
