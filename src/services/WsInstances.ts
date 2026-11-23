/**
 * WebSocket 业务单例
 *
 * sessionWS：统一会话长连接（/ws/v1/session）
 * 通知、在线人数、私信和系统消息全部复用这一条连接，按 channel 分发。
 */

import { WebSocketClient } from "../infra/Websocket.ts";

/** 统一会话 WebSocket 单例 */
export const sessionWS = new WebSocketClient("/ws/v1/session");

// 开发环境 HMR 时关闭旧连接，避免留下多条连接导致在线人数抖动
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        sessionWS.disconnect();
    });
}
