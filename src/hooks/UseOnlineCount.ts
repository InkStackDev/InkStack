import { useSyncExternalStore } from "react";
import { subscribeOnlineCount, getOnlineCount } from "../services/PresenceService.ts";

/**
 * 在任何组件中使用：读取实时在线人数
 *
 * 数据来自统一会话 WebSocket（/ws/v1/session），连接生命周期由 AuthContext 管理。
 * PresenceService 已做 1s 节流，这里通过 useSyncExternalStore 只在值变化时重渲染。
 */
export function useOnlineCount(): number | null {
    return useSyncExternalStore(subscribeOnlineCount, getOnlineCount, getOnlineCount);
}
