/**
 * 应用语言配置
 *
 * - 启动时从 /api/v1/config 拉取当前语言的 errors + messages
 * - errors 用于 getErrorMsg(errno)
 * - messages 挂到 i18next 的 backend 命名空间
 * - 缓存到 localStorage，网络失败时继续使用旧配置
 */

import i18n from "@/i18n";

const STORAGE_KEY = "app_config";
const LEGACY_ERROR_KEY = "app_error_codes";

interface AppConfigPayload {
    version?: string;
    lang?: string;
    errors?: Record<string, string>;
    messages?: Record<string, string>;
}

interface CachedAppConfig {
    lang: string;
    version: string;
    errors: Record<string, string>;
    messages: Record<string, string>;
}

let currentLang = "";
let currentVersion = "";
let errorMessages: Record<string, string> = {};
let reFetchTimer: ReturnType<typeof setTimeout> | null = null;

function applyConfig(lang: string, config: AppConfigPayload): void {
    currentLang = lang;
    currentVersion = config.version || "";
    errorMessages = config.errors || {};

    const messages = config.messages || {};
    if (Object.keys(messages).length > 0) {
        i18n.addResourceBundle(lang, "backend", messages, true, true);
    }
}

function restoreCache(): void {
    try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            const parsed: CachedAppConfig = JSON.parse(cached);
            if (parsed.lang && parsed.errors) {
                applyConfig(parsed.lang, parsed);
                return;
            }
        }

        const legacy = localStorage.getItem(LEGACY_ERROR_KEY);
        if (legacy) {
            const parsed: { lang?: string; messages?: Record<string, string> } = JSON.parse(legacy);
            if (parsed.lang && parsed.messages) {
                applyConfig(parsed.lang, { errors: parsed.messages });
            }
        }
    } catch {
        // localStorage 不可用或数据损坏，从空配置开始
    }
}

restoreCache();

/**
 * 初始化语言配置（应用入口调用一次）
 */
export async function initAppConfig(lang?: string): Promise<void> {
    const targetLang = lang || i18n.language || navigator.language || "zh-CN";
    if (currentLang === targetLang && Object.keys(errorMessages).length > 0) {
        return;
    }
    await fetchAppConfig(targetLang);
}

/**
 * 语言切换后刷新配置
 */
export async function refreshAppConfig(lang: string): Promise<void> {
    if (lang && lang !== currentLang) {
        await fetchAppConfig(lang);
    }
}

export function getAppConfigVersion(): string {
    return currentVersion;
}

/**
 * 根据 errno 获取错误消息（同步调用）
 */
export function getErrorMsg(errno: number | string, fallbackMsg?: string): string {
    const key = String(errno);
    if (errorMessages[key]) {
        return errorMessages[key];
    }
    scheduleReFetch();
    return fallbackMsg || i18n.t("common:errors.unknown");
}

/**
 * 解析后端消息 ID，找不到时回退到后端下发的 title/content
 */
export function resolveBackendMessage(id?: string, params?: Record<string, unknown>, fallback?: string): string {
    if (id) {
        const key = `backend:${id}`;
        if (i18n.exists(key)) {
            const translate = i18n.t as (key: string, options?: Record<string, unknown>) => string;
            return String(translate(key, params));
        }
    }
    return fallback || "";
}

async function fetchAppConfig(lang: string): Promise<void> {
    try {
        const res = await fetch(`/api/v1/config?lang=${encodeURIComponent(lang)}`);
        if (!res.ok) {
            return;
        }
        const json = await res.json();
        if (typeof json.errno === "number" && json.errno !== 0) {
            return;
        }
        const data: AppConfigPayload = json.data || json;
        if (!data || typeof data !== "object") {
            return;
        }

        applyConfig(lang, data);
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    lang,
                    version: currentVersion,
                    errors: errorMessages,
                    messages: data.messages || {},
                } satisfies CachedAppConfig),
            );
        } catch {
            // localStorage 满或不可写，忽略
        }
    } catch {
        // 静默降级：localStorage 有旧配置就继续用
    }
}

function scheduleReFetch(): void {
    if (reFetchTimer) {
        return;
    }
    reFetchTimer = setTimeout(() => {
        reFetchTimer = null;
        fetchAppConfig(currentLang || i18n.language || "zh-CN");
    }, 3000);
}
