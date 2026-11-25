import React, { useEffect, useState } from "react";
import RobotMascot from "@/components/robotMascot";
import styles from "./MascotLoader.module.css";

export type MascotLoaderTone = "brand" | "auth" | "access" | "org";

export interface MascotLoaderProgress {
    total: number;
    /** 0-based 当前阶段下标 */
    current: number;
}

export interface MascotLoaderProps {
    title: string;
    description?: string;
    /** 标题上方的小标签，例如「权限校验」 */
    stageLabel?: string;
    /** 机器人右上角的浮动图标 */
    badge?: React.ReactNode;
    /** 底部阶段进度点；不传则不渲染 */
    progress?: MascotLoaderProgress;
    /** 光晕 / 轨道 / 徽章的强调色 */
    tone?: MascotLoaderTone;
    /** fullscreen：整页加载；overlay：覆盖在内容区之上 */
    variant?: "fullscreen" | "overlay";
    /** 快速加载时不闪加载态，超过该毫秒数才展示 */
    delayMs?: number;
    /** 变化时重放徽章与文字的入场动画（例如阶段切换） */
    animateKey?: string;
}

/**
 * 通用加载态：会眨眼的机器人 + 轨道光晕 + 可选阶段进度。
 * RD 入口（RdEntryLoader）与站点启动加载共用这一份视觉。
 */
const MascotLoader: React.FC<MascotLoaderProps> = ({
    title,
    description,
    stageLabel,
    badge,
    progress,
    tone = "brand",
    variant = "fullscreen",
    delayMs,
    animateKey,
}) => {
    const [visible, setVisible] = useState(false);
    const delay = delayMs ?? (variant === "overlay" ? 120 : 220);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    if (!visible) {
        return variant === "fullscreen" ? <div style={{ minHeight: "100vh" }} /> : null;
    }

    const toneClass = tone === "auth" ? styles.toneAuth : tone === "access" ? styles.toneAccess : tone === "org" ? styles.toneOrg : "";

    return (
        <div
            className={`${styles.container} ${toneClass} ${variant === "overlay" ? styles.overlay : ""}`}
            data-tone={tone}
            data-variant={variant}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div className={styles.ambient} aria-hidden="true" />

            <div className={styles.mascotWrap}>
                <span className={styles.orbit} aria-hidden="true" />
                <span className={styles.scanRing} aria-hidden="true" />
                {badge && (
                    <span className={styles.badge} key={animateKey} aria-hidden="true">
                        <span className={styles.badgeInner}>{badge}</span>
                    </span>
                )}
                <RobotMascot className={styles.robot} size={128} />
            </div>

            <div className={styles.textBlock} key={animateKey}>
                {stageLabel && <span className={styles.stageLabel}>{stageLabel}</span>}
                <h2 className={styles.title}>{title}</h2>
                {description && <p className={styles.description}>{description}</p>}
            </div>

            {progress && progress.total > 0 && (
                <div className={styles.steps} aria-hidden="true">
                    {Array.from({ length: progress.total }, (_, index) => (
                        <span
                            key={index}
                            className={`${styles.step} ${index < progress.current ? styles.stepDone : ""} ${
                                index === progress.current ? styles.stepActive : ""
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MascotLoader;
