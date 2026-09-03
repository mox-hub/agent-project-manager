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

    // TanStack Query 的 cache 事件可能在其他组件 render 期间同步触发
    // （如 useQuery 挂载时），此时直接 setState 会触发
    // "Cannot update a component while rendering a different component"。
    // 加载条属非紧急 UI，统一推迟到微任务中更新。
    const unsubscribeOnAdded = queryCache.subscribe((event) => {
      if (event.type === "added") {
        const query = event.query
        if (query.state.status === "pending") {
          queueMicrotask(() => addPending())
        }
      }
    })

    const unsubscribeOnRemoved = queryCache.subscribe((event) => {
      if (event.type === "removed") {
        queueMicrotask(() => removePending())
      }
    })

    const unsubscribeOnUpdated = queryCache.subscribe((event) => {
      if (event.type === "updated") {
        const query = event.query
        if (query.state.status !== "pending") {
          queueMicrotask(() => removePending())
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
