import React, { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppShell from "./AppShell";
import ClassicLayout from "./ClassicLayout";
import HomeQuickTools from "../homeQuickTools/HomeQuickTools";
import Loading from "../loading/Loading";
import PageSkeleton from "../pageSkeleton/PageSkeleton";
import { useLayoutMode } from "@/contexts/LayoutModeContext";

/**
 * 前台布局：一次挂载布局外壳（常驻导航/顶栏/页脚），仅切换 <Outlet /> 内容。
 * 依据用户在「界面布局」中的偏好渲染新壳（AppShell）或经典壳（Navbar）。
 */
const FrontLayout: React.FC = () => {
    const location = useLocation();
    const { mode } = useLayoutMode();
    const isHome = location.pathname === "/index" || location.pathname === "/";
    const isHelp = location.pathname === "/help";
    const isEditor = location.pathname.startsWith("/article/create") || location.pathname.startsWith("/article/edit");
    const isOrg = location.pathname.startsWith("/organizations") || location.pathname.startsWith("/organization");
    const isProfile = location.pathname.startsWith("/profile");
    const isAssignment = location.pathname.startsWith("/assignment");
    const isMessages = location.pathname.startsWith("/messages");
    const isProduct = location.pathname.startsWith("/products");
    const fit = isHome || isHelp || isEditor || isOrg || isProfile || isAssignment || isMessages || isProduct;

    const outlet = (
        <Suspense
            fallback={
                isHome ? (
                    <PageSkeleton />
                ) : (
                    <div style={{ display: "flex", justifyContent: "center", padding: "80px 20px" }}>
                        <Loading size="large" />
                    </div>
                )
            }
        >
            <Outlet />
        </Suspense>
    );

    if (mode === "classic") {
        return <ClassicLayout>{outlet}</ClassicLayout>;
    }

    return (
        <AppShell fit={fit} topBarTools={<HomeQuickTools />}>
            {outlet}
        </AppShell>
    );
};

export default FrontLayout;
