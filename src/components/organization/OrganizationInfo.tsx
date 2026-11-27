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

const OrganizationInfo: React.FC<OrganizationInfoProps> = ({ org, stats, repoCount, onJoin, onLeave, onToggleStatus, onDelete }) => {
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
            <div className={styles.hero}>
                <div className={styles.heroTop}>
                    <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
                        <FaArrowLeft /> {t("info.back")}
                    </button>
                    <div className={styles.heroActions}>
                        {org.is_owner ? (
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
                                            className={org.status === "active" ? styles.moreMenuWarning : styles.moreMenuSuccess}
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
                        ) : org.user_in_org === OrgMembershipStatus.JOINED ? (
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
                        ) : org.user_in_org === OrgMembershipStatus.PENDING ? (
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
                        ) : (
                            <button
                                className={styles.joinBtn}
                                onClick={onJoin}
                                disabled={org.status !== "active"}
                                title={org.status !== "active" ? t("info.joinDisabled") : ""}
                            >
                                <FaPlus />
                                {org.user_in_org === OrgMembershipStatus.LEFT ? t("info.rejoin") : t("info.applyJoin")}
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.heroMain}>
                    <div className={styles.heroAvatar} aria-hidden="true">
                        <FaBuilding />
                    </div>
                    <div className={styles.heroBody}>
                        <div className={styles.heroTitleRow}>
                            <h1 className={styles.heroTitle}>{org.name}</h1>
                            <span className={styles.orgType}>{org.type}</span>
                            <span className={org.status === "active" ? styles.statusActive : styles.statusInactive}>
                                {org.status === "active" ? <FaCheckCircle /> : <FaLock />}
                                {org.status === "active" ? t("info.status.active") : t("info.status.inactive")}
                            </span>
                            {org.is_owner && (
                                <span className={styles.ownerBadge}>
                                    <FaCrown /> {t("info.owner")}
                                </span>
                            )}
                            {!org.is_owner &&
                                (org.user_in_org === OrgMembershipStatus.JOINED ||
                                    org.user_in_org === OrgMembershipStatus.PENDING) && (
                                    <span className={styles.joined}>{enums.orgMembershipStatus[org.user_in_org]}</span>
                                )}
                        </div>
                        {org.description && <p className={styles.heroDescription}>{org.description}</p>}
                    </div>
                </div>
            </div>

            <div className={styles.statsRow}>
                <div className={styles.statItem}>
                    <span className={`${styles.statIcon} ${styles.primary}`} aria-hidden="true">
                        <FaUserFriends />
                    </span>
                    <span className={styles.statText}>
                        <span className={styles.statValue}>{stats.totalMembers}</span>
                        <span className={styles.statLabel}>{t("info.stats.totalMembers")}</span>
                    </span>
                </div>
                <div className={styles.statItem}>
                    <span className={`${styles.statIcon} ${styles.success}`} aria-hidden="true">
                        <FaCheckCircle />
                    </span>
                    <span className={styles.statText}>
                        <span className={styles.statValue}>{stats.activeMembers}</span>
                        <span className={styles.statLabel}>{t("info.stats.activeMembers")}</span>
                    </span>
                </div>
                <div className={styles.statItem}>
                    <span className={`${styles.statIcon} ${styles.warning}`} aria-hidden="true">
                        <FaUser />
                    </span>
                    <span className={styles.statText}>
                        <span className={styles.statValue}>{stats.orgAdminMembers}</span>
                        <span className={styles.statLabel}>{t("info.stats.orgAdmins")}</span>
                    </span>
                </div>
                <div className={styles.statItem}>
                    <span className={`${styles.statIcon} ${styles.error}`} aria-hidden="true">
                        <FaUserAlt />
                    </span>
                    <span className={styles.statText}>
                        <span className={styles.statValue}>{stats.regularMembers}</span>
                        <span className={styles.statLabel}>{t("info.stats.regularMembers")}</span>
                    </span>
                </div>
                <div className={styles.statItem}>
                    <span className={`${styles.statIcon} ${styles.info}`} aria-hidden="true">
                        <FaGithub />
                    </span>
                    <span className={styles.statText}>
                        <span className={styles.statValue}>{repoCount}</span>
                        <span className={styles.statLabel}>{t("info.stats.repos")}</span>
                    </span>
                </div>
            </div>
        </>
    );
};

export default OrganizationInfo;
