import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', padding: '2rem',
          background: '#0f1117', color: '#fff', fontFamily: 'sans-serif', textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#f5c518', marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#aaa', maxWidth: '500px', marginBottom: '1.5rem' }}>
            The application encountered an unexpected error. Please refresh the page.
          </p>
          <pre style={{
            background: '#1a1d2e', padding: '1rem', borderRadius: '8px',
            fontSize: '0.75rem', color: '#f87171', maxWidth: '600px',
            overflowX: 'auto', textAlign: 'left', marginBottom: '1.5rem'
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#2d6a4f', color: '#fff', border: 'none',
              padding: '0.75rem 2rem', borderRadius: '8px', cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
