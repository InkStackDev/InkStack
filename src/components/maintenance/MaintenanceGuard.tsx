import React, { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/types/Roles.ts";
import MaintenancePage from "./MaintenancePage";
import MascotLoader from "@/components/mascotLoader";

const MaintenanceGuard: React.FC = () => {
    const { settings, loading } = useSiteSettings();
    const { user, isAuthenticated, logout } = useAuth();
    const { t } = useTranslation("components");
    const loggedOutRef = useRef(false);

    const admin = isAdmin(user?.role);
    const blocked = !loading && settings.maintenanceMode && !admin;

    useEffect(() => {
        if (blocked && isAuthenticated && !loggedOutRef.current) {
            loggedOutRef.current = true;
            logout();
        }
        if (!blocked) {
            loggedOutRef.current = false;
        }
    }, [blocked, isAuthenticated, logout]);

    if (loading) {
        // 紧接应用启动加载之后，直接展示，避免同一个小人消失 200ms 再出现
        return <MascotLoader delayMs={0} title={t("mascotLoader.title")} description={t("mascotLoader.description")} />;
    }

    if (blocked) {
        return <MaintenancePage />;
    }

    return <Outlet />;
};

export default MaintenanceGuard;
