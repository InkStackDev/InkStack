import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FaGithub, FaStar, FaExternalLinkAlt, FaTrash, FaSync, FaEdit } from "react-icons/fa";
import Modal from "../modal/Modal";
import EmptyState from "../emptyState/EmptyState";
import Input from "../input/Input";
import message from "../message/Message";
import { confirm } from "../confirm/Confirm";
import { formatRelativeTime } from "@/utils/Utils.ts";
import OrganizationService from "@/services/OrganizationService.ts";
import styles from "./Organization.module.css";

/** 过滤语言字段中的控制字符 */
function cleanLang(lang: any): string {
    if (typeof lang !== "string") {
        return "";
    }
    let out = "";
    for (let i = 0; i < lang.length; i++) {
        const c = lang.charCodeAt(i);
        if (c >= 32) {
            out += lang[i];
        }
    }
    return out.trim();
}

// ---- types ----
export interface Repo {
    id: string;
    name: string;
    description: string;
    url: string;
    language: string;
    languageColor: string;
    stars: number;
    sortOrder: number;
    updatedAt: string | number;
    organizationId: string;
    hasToken: boolean;
    syncStatus: "idle" | "syncing" | "success" | "failed";
}

// ---- 语言颜色映射 ----
const languageColors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f7df1e",
    Python: "#3776ab",
    Go: "#00add8",
    Rust: "#dea584",
    Java: "#b07219",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Vue: "#41b883",
    Shell: "#89e051",
    Dockerfile: "#384d54",
    Kotlin: "#7f52ff",
    Swift: "#f05138",
};

// ---- component ----
interface Props {
    orgId: string;
    canManage: boolean;
    /** 外部触发列表刷新的信号，变化时静默重新拉取仓库列表 */
    refreshKey?: number;
    onChange?: (delta: number) => void;
    /** 空态下点击「添加仓库」的回调 */
    onAdd?: () => void;
}

const OrganizationRepos: React.FC<Props> = ({ orgId, canManage, refreshKey = 0, onChange, onAdd }) => {
    const { t } = useTranslation("organization");
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const requestIdRef = useRef(0);
    const previousOrgIdRef = useRef(orgId);

    // ---- 同步状态文案 ----
    const syncStatusText: Record<string, string> = {
        idle: t("repos.syncStatus.idle"),
        syncing: t("repos.syncStatus.syncing"),
        success: t("repos.syncStatus.success"),
        failed: t("repos.syncStatus.failed"),
    };

    // 编辑仓库 modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingRepo, setEditingRepo] = useState<Repo | null>(null);
    const [editForm, setEditForm] = useState({
        url: "",
        token: "",
    });
    const [editSaving, setEditSaving] = useState(false);

    // polling ref
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ---- 获取仓库列表 ----
    const fetchRepos = async () => {
        if (!orgId) {
            return;
        }
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        try {
            const res = await OrganizationService.getRepos({ org_id: orgId });
            if (requestId !== requestIdRef.current) {
                return;
            }
            setRepos(
                (res.list || []).map((item: any) => ({
                    id: String(item.id),
                    name: item.name || "",
                    description: item.description || "",
                    url: item.url || "",
                    language: cleanLang(item.language),
                    languageColor: languageColors[cleanLang(item.language)] || "#6c757d",
                    stars: item.stars_count ?? 0,
                    sortOrder: item.sort_order ?? 0,
                    updatedAt:
                        item.updated_at == null || (typeof item.updated_at === "number" && item.updated_at > 9999999999999)
                            ? ""
                            : item.updated_at,
                    organizationId: String(item.org_id ?? ""),
                    hasToken: item.has_token ?? false,
                    syncStatus: item.sync_status || "idle",
                })),
            );
        } catch (err: any) {
            if (requestId !== requestIdRef.current) {
                return;
            }
            message.error(err?.message || t("repos.fetchFailed"));
        }
    };

    useEffect(() => {
        if (!orgId) {
            requestIdRef.current += 1;
            setRepos([]);
            setLoading(false);
            return;
        }

        const orgChanged = previousOrgIdRef.current !== orgId;
        previousOrgIdRef.current = orgId;
        if (orgChanged) {
            setRepos([]);
            setLoading(true);
        }

        let cancelled = false;
        fetchRepos().finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
            requestIdRef.current += 1;
        };
    }, [orgId, refreshKey]);

    // ---- 轮询同步状态 ----
    useEffect(() => {
        const hasSyncing = repos.some((r) => r.syncStatus === "syncing");
        if (hasSyncing) {
            if (!pollingRef.current) {
                pollingRef.current = setInterval(() => {
                    fetchRepos();
                }, 3000);
            }
        } else {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        }
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [repos]);

    // ---- 删除仓库 ----
    const handleDeleteRepo = async (e: React.MouseEvent, repo: Repo) => {
        e.preventDefault();
        e.stopPropagation();
        await confirm({
            title: t("repos.deleteConfirm.title"),
            content: (
                <div>
                    {t("repos.deleteConfirm.before")}
                    <strong>{repo.name}</strong>
                    {t("repos.deleteConfirm.after")}
                </div>
            ),
            confirmText: t("repos.deleteConfirm.confirm"),
            cancelText: t("repos.deleteConfirm.cancel"),
            onConfirm: async () => {
                try {
                    await OrganizationService.deleteRepo({ id: repo.id, org_id: orgId });
                    setRepos((prev) => prev.filter((r) => r.id !== repo.id));
                    message.success(t("repos.deleteSuccess"));
                    onChange?.(-1);
                } catch {
                    message.error(t("repos.deleteFailed"));
                }
            },
        });
    };

    // ---- 编辑仓库 ----
    const openEditModal = (e: React.MouseEvent, repo: Repo) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingRepo(repo);
        setEditForm({
            url: repo.url,
            token: "",
        });
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        const url = editForm.url.trim();
        if (!url) {
            message.warn(t("repos.editModal.urlRequired"));
            return;
        }
        if (!url.startsWith("https://github.com/")) {
            message.warn(t("repos.editModal.githubOnly"));
            return;
        }
        if (!editingRepo) {
            return;
        }
        setEditSaving(true);
        try {
            await OrganizationService.updateRepo({
                id: editingRepo.id,
                url,
                token: editForm.token.trim() || undefined,
            });
            setEditModalVisible(false);
            setEditingRepo(null);
            message.success(t("repos.editSuccess"));
            await fetchRepos();
        } catch (err: any) {
            message.error(err?.message || t("repos.editFailed"));
        } finally {
            setEditSaving(false);
        }
    };

    // ---- 同步仓库 ----
    const handleSyncRepo = async (e: React.MouseEvent, repo: Repo) => {
        e.preventDefault();
        e.stopPropagation();
        if (repo.syncStatus === "syncing") {
            return;
        }
        setRepos((prev) => prev.map((r) => (r.id === repo.id ? { ...r, syncStatus: "syncing" as const } : r)));
        try {
            await OrganizationService.syncRepo({ repo_id: repo.id });
        } catch {
            setRepos((prev) => prev.map((r) => (r.id === repo.id ? { ...r, syncStatus: "failed" as const } : r)));
            message.error(t("repos.syncFailed"));
        }
    };

    if (loading) {
        return (
            <div className={styles.repoSection}>
                <div className={styles.repoGrid}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={styles.repoCard} style={{ opacity: 0.6 }}>
                            <div
                                style={{
                                    height: "20px",
                                    width: "60%",
                                    background: "var(--bg-secondary)",
                                    borderRadius: "4px",
                                    marginBottom: "12px",
                                }}
                            />
                            <div
                                style={{
                                    height: "14px",
                                    width: "90%",
                                    background: "var(--bg-secondary)",
                                    borderRadius: "4px",
                                    marginBottom: "8px",
                                }}
                            />
                            <div style={{ height: "14px", width: "70%", background: "var(--bg-secondary)", borderRadius: "4px" }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.repoSection}>
            {repos.length === 0 ? (
                <EmptyState
                    icon={<FaGithub />}
                    title={t("repos.empty")}
                    description={t("repos.emptyHint")}
                    actionText={canManage && onAdd ? t("repos.emptyAction") : undefined}
                    onAction={canManage && onAdd ? onAdd : undefined}
                />
            ) : (
                <div className={styles.repoGrid}>
                    {repos.map((repo) => (
                        <div
                            key={repo.id}
                            className={styles.repoCard}
                            onClick={() => window.open(repo.url, "_blank", "noopener,noreferrer")}
                        >
                            <div className={styles.repoCardHeader}>
                                <FaGithub className={styles.repoIcon} />
                                <span className={styles.repoName}>{repo.name}</span>
                                <FaExternalLinkAlt className={styles.repoExternalIcon} />
                                {canManage && (
                                    <>
                                        <span
                                            className={`${styles.repoSyncBtn} ${repo.syncStatus === "syncing" ? styles.repoSyncSpinning : ""}`}
                                            title={syncStatusText[repo.syncStatus]}
                                            onClick={(e) => handleSyncRepo(e, repo)}
                                        >
                                            <FaSync size={10} />
                                        </span>
                                        <span
                                            className={styles.repoEditBtn}
                                            title={t("repos.editTitle")}
                                            onClick={(e) => openEditModal(e, repo)}
                                        >
                                            <FaEdit size={11} />
                                        </span>
                                        <button
                                            className={styles.repoDeleteBtn}
                                            title={t("repos.deleteTitle")}
                                            onClick={(e) => handleDeleteRepo(e, repo)}
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    </>
                                )}
                            </div>
                            <p className={styles.repoDescription}>{repo.description}</p>
                            <div className={styles.repoMeta}>
                                <span className={styles.repoLanguage}>
                                    <span className={styles.repoLanguageDot} style={{ backgroundColor: repo.languageColor }} />
                                    {repo.language || "N/A"}
                                </span>
                                <span className={styles.repoStars}>
                                    <FaStar /> {repo.stars}
                                </span>
                                <span className={styles.repoSyncStatus}>
                                    <span
                                        className={`${styles.syncStatusDot} ${
                                            repo.syncStatus === "success"
                                                ? styles.syncStatusDone
                                                : repo.syncStatus === "failed"
                                                  ? styles.syncStatusFailed
                                                  : repo.syncStatus === "syncing"
                                                    ? styles.syncStatusSyncing
                                                    : styles.syncStatusIdle
                                        }`}
                                    />
                                    {syncStatusText[repo.syncStatus]}
                                </span>
                                <span className={styles.repoUpdated}>{formatRelativeTime(repo.updatedAt)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 编辑仓库 Modal */}
            <Modal
                visible={editModalVisible}
                title={editingRepo ? t("repos.editModal.titleWithRepo", { name: editingRepo.name }) : t("repos.editModal.title")}
                onClose={() => setEditModalVisible(false)}
                width={520}
                footer={
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                        <button className={styles.cancelButton} onClick={() => setEditModalVisible(false)}>
                            {t("repos.editModal.cancel")}
                        </button>
                        <button className={styles.confirmButton} onClick={handleSaveEdit} disabled={editSaving}>
                            {editSaving ? t("repos.editModal.saving") : t("repos.editModal.save")}
                        </button>
                    </div>
                }
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                        <label className={styles.formLabel}>{t("repos.editModal.urlLabel")}</label>
                        <Input
                            value={editForm.url}
                            onChange={(v) => setEditForm((prev) => ({ ...prev, url: v }))}
                            placeholder={t("repos.editModal.urlPlaceholder")}
                            maxLength={512}
                            size="large"
                        />
                    </div>
                    <div>
                        <label className={styles.formLabel}>{t("repos.editModal.tokenLabel")}</label>
                        <Input
                            type="password"
                            value={editForm.token}
                            onChange={(v) => setEditForm((prev) => ({ ...prev, token: v }))}
                            placeholder={t("repos.editModal.tokenPlaceholder")}
                            maxLength={512}
                            size="large"
                        />
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "6px 0 0" }}>
                            {editingRepo?.hasToken ? t("repos.editModal.tokenKeepHint") : t("repos.editModal.tokenHint")}
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default OrganizationRepos;
