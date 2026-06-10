import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useLoadingContext } from "./loading-overlay"
import { LoadingOverlay } from "./loading-overlay"

/* ============================================
   GlobalLoadingState — TanStack Query 全局请求拦截
   放在 LoadingProvider 内部，监听所有 pending 请求
   ============================================ */

function GlobalLoadingState() {
  const { addPending, removePending, isLoading, mode } = useLoadingContext()
  const queryClient = useQueryClient()

  useEffect(() => {
    const queryCache = queryClient.getQueryCache()

    const unsubscribeOnAdded = queryCache.subscribe((event) => {
      if (event.type === "added") {
        const query = event.query
        if (query.state.status === "pending") {
          addPending()
        }
      }
    })

    const unsubscribeOnRemoved = queryCache.subscribe((event) => {
      if (event.type === "removed") {
        removePending()
      }
    })

    const unsubscribeOnUpdated = queryCache.subscribe((event) => {
      if (event.type === "updated") {
        const query = event.query
        if (query.state.status !== "pending") {
          removePending()
        }
      }
    })

    // 初始化：遍历已有 pending query
    queryCache.getAll().forEach((query) => {
      if (query.state.status === "pending") {
        addPending()
      }
    })

    return () => {
      unsubscribeOnAdded()
      unsubscribeOnRemoved()
      unsubscribeOnUpdated()
    }
  }, [queryClient, addPending, removePending])

  return (
    <LoadingOverlay
      visible={isLoading}
      mode={mode}
      message="加载中"
      description="正在获取数据，请稍候..."
    />
  )
}

export { GlobalLoadingState }
