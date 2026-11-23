import React, { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/types/Roles.ts";
import MaintenancePage from "./MaintenancePage";
import Loading from "@/components/loading/Loading";

const MaintenanceGuard: React.FC = () => {
    const { settings, loading } = useSiteSettings();
    const { user, isAuthenticated, logout } = useAuth();
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
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "60vh",
                }}
            >
                <Loading size="large" />
            </div>
        );
    }

    if (blocked) {
        return <MaintenancePage />;
    }

    return <Outlet />;
};

export default MaintenanceGuard;
