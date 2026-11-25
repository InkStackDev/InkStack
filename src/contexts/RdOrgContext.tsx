import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { RdPlatformService } from "../services/RdPlatformService.ts";
import type { RdOrgInfo } from "../types/RdPlatform.ts";
import { isAdmin as checkIsAdmin } from "../types/Roles.ts";

interface RdOrgContextType {
    orgs: RdOrgInfo[];
    userOrgIds: string[];
    isAdmin: boolean;
    loading: boolean;
    /** orgId → orgName 映射，用于详情展示 */
    orgNameMap: Record<string, string>;
    /** 用户在所有组织中的最高角色（1-5），用于前端权限判断 */
    maxOrgRole: number;
    /** 当前选中组织的角色（选中具体组织时返回该组织角色，全部组织时返回最高角色） */
    currentOrgRole: number;
    /** 当前选中的组织 ID */
    selectedOrgId: string;
    setSelectedOrgId: (orgId: string) => void;
    /** URL 指定的组织不存在、已停用或用户无权访问 */
    requestedOrgInvalid: boolean;
}

const RdOrgContext = createContext<RdOrgContextType>({
    orgs: [],
    userOrgIds: [],
    isAdmin: false,
    loading: true,
    orgNameMap: {},
    maxOrgRole: 1,
    currentOrgRole: 1,
    selectedOrgId: "",
    setSelectedOrgId: () => {},
    requestedOrgInvalid: false,
});

export const useRdOrg = (): RdOrgContextType => {
    const context = useContext(RdOrgContext);
    return context;
};

export const RdOrgProvider: React.FC<{ children: ReactNode; initialOrgId?: string }> = ({ children, initialOrgId = "" }) => {
    const { user } = useAuth();
    const [orgs, setOrgs] = useState<RdOrgInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrgId, setSelectedOrgId] = useState(initialOrgId);
    const [requestedOrgInvalid, setRequestedOrgInvalid] = useState(false);

    const isAdmin = checkIsAdmin(user?.role);

    const selectOrg = (orgId: string) => {
        setSelectedOrgId(orgId);
        setRequestedOrgInvalid(false);
    };

    useEffect(() => {
        if (!user) {
            setOrgs([]);
            setSelectedOrgId("");
            setRequestedOrgInvalid(false);
            setLoading(false);
            return;
        }

        const fetchOrgs = async () => {
            try {
                const list = await RdPlatformService.getMyOrganizations();
                const mapped = list.map((item) => ({ orgId: item.orgId, orgName: item.orgName, role: item.role }));
                setOrgs(mapped);
                if (initialOrgId) {
                    // URL 指定的组织必须仍在用户可访问的组织列表中；否则明确拦截，
                    // 不能静默 fallback 到第一个组织，否则看起来像“停用后还能进去”。
                    if (mapped.some((o) => o.orgId === initialOrgId)) {
                        setSelectedOrgId(initialOrgId);
                        setRequestedOrgInvalid(false);
                    } else {
                        setSelectedOrgId("");
                        setRequestedOrgInvalid(true);
                    }
                } else if (mapped.length > 0 && !selectedOrgId) {
                    setSelectedOrgId(mapped[0].orgId);
                }
            } catch {
                setOrgs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOrgs();
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const userOrgIds = useMemo(() => orgs.map((o) => o.orgId), [orgs]);

    const maxOrgRole = useMemo(() => {
        if (isAdmin) {
            return 5;
        } // 平台管理员等同于组织管理员权限
        if (orgs.length === 0) {
            return 1;
        }
        return Math.max(...orgs.map((o) => o.role));
    }, [orgs, isAdmin]);

    const currentOrgRole = useMemo(() => {
        if (isAdmin) {
            return 5;
        }
        if (!selectedOrgId) {
            return maxOrgRole;
        }
        // 选中具体组织 → 返回该组织下的角色
        const org = orgs.find((o) => o.orgId === selectedOrgId);
        return org ? org.role : maxOrgRole;
    }, [isAdmin, selectedOrgId, orgs, maxOrgRole]);

    const orgNameMap = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        orgs.forEach((o) => {
            map[o.orgId] = o.orgName;
        });
        return map;
    }, [orgs]);

    return (
        <RdOrgContext.Provider
            value={{
                orgs,
                userOrgIds,
                isAdmin,
                loading,
                orgNameMap,
                maxOrgRole,
                currentOrgRole,
                selectedOrgId,
                setSelectedOrgId: selectOrg,
                requestedOrgInvalid,
            }}
        >
            {children}
        </RdOrgContext.Provider>
    );
};

export default RdOrgContext;
