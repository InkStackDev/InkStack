import { sessionWS } from "./WsInstances.ts";

/**
 * 实时在线人数
 *
 * 复用统一会话长连接：
 * - 握手成功后服务端下发 `connected` 帧，携带 `online_users`
 * - 在线人数变化时下发 `online_count` 帧
 *
 * 连接生命周期由 AuthContext 统一管理，这里只负责缓存与订阅。
 * 为避免服务端短时间连续推送导致 UI 高频刷新，更新会做 1s 节流；
 * 断线时保留最后一次人数，5 秒内未重连才置空。
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
    updateOnlineCount(data?.count ?? data?.online_users);
});

sessionWS.onMessage("connected", (data: any) => {
    updateOnlineCount(data?.online_users);
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

export function subscribeOnlineCount(listener: OnlineCountListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
