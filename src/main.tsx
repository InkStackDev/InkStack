import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import i18n from "./i18n";
import { resolvePreferredLanguage } from "./i18n/I18nUtils";
import { ensureLanguageResources } from "./i18n/ResourcesLoader";

// 生产环境屏蔽 console.log，开发环境保留
if (!import.meta.env.DEV) {
    console.log = () => {};
}

// 直连后端时提前建立 DNS/TLS 连接，减少首个 API 请求的握手延迟
const apiBase = import.meta.env.VITE_API_BASE_URL;
if (apiBase && /^https?:\/\//.test(apiBase)) {
    const origin = new URL(apiBase).origin;
    for (const rel of ["preconnect", "dns-prefetch"]) {
        const link = document.createElement("link");
        link.rel = rel;
        link.href = origin;
        if (rel === "preconnect") {
            link.crossOrigin = "anonymous";
        }
        document.head.appendChild(link);
    }
}

async function bootstrap() {
    const language = resolvePreferredLanguage();
    try {
        await ensureLanguageResources(language);
        if (i18n.language !== language && i18n.hasResourceBundle(language, "common")) {
            await i18n.changeLanguage(language);
        }
    } catch {
        // 语言包加载失败时使用 zh-CN 兜底继续渲染
    }

    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}

void bootstrap();
