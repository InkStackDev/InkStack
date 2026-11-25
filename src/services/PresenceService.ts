import { sessionWS } from "./WsInstances.ts";

/**
 * 实时在线人数
 *
 * 前提：WebSocket 只在用户登录后建立（生命周期由 AuthContext 管理），游客没有连接。
 * 因此本模块在应用启动时就被 App.tsx 以副作用方式引入并注册监听，
 * 保证「登录 → 建连 → 握手」时一定有人接收 `connected` 帧——
 * 该帧每个连接只发一次，之后只有人数变化时才会推 `online_count`，
 * 若监听注册晚于握手就会永久收不到初始值。
 *
 * 复用统一会话长连接：
 * - 握手成功后服务端下发 `connected` 帧，携带 `online_users`
 * - 在线人数变化时下发 `online_count` 帧
 *
 * 为避免服务端短时间连续推送导致 UI 高频刷新，更新会做 1s 节流；
 * 非主动断线时保留最后一次人数，5 秒内未重连才置空；
 * 退出登录 / 会话失效时由 AuthContext 调用 resetOnlineCount 立即清空。
 */

type OnlineCountListener = (count: number | null) => void;
const listeners = new Set<OnlineCountListener>();
let _onlineCount: number | null = null;
let pendingCount: number | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

const UPDATE_INTERVAL = 1000;
const DISCONNECT_GRACE = 5000;

function notify(count: number | null) {
    if (_onlineCount === count) {
        return;
    }
    _onlineCount = count;
    listeners.forEach((fn) => fn(count));
}

function scheduleFlush() {
    if (flushTimer) {
        return;
    }
    flushTimer = setTimeout(() => {
        flushTimer = null;
        notify(pendingCount);
    }, UPDATE_INTERVAL);
}

/** 兼容平铺与统一网关包裹一层 data 的帧结构 */
function pickOnlineCount(data: any): unknown {
    if (!data || typeof data !== "object") {
        return undefined;
    }
    return data.count ?? data.online_users ?? data.data?.count ?? data.data?.online_users;
}

function updateOnlineCount(raw: unknown) {
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
        return;
    }
    if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
    }
    pendingCount = raw;
    scheduleFlush();
}

sessionWS.onMessage("online_count", (data: any) => {
    updateOnlineCount(pickOnlineCount(data));
});

sessionWS.onMessage("connected", (data: any) => {
    updateOnlineCount(pickOnlineCount(data));
});

// 连接断开时保留最后人数，短暂断线重连不应让面板闪烁
sessionWS.onClose(() => {
    if (_onlineCount === null) {
        return;
    }
    if (clearTimer) {
        clearTimeout(clearTimer);
    }
    clearTimer = setTimeout(() => {
        clearTimer = null;
        pendingCount = null;
        notify(null);
    }, DISCONNECT_GRACE);
});

export function getOnlineCount(): number | null {
    return _onlineCount;
}

/**
 * 退出登录 / 会话失效时立即清空。
 * WS 是登录态专属的，主动断开不会触发 onClose 的宽限清理，
 * 不清空会把上一位用户的人数带到游客视图或下一次登录的瞬间。
 */
export function resetOnlineCount(): void {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
    }
    pendingCount = null;
    notify(null);
}

export function subscribeOnlineCount(listener: OnlineCountListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
