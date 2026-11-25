import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    FaBuilding,
    FaCheckCircle,
    FaLock,
    FaUserFriends,
    FaArrowLeft,
    FaPlus,
    FaUser,
    FaUserAlt,
    FaGithub,
    FaCrown,
    FaPowerOff,
    FaTrash,
    FaSignOutAlt,
    FaChevronDown,
} from "react-icons/fa";
import Button from "@/components/button/Button";
import type { OrganizationDetail, MemberStats } from "@/types/Organization.ts";
import { OrgMembershipStatus } from "@/types/Enums.ts";
import { useEnumLabels } from "@/i18n/UseEnumLabels";
import styles from "./Organization.module.css";

interface OrganizationInfoProps {
    org: OrganizationDetail | null;
    stats: MemberStats;
    repoCount: number;
    onJoin: () => void;
    onLeave: () => Promise<void>;
    onToggleStatus: () => Promise<void>;
    onDelete: () => Promise<void>;
}

const OrganizationInfo: React.FC<OrganizationInfoProps> = ({
    org,
    stats,
    repoCount,
    onJoin,
    onLeave,
    onToggleStatus,
    onDelete,
}) => {
    const navigate = useNavigate();
    const enums = useEnumLabels();
    const { t } = useTranslation("organization");
    const [busy, setBusy] = useState<"leave" | "status" | "delete" | null>(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    const runAction = async (key: "leave" | "status" | "delete", action: () => Promise<void>) => {
        setBusy(key);
        try {
            await action();
        } finally {
            setBusy(null);
        }
    };

    useEffect(() => {
        if (!moreOpen) {
            return;
        }
        const handleClickOutside = (event: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
                setMoreOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMoreOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [moreOpen]);

    if (!org) {
        return null;
    }

    return (
        <>
            <div className={styles.cardHeader}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <FaArrowLeft /> {t("info.back")}
                </button>
                <div className={styles.headerContent}>
                    <div className={styles.titleGroup}>
                        <h1 className={styles.pageTitle}>
                            <FaBuilding /> {org.name}
                        </h1>
                        <span className={styles.orgType}>{org.type}</span>
                    </div>
                    <div className={styles.headerRight}>
                        <span className={org.status === "active" ? styles.statusActive : styles.statusInactive}>
                            {org.status === "active" ? <FaCheckCircle /> : <FaLock />}
                            {org.status === "active" ? t("info.status.active") : t("info.status.inactive")}
                        </span>
                        {org.is_owner ? (
                            <>
                                <span className={styles.ownerBadge}>
                                    <FaCrown /> {t("info.owner")}
                                </span>
                                <div className={styles.headerActions}>
                                    <div className={styles.moreMenuWrapper} ref={moreRef}>
                                        <Button
                                            variant="light"
                                            color="secondary"
                                            size="small"
                                            loading={busy === "status" || busy === "delete"}
                                            onClick={() => setMoreOpen((open) => !open)}
                                            aria-haspopup="menu"
                                            aria-expanded={moreOpen}
                                        >
                                            {t("info.more")} <FaChevronDown />
                                        </Button>
                                        {moreOpen && (
                                            <div className={styles.moreMenu} role="menu">
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    className={
                                                        org.status === "active"
                                                            ? styles.moreMenuWarning
                                                            : styles.moreMenuSuccess
                                                    }
                                                    disabled={busy !== null}
                                                    onClick={() => {
                                                        setMoreOpen(false);
                                                        void runAction("status", onToggleStatus);
                                                    }}
                                                >
                                                    {org.status === "active" ? <FaPowerOff /> : <FaCheckCircle />}
                                                    {org.status === "active" ? t("info.disable") : t("info.enable")}
                                                </button>
                                                <div className={styles.moreMenuDivider} />
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    className={styles.moreMenuDanger}
                                                    disabled={busy !== null}
                                                    onClick={() => {
                                                        setMoreOpen(false);
                                                        void runAction("delete", onDelete);
                                                    }}
                                                >
                                                    <FaTrash /> {t("info.delete")}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : org.user_in_org === OrgMembershipStatus.JOINED ? (
                            <>
                                <span className={styles.joined}>{enums.orgMembershipStatus[org.user_in_org]}</span>
                                <div className={styles.headerActions}>
                                    <Button
                                        variant="light"
                                        color="error"
                                        size="small"
                                        loading={busy === "leave"}
                                        disabled={busy !== null && busy !== "leave"}
                                        onClick={() => void runAction("leave", onLeave)}
                                    >
                                        <FaSignOutAlt /> {t("info.leave")}
                                    </Button>
                                </div>
                            </>
                        ) : org.user_in_org === OrgMembershipStatus.PENDING ? (
                            <>
                                <span className={styles.joined}>{enums.orgMembershipStatus[org.user_in_org]}</span>
                                <div className={styles.headerActions}>
                                    <Button
                                        variant="light"
                                        color="warning"
                                        size="small"
                                        loading={busy === "leave"}
                                        disabled={busy !== null && busy !== "leave"}
                                        onClick={() => void runAction("leave", onLeave)}
                                    >
                                        <FaSignOutAlt /> {t("info.cancelApply")}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <button
                                className={styles.joinBtn}
                                onClick={onJoin}
                                disabled={org.status !== "active"}
                                title={org.status !== "active" ? t("info.joinDisabled") : ""}
                            >
                                <FaPlus /> {org.user_in_org === OrgMembershipStatus.LEFT ? t("info.rejoin") : t("info.applyJoin")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className={styles.description}>{org.description}</div>

            {/* 统计卡片 */}
            <div className={styles.statsContainer}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.primary}`}>
                        <FaUserFriends />
                    </div>
                    <div className={styles.statValue}>{stats.totalMembers}</div>
                    <div className={styles.statLabel}>{t("info.stats.totalMembers")}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.success}`}>
                        <FaCheckCircle />
                    </div>
                    <div className={styles.statValue}>{stats.activeMembers}</div>
                    <div className={styles.statLabel}>{t("info.stats.activeMembers")}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.warning}`}>
                        <FaUser />
                    </div>
                    <div className={styles.statValue}>{stats.orgAdminMembers}</div>
                    <div className={styles.statLabel}>{t("info.stats.orgAdmins")}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.error}`}>
                        <FaUserAlt />
                    </div>
                    <div className={styles.statValue}>{stats.regularMembers}</div>
                    <div className={styles.statLabel}>{t("info.stats.regularMembers")}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.info}`}>
                        <FaGithub />
                    </div>
                    <div className={styles.statValue}>{repoCount}</div>
                    <div className={styles.statLabel}>{t("info.stats.repos")}</div>
                </div>
            </div>
        </>
    );
};

export default OrganizationInfo;
