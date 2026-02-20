import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '24px',
            textAlign: 'center',
          }}>
          <h2
            style={{ margin: '0 0 12px', fontSize: '20px', color: '#dc2626' }}>
            Something went wrong
          </h2>
          {this.state.error && (
            <p
              style={{
                margin: '0 0 16px',
                fontSize: '14px',
                color: '#6b7280',
                maxWidth: '600px',
              }}>
              {this.state.error.message || 'An unexpected error occurred'}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}>
              Reload Page
            </button>
            <Link
              to="/app"
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
                color: '#374151',
                textDecoration: 'none',
                fontSize: '14px',
              }}>
              Go Home
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
