import { useSyncExternalStore } from "react";

/**
 * 全局导航状态：
 * - 点击站内链接 / 调用 navigate 时开始
 * - 路由提交后结束
 * 用于顶部进度条和导航栏转圈提示。
 */

const MIN_VISIBLE_MS = 250;
const SAFETY_TIMEOUT_MS = 8000;
const INSTALL_KEY = "__inkstackNavigationTracking";

let pending = false;
let startedAt = 0;
let finishTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function clearTimers() {
    if (finishTimer) {
        clearTimeout(finishTimer);
        finishTimer = null;
    }
    if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
    }
}

export function startNavigation(): void {
    clearTimers();
    const wasPending = pending;
    pending = true;
    startedAt = Date.now();
    if (!wasPending) {
        emit();
    }

    safetyTimer = setTimeout(() => {
        safetyTimer = null;
        finishNavigation();
    }, SAFETY_TIMEOUT_MS);
}

export function finishNavigation(): void {
    if (!pending) {
        return;
    }
    if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
    }
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
    if (finishTimer) {
        clearTimeout(finishTimer);
    }
    finishTimer = setTimeout(() => {
        finishTimer = null;
        pending = false;
        emit();
    }, remaining);
}

export function getNavigationPending(): boolean {
    return pending;
}

export function subscribeNavigation(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useNavigationPending(): boolean {
    return useSyncExternalStore(subscribeNavigation, getNavigationPending, getNavigationPending);
}

/**
 * 拦截 history.pushState 和浏览器前进/后退。
 * React Router 的 Link / navigate 最终都会走到 pushState。
 */
export function installNavigationTracking(): void {
    if (typeof window === "undefined") {
        return;
    }
    const marker = window as Window & { [INSTALL_KEY]?: boolean };
    if (marker[INSTALL_KEY]) {
        return;
    }
    marker[INSTALL_KEY] = true;

    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = function (...args: Parameters<History["pushState"]>) {
        try {
            const target = args[2] == null ? window.location.href : String(args[2]);
            const next = new URL(target, window.location.href);
            if (next.pathname !== window.location.pathname) {
                startNavigation();
            }
        } catch {
            // URL 解析失败时忽略，不影响正常导航
        }
        return originalPushState(...args);
    };

    window.addEventListener("popstate", () => {
        startNavigation();
    });
}
