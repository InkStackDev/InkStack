import React from "react";
import { useNavigationPending } from "./NavigationState";
import styles from "./RouteProgress.module.css";

/**
 * Turbo/GitHub 风格的顶部进度条。
 * 导航状态由 NavigationState 统一维护。
 */
const RouteProgress: React.FC = () => {
    const pending = useNavigationPending();

    return <div className={`${styles.progress} ${pending ? styles.active : ""}`} aria-hidden="true" />;
};

export default RouteProgress;
