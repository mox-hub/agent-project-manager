import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom"
import {
  FileQuestionIcon,
  ServerCrashIcon,
  RefreshCwIcon,
  HomeIcon,
  ArrowLeftIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

interface ErrorPageProps {
  className?: string
}

export function ErrorPage({ className }: ErrorPageProps) {
  const { t } = useTranslation()
  const error = useRouteError()

  let errorMessage = t("error.unexpected")
  let errorStatus: number | undefined
  let errorCode = "EERR"
  let ErrorIcon = ServerCrashIcon
  let iconColor = "text-destructive"
  let iconBgClass = "bg-destructive/10"

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status
    errorCode = `E${errorStatus}`
    errorMessage = error.statusText || error.data?.message || t("error.serverError")

    if (error.status === 404) {
      ErrorIcon = FileQuestionIcon
      iconColor = "text-accent-yellow"
      iconBgClass = "bg-accent-yellow-light"
      errorMessage = t("error.pageNotFound")
    } else if (error.status >= 500) {
      ErrorIcon = ServerCrashIcon
      iconColor = "text-destructive"
      iconBgClass = "bg-destructive/10"
      errorMessage = t("error.serverError")
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === "string") {
    errorMessage = error
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center p-6",
        "bg-background",
        className
      )}
    >
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div className={cn("inline-flex items-center justify-center rounded-2xl p-4", iconBgClass)}>
          <ErrorIcon className={cn("size-10", iconColor)} />
        </div>

        {/* Status Code */}
        {errorStatus && (
          <div className="space-y-1">
            <p className="font-mono text-6xl font-bold tracking-tight text-foreground/10 select-none">
              {errorStatus}
            </p>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {errorStatus === 404 ? t("error.pageNotFound") : t("error.title")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{errorMessage}</p>
        </div>

        {/* Error Code Badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-mono font-medium text-muted-foreground">
            <span className="text-destructive">{errorCode}</span>
            <span className="text-border">/</span>
            <span>{errorStatus === 404 ? "NOT_FOUND" : "INTERNAL_ERROR"}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => window.history.back()}>
            <ArrowLeftIcon className="size-3.5 mr-1.5" />
            {t("error.actions.goBack")}
          </Button>
          <Button size="sm" asChild>
            <Link to="/app">
              <HomeIcon className="size-3.5 mr-1.5" />
              {t("error.actions.goHome")}
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            <RefreshCwIcon className="size-3.5 mr-1.5" />
            {t("error.actions.reload")}
          </Button>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground/50 pt-4">
          {t("error.footerHint") || "If the problem persists, please contact the administrator or"}
          {" "}
          <button
            className="underline underline-offset-2 hover:text-foreground transition-colors"
            onClick={() => {
              /* TODO: open bug report dialog */
            }}
          >
            {t("error.actions.reportIssue")}
          </button>
        </p>
      </div>
    </div>
  )
}
