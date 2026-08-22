import { Component, type ErrorInfo, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** 错误码前缀，如 "E500"、"E404"、"EERR" */
  errorCode?: string
  /** 错误上报回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
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
    console.error("[ErrorBoundary]", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const code = this.props.errorCode ?? "EERR"

      return (
        <div className="flex min-h-100 flex-col items-center justify-center gap-6 p-6">
              <Alert variant="destructive" className="max-w-md w-full" role="alert">
            <AlertTriangleIcon className="size-4 text-destructive" />
            <AlertDescription className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-destructive">
                    {code}
                  </span>
                  <span className="font-semibold text-destructive">发生错误</span>
                </div>
                <p className="text-sm text-destructive/80">
                  {this.state.error?.message || "一个意外的错误发生了"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    this.setState({ hasError: false, error: null })
                    window.location.reload()
                  }}
                >
                  <RefreshCwIcon className="size-3.5 mr-1.5" />
                  刷新页面
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/app">
                    <HomeIcon className="size-3.5 mr-1.5" />
                    返回首页
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}
