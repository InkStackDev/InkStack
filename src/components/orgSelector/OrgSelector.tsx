import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { FaBuilding, FaTimes, FaCheck } from "react-icons/fa";
import styles from "./OrgSelector.module.css";
import type { RdOrgInfo } from "@/types/RdPlatform.ts";

interface OrgSelectorProps {
    orgs: RdOrgInfo[];
    selectedOrgId: string;
    onChange: (orgId: string) => void;
    collapsed: boolean;
    /** URL 指定的组织不可用时，避免回退展示其它组织的名称 */
    invalid?: boolean;
}

const OrgSelector: React.FC<OrgSelectorProps> = ({ orgs, selectedOrgId, onChange, collapsed, invalid = false }) => {
    const { t } = useTranslation("components");
    const [open, setOpen] = useState(false);
    // 组织不可用时仍允许打开选择器，让用户切到其它可用组织
    const isSingle = orgs.length === 1 && !invalid;

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (orgs.length === 0) {
        return null;
    }

    const currentOrg = orgs.find((o) => o.orgId === selectedOrgId);
    const displayName = invalid
        ? t("orgSelector.unavailable")
        : currentOrg
          ? currentOrg.orgName
          : orgs[0]?.orgName || "";

    const options = orgs;

    const handleSelect = (orgId: string) => {
        onChange(orgId);
        setOpen(false);
    };

    const handleTriggerClick = () => {
        if (isSingle) {
            return;
        }
        setOpen(true);
    };

    return (
        <div className={`${styles.container} ${collapsed ? styles.collapsed : ""} ${isSingle ? styles.single : ""}`}>
            <button
                className={styles.trigger}
                onClick={handleTriggerClick}
                title={collapsed ? displayName : undefined}
                disabled={isSingle}
            >
                <FaBuilding className={styles.icon} />
                {!collapsed && <span className={styles.label}>{displayName}</span>}
            </button>

            {createPortal(
                <>
                    {/* 遮罩层 */}
                    <div className={`${styles.overlay} ${open ? styles.overlayVisible : ""}`} onClick={() => setOpen(false)} />

                    {/* 右侧滑出面板 */}
                    <div className={`${styles.panel} ${open ? styles.panelOpen : ""}`}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>{t("orgSelector.title")}</h3>
                            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className={styles.panelBody}>
                            {options.map((org) => {
                                const isSelected = org.orgId === selectedOrgId;
                                return (
                                    <div
                                        key={org.orgId}
                                        className={`${styles.optionCard} ${isSelected ? styles.optionCardSelected : ""}`}
                                        onClick={() => handleSelect(org.orgId)}
                                    >
                                        <div className={styles.optionCardLeft}>
                                            <div className={`${styles.optionAvatar} ${isSelected ? styles.optionAvatarActive : ""}`}>
                                                <FaBuilding />
                                            </div>
                                            <div className={styles.optionInfo}>
                                                <span className={styles.optionName}>{org.orgName}</span>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <span className={styles.checkIcon}>
                                                <FaCheck />
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>,
                document.body,
            )}
        </div>
    );
};

export default OrgSelector;
