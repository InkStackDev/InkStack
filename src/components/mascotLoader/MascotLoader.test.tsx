import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import MascotLoader from "./MascotLoader";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("MascotLoader", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("延迟展示，避免快速加载时闪烁", async () => {
        vi.useFakeTimers();
        const host = document.createElement("div");
        const root = createRoot(host);
        try {
            await act(async () => {
                root.render(<MascotLoader title="正在打开 InkStack" delayMs={100} />);
            });
            expect(host.textContent).not.toContain("正在打开 InkStack");

            await act(async () => {
                vi.advanceTimersByTime(100);
            });
            expect(host.textContent).toContain("正在打开 InkStack");
        } finally {
            await act(async () => root.unmount());
        }
    });

    it("支持阶段标签、描述与进度点", async () => {
        vi.useFakeTimers();
        const host = document.createElement("div");
        const root = createRoot(host);
        try {
            await act(async () => {
                root.render(
                    <MascotLoader
                        title="正在进入研发平台"
                        description="正在校验权限"
                        stageLabel="权限校验"
                        progress={{ total: 3, current: 1 }}
                        delayMs={0}
                    />,
                );
            });
            await act(async () => {
                vi.advanceTimersByTime(0);
            });

            expect(host.textContent).toContain("权限校验");
            expect(host.textContent).toContain("正在进入研发平台");
            expect(host.textContent).toContain("正在校验权限");
        } finally {
            await act(async () => root.unmount());
        }
    });

    it("overlay 变体没有延迟时不占位", async () => {
        vi.useFakeTimers();
        const host = document.createElement("div");
        const root = createRoot(host);
        try {
            await act(async () => {
                root.render(<MascotLoader title="覆盖层" variant="overlay" delayMs={200} />);
            });
            expect(host.innerHTML).toBe("");

            await act(async () => {
                vi.advanceTimersByTime(200);
            });
            expect(host.textContent).toContain("覆盖层");
        } finally {
            await act(async () => root.unmount());
        }
    });
});
