import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { encodeId } from "@/utils/HashId.ts";
import { FaArrowRight, FaBuilding, FaClipboardList, FaClock, FaFlask, FaPlus, FaSearch, FaUserFriends } from "react-icons/fa";
import Skeleton from "@/components/skeleton/Skeleton";
import Button from "@/components/button/Button";
import SearchBox from "@/components/searchBox/SearchBox";
import ErrorState from "@/components/errorState/ErrorState";
import EmptyState from "@/components/emptyState/EmptyState";
import PageHeader from "@/components/pageHeader/PageHeader";
import ApplyCreateOrg from "@/components/orgApply/ApplyCreateOrg";
import styles from "./OrganizationList.module.css";
import OrganizationService, { type ApplyItem } from "@/services/OrganizationService.ts";
import RdPlatformService from "@/services/RdPlatformService.ts";
import AuthRequired from "@/components/auth/AuthRequired";
import { useAuth } from "@/contexts/AuthContext";
import { useDebouncedValue } from "@/hooks/UseDebouncedValue";
import { formatDateTime } from "@/utils/Utils";

type OrganizationFilter = "all" | "active" | "inactive";

interface Organization {
    id: string;
    name: string;
    type: string;
    status: "active" | "inactive";
    description?: string;
    memberCount: number | null;
    createdAt?: number;
}

const FILTERS: OrganizationFilter[] = ["all", "active", "inactive"];
const APPLY_PAGE_SIZE = 20;
const AVATAR_TONES = 6;

/** 用组织名稳定散列到 6 个色相，让每张卡片有一致的识别色（明暗主题各自适配） */
const getAvatarTone = (name: string) => {
    let hash = 0;
    for (const char of name) {
        hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 997;
    }
    return hash % AVATAR_TONES;
};

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
                    createdAt: item.created_at,
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

    const getStatusBadge = (status: Organization["status"]) => (
        <span className={`${styles.statusBadge} ${status === "active" ? styles.statusActive : styles.statusInactive}`}>
            <span className={styles.statusDot} />
            {t(`list.status.${status}`)}
        </span>
    );

    return (
        <>
            <div className={styles.mainContent}>
                <AuthRequired message={t("list.authRequired")}>
                    <>
                        <PageHeader
                            title={
                                <>
                                    <FaBuilding /> {t("list.title")}
                                </>
                            }
                            description={t("list.description")}
                            actions={
                                <>
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
                                </>
                            }
                        />
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
                                <span className={styles.resultCount}>{t("list.total", { value: filteredOrganizations.length })}</span>
                            )}
                        </div>

                        {loading ? (
                            <div className={styles.grid} aria-hidden="true">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div key={index} className={`${styles.card} ${styles.skeletonCard}`}>
                                        <div className={styles.cardTop}>
                                            <Skeleton variant="circular" width={44} height={44} />
                                            <div className={styles.cardHeadText}>
                                                <Skeleton variant="text" width="65%" height={20} />
                                                <Skeleton variant="text" width="45%" height={14} style={{ marginTop: 8 }} />
                                            </div>
                                            <Skeleton variant="rounded" width={64} height={22} style={{ borderRadius: 999 }} />
                                        </div>
                                        <div className={styles.skeletonBody}>
                                            <Skeleton variant="text" lines={2} />
                                        </div>
                                        <div className={styles.cardFooter}>
                                            <Skeleton variant="text" width={90} height={12} />
                                            <Skeleton variant="rounded" width={92} height={30} style={{ borderRadius: 8 }} />
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
                                        <div className={styles.cardTop}>
                                            <span
                                                className={`${styles.orgAvatar} ${styles[`avatarTone${getAvatarTone(org.name)}`]}`}
                                                aria-hidden="true"
                                            >
                                                {org.name.trim().charAt(0).toUpperCase()}
                                            </span>
                                            <div className={styles.cardHeadText}>
                                                <h2 className={styles.cardTitle}>
                                                    <Link
                                                        to={`/organization/detail/${encodeId(org.id, "organization")}`}
                                                        className={styles.cardLink}
                                                    >
                                                        {org.name}
                                                    </Link>
                                                </h2>
                                                <div className={styles.cardMeta}>
                                                    <span className={styles.typeTag}>{org.type}</span>
                                                    {org.memberCount !== null && (
                                                        <span className={styles.metaItem}>
                                                            <FaUserFriends />
                                                            {t("list.memberCount", { value: org.memberCount })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {getStatusBadge(org.status)}
                                        </div>

                                        {org.description && <p className={styles.cardDesc}>{org.description}</p>}

                                        <div className={styles.cardFooter}>
                                            {org.createdAt ? (
                                                <span className={styles.createdAt}>
                                                    {t("list.createdAt", {
                                                        date: formatDateTime(org.createdAt).slice(0, 10),
                                                    })}
                                                </span>
                                            ) : (
                                                <span className={styles.createdAt} />
                                            )}
                                            <div className={styles.cardActions}>
                                                {rdOrgIds.has(org.id) && (
                                                    <Button
                                                        className={styles.rdBtn}
                                                        size="small"
                                                        variant="light"
                                                        color="secondary"
                                                        aria-label={t("list.rd")}
                                                        title={t("list.rd")}
                                                        onClick={() => navigate(`/rd?org=${encodeId(org.id, "organization")}`)}
                                                    >
                                                        <FaFlask />
                                                        <span className={styles.rdLabel}>{t("list.rd")}</span>
                                                    </Button>
                                                )}
                                                <span className={styles.cardCta} aria-hidden="true">
                                                    {t("list.viewDetail")}
                                                    <FaArrowRight />
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : organizations.length === 0 ? (
                            <EmptyState
                                icon={<FaClipboardList />}
                                title={t("list.empty.title")}
                                description={t("list.empty.subtitle")}
                                actionText={pendingApply ? undefined : t("list.applyCreate")}
                                onAction={pendingApply ? undefined : () => setApplyVisible(true)}
                            />
                        ) : (
                            <EmptyState
                                icon={<FaSearch />}
                                title={t("list.emptyFiltered.title")}
                                description={t("list.emptyFiltered.subtitle")}
                                actionText={t("list.clearFilter")}
                                onAction={handleClearFilters}
                            />
                        )}
                    </>
                </AuthRequired>
            </div>

            <ApplyCreateOrg visible={applyVisible} onClose={handleApplyClose} />
        </>
    );
};

export default OrganizationList;
