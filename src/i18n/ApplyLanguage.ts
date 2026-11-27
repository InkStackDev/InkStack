/**
 * 应用指定语言：切换 i18next、同步 <html lang>、刷新后端 errors/messages 配置
 */

import i18n from "./index";
import { refreshAppConfig } from "@/utils/AppConfig.ts";
import type { SupportedLanguage } from "./Constants";
import { ensureLanguageResources } from "./ResourcesLoader";

export async function applyLanguage(language: SupportedLanguage): Promise<void> {
    await ensureLanguageResources(language);
    if (i18n.language !== language) {
        await i18n.changeLanguage(language);
    }
    if (typeof document !== "undefined" && document.documentElement.lang !== language) {
        document.documentElement.lang = language;
    }
    await refreshAppConfig(language);
}
