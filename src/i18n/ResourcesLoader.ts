import i18n from "./index";
import { loadEnResources } from "./Resources";
import type { SupportedLanguage } from "./Constants";

/**
 * 确保目标语言资源已注册。
 * zh-CN 在首屏同步加载，en-US 在需要时动态加载。
 */
export async function ensureLanguageResources(language: SupportedLanguage): Promise<void> {
    if (language !== "en-US" || i18n.hasResourceBundle("en-US", "common")) {
        return;
    }
    const en = await loadEnResources();
    for (const [namespace, bundle] of Object.entries(en)) {
        i18n.addResourceBundle("en-US", namespace, bundle, true, true);
    }
}

export default ensureLanguageResources;
