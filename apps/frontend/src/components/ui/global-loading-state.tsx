import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useLoadingContext } from "./loading-overlay"
import { LoadingOverlay } from "./loading-overlay"

/* ============================================
   GlobalLoadingState — TanStack Query 全局请求拦截
   放在 LoadingProvider 内部，监听所有在途请求
   ============================================ */

function GlobalLoadingState() {
  const { addPending, removePending, isLoading, mode } = useLoadingContext()
  const queryClient = useQueryClient()
  const countedRef = useRef(0)

  useEffect(() => {
    const queryCache = queryClient.getQueryCache()

    // 以「正在请求」（fetchStatus === 'fetching'）为唯一真相做全量对账，
    // 不逐事件加减：disabled 查询的 status 同样是 pending（fetchStatus 为
    // idle，如登录页 enabled 依赖 token 的 me 查询），按 status 计数会让
    // 加载条在无 token 页面永远挂着（2026-09-20 CAP-A-22 实测修复）。
    const reconcile = () => {
      const fetching = queryCache
        .getAll()
        .filter((query) => query.state.fetchStatus === "fetching")
        .length
      let delta = fetching - countedRef.current
      countedRef.current = fetching
      while (delta > 0) {
        addPending()
        delta--
      }
      while (delta < 0) {
        removePending()
        delta++
      }
    }

    // TanStack Query 的 cache 事件可能在其他组件 render 期间同步触发
    // （如 useQuery 挂载时），此时直接 setState 会触发
    // "Cannot update a component while rendering a different component"。
    // 加载条属非紧急 UI，统一推迟到微任务中更新。
    const unsubscribe = queryCache.subscribe((event) => {
      if (event.type === "added" || event.type === "updated" || event.type === "removed") {
        queueMicrotask(reconcile)
      }
    })

    reconcile()

    return unsubscribe
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
