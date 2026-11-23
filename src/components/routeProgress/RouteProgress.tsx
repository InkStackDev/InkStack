import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./RouteProgress.module.css";

/**
 * Turbo/GitHub 风格的顶部进度条。
 * 点击站内链接时开始，路由提交后结束。
 */
const RouteProgress: React.FC = () => {
    const location = useLocation();
    const [active, setActive] = useState(false);
    const startPathRef = useRef(location.pathname);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (!(event.target instanceof Element)) {
                return;
            }
            const anchor = event.target.closest("a[href]");
            if (!(anchor instanceof HTMLAnchorElement)) {
                return;
            }
            if (anchor.target && anchor.target !== "_self") {
                return;
            }
            const url = new URL(anchor.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname === window.location.pathname) {
                return;
            }
            startPathRef.current = window.location.pathname;
            setActive(true);
        };

        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);

    // 路由变化后结束进度条；程序化 navigate（非 <a>）也会短暂显示
    useEffect(() => {
        if (location.pathname === startPathRef.current) {
            return;
        }
        if (!active) {
            startPathRef.current = location.pathname;
            setActive(true);
            return;
        }
        const timer = setTimeout(() => {
            startPathRef.current = location.pathname;
            setActive(false);
        }, 180);
        return () => clearTimeout(timer);
    }, [active, location.pathname]);

    // 兜底：异常情况下不要让进度条一直显示
    useEffect(() => {
        if (!active) {
            return;
        }
        const timer = setTimeout(() => setActive(false), 8000);
        return () => clearTimeout(timer);
    }, [active]);

    return <div className={`${styles.progress} ${active ? styles.active : ""}`} aria-hidden="true" />;
};

export default RouteProgress;
