import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PresenceService 回归测试。
 *
 * 线上关键场景：WS 只在登录后建立，`connected` 帧每个连接只发一次。
 * 这里用可控的 sessionWS 替身验证监听注册与帧解析，不真正建连。
 */

const ws = vi.hoisted(() => {
    const handlers = new Map<string, Set<(data: unknown) => void>>();
    const closeHandlers = new Set<() => void>();
    return {
        client: {
            onMessage(type: string, handler: (data: unknown) => void) {
                let bucket = handlers.get(type);
                if (!bucket) {
                    bucket = new Set();
                    handlers.set(type, bucket);
                }
                bucket.add(handler);
                return () => {
                    bucket.delete(handler);
                };
            },
            onClose(handler: () => void) {
                closeHandlers.add(handler);
                return () => {
                    closeHandlers.delete(handler);
                };
            },
        },
        emit(type: string, data: unknown) {
            handlers.get(type)?.forEach((handler) => handler(data));
        },
        emitClose() {
            closeHandlers.forEach((handler) => handler());
        },
    };
});

vi.mock("./WsInstances.ts", () => ({ sessionWS: ws.client }));

import { getOnlineCount, resetOnlineCount, subscribeOnlineCount } from "./PresenceService.ts";

describe("PresenceService 在线人数", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetOnlineCount();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("未登录（没有 WS 连接）时保持 null", () => {
        expect(getOnlineCount()).toBeNull();
        vi.advanceTimersByTime(5000);
        expect(getOnlineCount()).toBeNull();
    });

    it("捕获握手帧，并解析包裹在 data 里的 online_users", () => {
        ws.emit("connected", { type: "connected", data: { online_users: 1 } });
        expect(getOnlineCount()).toBeNull(); // 1s 节流
        vi.advanceTimersByTime(1000);
        expect(getOnlineCount()).toBe(1);
    });

    it("online_count 同时支持 count 与 online_users 字段", () => {
        ws.emit("online_count", { count: 3 });
        vi.advanceTimersByTime(1000);
        expect(getOnlineCount()).toBe(3);

        ws.emit("online_count", { data: { online_users: 5 } });
        vi.advanceTimersByTime(1000);
        expect(getOnlineCount()).toBe(5);
    });

    it("非法人数帧被忽略", () => {
        ws.emit("connected", { online_users: "1" });
        ws.emit("online_count", { count: -2 });
        vi.advanceTimersByTime(1000);
        expect(getOnlineCount()).toBeNull();
    });

    it("相同人数不会重复通知订阅者", () => {
        const listener = vi.fn();
        const unsubscribe = subscribeOnlineCount(listener);

        ws.emit("connected", { online_users: 1 });
        vi.advanceTimersByTime(1000);
        ws.emit("online_count", { count: 1 });
        vi.advanceTimersByTime(1000);

        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });

    it("非主动断线保留 5 秒后清空", () => {
        ws.emit("connected", { online_users: 4 });
        vi.advanceTimersByTime(1000);
        ws.emitClose();

        vi.advanceTimersByTime(4999);
        expect(getOnlineCount()).toBe(4);

        vi.advanceTimersByTime(1);
        expect(getOnlineCount()).toBeNull();
    });

    it("退出登录 resetOnlineCount 立即清空并通知订阅者", () => {
        ws.emit("connected", { online_users: 2 });
        vi.advanceTimersByTime(1000);

        const listener = vi.fn();
        const unsubscribe = subscribeOnlineCount(listener);
        resetOnlineCount();

        expect(getOnlineCount()).toBeNull();
        expect(listener).toHaveBeenCalledWith(null);
        unsubscribe();
    });
});
