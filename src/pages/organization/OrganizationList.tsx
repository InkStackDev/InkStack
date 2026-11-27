import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { encodeId } from "@/utils/HashId.ts";
import {
    FaArrowRight,
    FaBuilding,
    FaCheckCircle,
    FaClipboardList,
    FaClock,
    FaFlask,
    FaLock,
    FaPlus,
    FaSearch,
    FaUserFriends,
} from "react-icons/fa";
import Skeleton from "@/components/skeleton/Skeleton";
import Button from "@/components/button/Button";
import SearchBox from "@/components/searchBox/SearchBox";
import ErrorState from "@/components/errorState/ErrorState";
import ApplyCreateOrg from "@/components/orgApply/ApplyCreateOrg";
import styles from "./OrganizationList.module.css";
import OrganizationService, { type ApplyItem } from "@/services/OrganizationService.ts";
import RdPlatformService from "@/services/RdPlatformService.ts";
import AuthRequired from "@/components/auth/AuthRequired";
import { useAuth } from "@/contexts/AuthContext";
import { useDebouncedValue } from "@/hooks/UseDebouncedValue";

type OrganizationFilter = "all" | "active" | "inactive";

interface Organization {
    id: string;
    name: string;
    type: string;
    status: "active" | "inactive";
    description?: string;
    memberCount: number | null;
}

const FILTERS: OrganizationFilter[] = ["all", "active", "inactive"];
const APPLY_PAGE_SIZE = 20;

const OrganizationList: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation("organization");
    const { user: currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // URL 是筛选条件的唯一来源，刷新 / 从详情页返回时可恢复现场
    const statusParam = searchParams.get("status");
    const filter: OrganizationFilter = statusParam === "active" || statusParam === "inactive" ? statusParam : "all";
    const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
    const debouncedSearch = useDebouncedValue(searchInput, 250);

    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);
    const [applyVisible, setApplyVisible] = useState(false);
    const [pendingApply, setPendingApply] = useState<ApplyItem | null>(null);
    const [appliesToken, setAppliesToken] = useState(0);
    // 用户拥有研发平台访问权限的组织 ID，用于按组织展示「研发」入口
    const [rdOrgIds, setRdOrgIds] = useState<Set<string>>(new Set());
    const requestIdRef = useRef(0);

    // 依赖用户 / 重试令牌拉取组织列表；用请求序号丢弃过期响应，避免快速切换时结果错乱
    useEffect(() => {
        if (!currentUser) {
            setOrganizations([]);
            setLoading(false);
            setLoadFailed(false);
            return;
        }

        const requestId = ++requestIdRef.current;
        setLoading(true);
        setLoadFailed(false);

        OrganizationService.getOrganizationLists({})
            .then((res) => {
                if (requestId !== requestIdRef.current) {
                    return;
                }
                const mapped: Organization[] = (res.list ?? []).map((item) => ({
                    id: String(item.id),
                    name: item.name,
                    type: item.type,
                    status: Number(item.status) === 1 ? "active" : "inactive",
                    description: item.description,
                    memberCount: typeof item.count === "number" ? item.count : null,
                }));
                setOrganizations(mapped);
            })
            .catch(() => {
                if (requestId !== requestIdRef.current) {
                    return;
                }
                setOrganizations([]);
                setLoadFailed(true);
            })
            .finally(() => {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                }
            });

        return () => {
            requestIdRef.current += 1;
        };
    }, [currentUser, reloadToken]);

    // 研发权限只影响「研发」按钮是否展示，不阻塞组织列表本身
    useEffect(() => {
        if (!currentUser) {
            setRdOrgIds(new Set());
            return;
        }

        let cancelled = false;
        RdPlatformService.getMyOrganizations()
            .then((list) => {
                if (!cancelled) {
                    setRdOrgIds(new Set(list.map((item) => item.orgId)));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setRdOrgIds(new Set());
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currentUser]);

    // 查询我的待审核创建申请，用于展示「审核中」并避免重复提交
    useEffect(() => {
        if (!currentUser) {
            setPendingApply(null);
            return;
        }

        let cancelled = false;
        OrganizationService.getMyApplies({ page_num: 1, page_size: APPLY_PAGE_SIZE })
            .then((res) => {
                if (!cancelled) {
                    setPendingApply((res.list ?? []).find((item) => item.status === 0) ?? null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setPendingApply(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currentUser, appliesToken]);

    const query = debouncedSearch.trim().toLowerCase();

    const filteredOrganizations = useMemo(
        () =>
            organizations.filter((org) => {
                if (filter !== "all" && org.status !== filter) {
                    return false;
                }
                if (!query) {
                    return true;
                }
                return [org.name, org.type, org.description ?? ""].some((value) => value.toLowerCase().includes(query));
            }),
        [organizations, filter, query],
    );

    const counts = useMemo(
        () => ({
            all: organizations.length,
            active: organizations.filter((org) => org.status === "active").length,
            inactive: organizations.filter((org) => org.status === "inactive").length,
        }),
        [organizations],
    );

    const handleFilterChange = (nextFilter: OrganizationFilter) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (nextFilter === "all") {
                    next.delete("status");
                } else {
                    next.set("status", nextFilter);
                }
                return next;
            },
            { replace: true },
        );
    };

    const handleSearchChange = (value: string) => {
        setSearchInput(value);
        const trimmed = value.trim();
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (trimmed) {
                    next.set("q", trimmed);
                } else {
                    next.delete("q");
                }
                return next;
            },
            { replace: true },
        );
    };

    const handleClearFilters = () => {
        setSearchInput("");
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("q");
                next.delete("status");
                return next;
            },
            { replace: true },
        );
    };

    const handleApplyClose = () => {
        setApplyVisible(false);
        // 关闭后刷新申请状态，提交成功可立即显示「审核中」
        setAppliesToken((value) => value + 1);
    };

    const getStatusBadge = (status: Organization["status"]) => {
        switch (status) {
            case "active":
                return (
                    <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                        <FaCheckCircle /> {t("list.status.active")}
                    </span>
                );
            case "inactive":
                return (
                    <span className={`${styles.statusBadge} ${styles.statusInactive}`}>
                        <FaLock /> {t("list.status.inactive")}
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div className={styles.mainContent}>
                <AuthRequired message={t("list.authRequired")}>
                    <>
                        <div className={styles.pageHeader}>
                            <div className={styles.pageHeaderTop}>
                                <h1 className={styles.pageTitle}>
                                    <FaBuilding /> {t("list.title")}
                                </h1>
                                <div className={styles.headerActions}>
                                    {pendingApply && (
                                        <span
                                            className={styles.pendingBadge}
                                            title={t("list.pending", { name: pendingApply.org_name })}
                                        >
                                            <FaClock />
                                            <span className={styles.pendingText}>
                                                {t("list.pending", { name: pendingApply.org_name })}
                                            </span>
                                        </span>
                                    )}
                                    <Button
                                        onClick={() => setApplyVisible(true)}
                                        disabled={pendingApply !== null}
                                        title={pendingApply ? t("list.applyPendingHint") : undefined}
                                    >
                                        <FaPlus /> {pendingApply ? t("list.applyPending") : t("list.applyCreate")}
                                    </Button>
                                </div>
                            </div>
                            <div className={styles.toolbar}>
                                <div className={styles.searchWrap}>
                                    <SearchBox
                                        value={searchInput}
                                        onChange={handleSearchChange}
                                        placeholder={t("list.searchPlaceholder")}
                                        size="small"
                                    />
                                </div>
                                <div className={styles.filterBar} role="group" aria-label={t("list.filterLabel")}>
                                    {FILTERS.map((value) => {
                                        const active = filter === value;
                                        return (
                                            <Button
                                                key={value}
                                                className={styles.filterBtn}
                                                size="small"
                                                variant={active ? "solid" : "light"}
                                                color={active ? "primary" : "secondary"}
                                                aria-pressed={active}
                                                onClick={() => handleFilterChange(value)}
                                            >
                                                {t(`list.filter.${value}`)}
                                                <span className={active ? styles.filterCountActive : styles.filterCount}>
                                                    {counts[value]}
                                                </span>
                                            </Button>
                                        );
                                    })}
                                </div>
                                {!loading && !loadFailed && (
                                    <span className={styles.resultCount}>
                                        {t("list.total", { value: filteredOrganizations.length })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className={styles.grid}>
                                {/* 骨架屏加载状态 */}
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div key={index} className={styles.card}>
                                        <div className={styles.cardHeader}>
                                            <Skeleton variant="rectangular" width={100} height={24} style={{ borderRadius: "6px" }} />
                                            <Skeleton variant="rounded" width={80} height={24} style={{ borderRadius: "30px" }} />
                                        </div>

                                        <div style={{ margin: "1rem 0" }}>
                                            <Skeleton variant="text" width="80%" height={28} style={{ marginBottom: "0.5rem" }} />
                                            <Skeleton variant="text" lines={2} />
                                        </div>

                                        <div className={styles.cardFooter}>
                                            <div style={{ width: "120px" }}>
                                                <Skeleton variant="text" width="100%" />
                                            </div>
                                            <Skeleton variant="rectangular" width={100} height={36} style={{ borderRadius: "8px" }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : loadFailed ? (
                            <ErrorState
                                title={t("list.error.title")}
                                message={t("list.error.message")}
                                icon={<FaClipboardList />}
                                actionText={t("list.retry")}
                                onAction={() => setReloadToken((value) => value + 1)}
                            />
                        ) : filteredOrganizations.length > 0 ? (
                            <ul className={styles.grid}>
                                {filteredOrganizations.map((org) => (
                                    <li key={org.id} className={styles.card}>
                                        <div className={styles.cardHeader}>
                                            <span className={styles.courseBadge}>{org.type}</span>
                                            {getStatusBadge(org.status)}
                                        </div>

                                        <h2 className={styles.cardTitle}>{org.name}</h2>
                                        <p className={styles.cardDesc}>{org.description}</p>

                                        <div
                                            className={`${styles.cardFooter} ${org.memberCount === null ? styles.cardFooterEnd : ""}`}
                                        >
                                            {org.memberCount !== null && (
                                                <div className={styles.cardMetric}>
                                                    <FaUserFriends />
                                                    {t("list.memberCount", { value: org.memberCount })}
                                                </div>
                                            )}
                                            <div className={styles.cardActions}>
                                                {rdOrgIds.has(org.id) && (
                                                    <Button
                                                        size="small"
                                                        variant="light"
                                                        color="secondary"
                                                        onClick={() => navigate(`/rd?org=${encodeId(org.id, "organization")}`)}
                                                    >
                                                        <FaFlask />
                                                        {t("list.rd")}
                                                    </Button>
                                                )}
                                                <Button
                                                    size="small"
                                                    onClick={() =>
                                                        navigate(`/organization/detail/${encodeId(org.id, "organization")}`)
                                                    }
                                                >
                                                    {t("list.viewDetail")}
                                                    <FaArrowRight />
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : organizations.length === 0 ? (
                            <div className={styles.emptyState}>
                                <FaClipboardList className={styles.emptyIcon} />
                                <h2 className={styles.emptyText}>{t("list.empty.title")}</h2>
                                <p className={styles.emptySubtext}>{t("list.empty.subtitle")}</p>
                                {!pendingApply && (
                                    <Button className={styles.emptyAction} onClick={() => setApplyVisible(true)}>
                                        <FaPlus /> {t("list.applyCreate")}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <FaSearch className={styles.emptyIcon} />
                                <h2 className={styles.emptyText}>{t("list.emptyFiltered.title")}</h2>
                                <p className={styles.emptySubtext}>{t("list.emptyFiltered.subtitle")}</p>
                                <Button className={styles.emptyAction} variant="light" color="secondary" onClick={handleClearFilters}>
                                    {t("list.clearFilter")}
                                </Button>
                            </div>
                        )}
                    </>
                </AuthRequired>
            </div>

            <ApplyCreateOrg visible={applyVisible} onClose={handleApplyClose} />
        </>
    );
};

export default OrganizationList;
