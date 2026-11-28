import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaArrowDown, FaArrowUp, FaBug, FaLightbulb, FaMinus, FaPenNib, FaPlus } from "react-icons/fa";
import Avatar from "@/components/avatar/Avatar";
import Button from "@/components/button/Button";
import EmptyState from "@/components/emptyState/EmptyState";
import message from "@/components/message/Message";
import PageHeader from "@/components/pageHeader/PageHeader";
import Skeleton from "@/components/skeleton/Skeleton";
import CommentService from "@/services/CommentService";
import DashboardService, { type WorkbenchData } from "@/services/DashboardService";
import { formatRelativeTime } from "@/utils/Utils";
import styles from "./Dashboard.module.css";

interface HeatCell {
    key: string;
    count: number;
    future: boolean;
    today: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

function shiftDateKey(key: string, days: number): string {
    const [year, month, day] = key.split("-").map(Number);
    const shifted = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
    return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** 周一起算的星期序号：周一 0，周日 6 */
function mondayWeekday(key: string): number {
    const [year, month, day] = key.split("-").map(Number);
    return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

function heatLevel(count: number, maxCount: number): number {
    if (count <= 0 || maxCount <= 0) {
        return 0;
    }
    return Math.min(3, Math.ceil((count / maxCount) * 3));
}

function formatChange(value: number): string {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value}%`;
}

const Dashboard: React.FC = () => {
    const { t } = useTranslation("admin");
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [workbench, setWorkbench] = useState<WorkbenchData | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);

    const loadWorkbench = useCallback(async (showLoading: boolean = true) => {
        if (showLoading) {
            setLoading(true);
        }
        try {
            const data = await DashboardService.getWorkbench();
            setWorkbench(data);
        } catch {
            // 错误提示由 HTTP 拦截器统一处理；首次失败时保留 workbench 为 null 展示错误态
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadWorkbench();
    }, [loadWorkbench, reloadKey]);

    const handleCommentAction = async (id: string, action: "approve" | "reject") => {
        setActionId(id);
        try {
            if (action === "approve") {
                await CommentService.approve([id]);
                message.success(t("dashboard.workbench.comments.approved"));
            } else {
                await CommentService.reject([id]);
                message.success(t("dashboard.workbench.comments.rejected"));
            }
            await loadWorkbench(false);
        } catch {
            // 错误提示由 HTTP 拦截器统一处理
        } finally {
            setActionId(null);
        }
    };

    const heatData = useMemo(() => {
        if (!workbench) {
            return null;
        }

        const { start_date: startKey, end_date: endKey, weeks } = workbench.window;
        const counts = new Map(workbench.heatmap.days.map((day) => [day.date, day.count]));
        const cells: HeatCell[] = Array.from({ length: weeks * 7 }, (_, index) => {
            const key = shiftDateKey(startKey, index);
            return {
                key,
                count: counts.get(key) ?? 0,
                future: key > endKey,
                today: key === endKey,
            };
        });
        const heatWeeks: HeatCell[][] = Array.from({ length: weeks }, (_, index) => cells.slice(index * 7, index * 7 + 7));

        const sumRange = (fromKey: string, length: number) => {
            let total = 0;
            for (let index = 0; index < length; index += 1) {
                total += counts.get(shiftDateKey(fromKey, index)) ?? 0;
            }
            return total;
        };

        const endWeekday = mondayWeekday(endKey);
        const weekStart = shiftDateKey(endKey, -endWeekday);
        const weekly = workbench.states.published_this_week;
        const previousWeek = sumRange(shiftDateKey(weekStart, -7), endWeekday + 1);

        return {
            weeks: heatWeeks,
            weekly,
            weeklyDelta: weekly - previousWeek,
            heatTotal: workbench.heatmap.total,
            longestStreak: workbench.heatmap.longest_streak,
            maxCount: workbench.heatmap.max_count,
        };
    }, [workbench]);

    const weekdayLabels = useMemo(
        () => [
            t("dashboard.workbench.heatmap.weekdays.mon"),
            t("dashboard.workbench.heatmap.weekdays.tue"),
            t("dashboard.workbench.heatmap.weekdays.wed"),
            t("dashboard.workbench.heatmap.weekdays.thu"),
            t("dashboard.workbench.heatmap.weekdays.fri"),
            t("dashboard.workbench.heatmap.weekdays.sat"),
            t("dashboard.workbench.heatmap.weekdays.sun"),
        ],
        [t],
    );

    const pendingCount = workbench?.states.pending_review ?? 0;
    const weeklyPublished = workbench?.states.published_this_week ?? 0;
    const weeklyDelta = heatData?.weeklyDelta ?? 0;
    const headerDescription =
        loading || !workbench
            ? undefined
            : pendingCount > 0
              ? t("dashboard.workbench.description", { published: weeklyPublished, pending: pendingCount })
              : t("dashboard.workbench.descriptionClear", { published: weeklyPublished });

    const stateCards = [
        {
            key: "reviewing",
            tone: "warning",
            label: t("dashboard.workbench.states.reviewing"),
            value: workbench?.states.pending_review ?? 0,
            foot: t("dashboard.workbench.states.reviewingFoot"),
        },
        {
            key: "published",
            tone: "success",
            label: t("dashboard.workbench.states.published"),
            value: workbench?.states.published ?? 0,
            foot: t("dashboard.workbench.states.publishedFoot"),
        },
        {
            key: "weekly",
            tone: "primary",
            label: t("dashboard.workbench.states.weekly"),
            value: weeklyPublished,
            foot:
                weeklyDelta === 0
                    ? t("dashboard.workbench.states.weeklyFlat")
                    : t("dashboard.workbench.states.weeklyFoot", {
                          value: `${weeklyDelta > 0 ? "+" : ""}${weeklyDelta}`,
                      }),
        },
        {
            key: "rejected",
            tone: "error",
            label: t("dashboard.workbench.states.rejected"),
            value: workbench?.states.rejected ?? 0,
            foot: t("dashboard.workbench.states.rejectedFoot"),
        },
    ];

    const kpiItems = [
        {
            key: "users",
            label: t("dashboard.workbench.kpi.users"),
            value: workbench?.kpis.total_users ?? 0,
            change: workbench?.kpis.total_users_change ?? 0,
            to: "/admin/users",
        },
        {
            key: "articles",
            label: t("dashboard.workbench.kpi.articles"),
            value: workbench?.kpis.total_articles ?? 0,
            change: workbench?.kpis.total_articles_change ?? 0,
            to: "/admin/articles",
        },
        {
            key: "comments",
            label: t("dashboard.workbench.kpi.comments"),
            value: workbench?.kpis.total_comments ?? 0,
            change: workbench?.kpis.total_comments_change ?? 0,
            to: "/admin/comments",
        },
        {
            key: "activity",
            label: t("dashboard.workbench.kpi.activity"),
            value: workbench?.kpis.today_visits ?? 0,
            change: workbench?.kpis.today_visits_change ?? 0,
            to: null,
        },
    ];

    const renderDelta = (change: number) => {
        const tone = change > 0 ? styles.up : change < 0 ? styles.down : styles.flat;
        return (
            <span className={`${styles.delta} ${tone}`}>
                {change > 0 ? <FaArrowUp /> : change < 0 ? <FaArrowDown /> : <FaMinus />}
                {change === 0 ? "0%" : formatChange(change)}
            </span>
        );
    };

    return (
        <div className={styles.workbench}>
            <PageHeader
                className={styles.pageHeader}
                title={t("dashboard.workbench.title")}
                description={headerDescription}
                actions={
                    <>
                        <Button variant="outline" onClick={() => navigate("/admin/articles")}>
                            <FaPenNib />
                            {t("dashboard.workbench.actions.articles")}
                        </Button>
                        <Button onClick={() => navigate("/article/create")}>
                            <FaPlus />
                            {t("dashboard.workbench.actions.create")}
                        </Button>
                    </>
                }
            />

            {loading ? (
                <div className={styles.skeletonBody}>
                    <div className={styles.pipeline}>
                        {Array.from({ length: 4 }, (_, index) => (
                            <Skeleton key={index} variant="rounded" height={96} />
                        ))}
                    </div>
                    <div className={styles.mainGrid}>
                        <Skeleton variant="rounded" height={560} />
                        <div className={styles.rightColumn}>
                            <Skeleton variant="rounded" height={340} />
                            <Skeleton variant="rounded" height={196} />
                        </div>
                    </div>
                    <Skeleton variant="rounded" height={72} />
                </div>
            ) : !workbench ? (
                <EmptyState
                    title={t("dashboard.workbench.error.title")}
                    actionText={t("dashboard.workbench.error.retry")}
                    onAction={() => setReloadKey((key) => key + 1)}
                />
            ) : (
                <>
                    <div className={styles.pipeline}>
                        {stateCards.map((card) => (
                            <div key={card.key} className={`${styles.stageCard} ${styles[card.tone]}`}>
                                <span className={styles.stageLabel}>{card.label}</span>
                                <span className={styles.stageValue}>
                                    {card.value.toLocaleString()}
                                    <small>{t("dashboard.workbench.states.unit")}</small>
                                </span>
                                <span className={styles.stageFoot}>{card.foot}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.mainGrid}>
                        <section className={styles.card}>
                            <div className={styles.cardHead}>
                                <div>
                                    <h2 className={styles.cardTitle}>{t("dashboard.workbench.heatmap.title")}</h2>
                                    <p className={styles.cardSubtitle}>{t("dashboard.workbench.heatmap.subtitle")}</p>
                                </div>
                                <div className={styles.legend}>
                                    <span>{t("dashboard.workbench.heatmap.less")}</span>
                                    <i className={styles.legendCell} />
                                    <i className={`${styles.legendCell} ${styles.lv1}`} />
                                    <i className={`${styles.legendCell} ${styles.lv2}`} />
                                    <i className={`${styles.legendCell} ${styles.lv3}`} />
                                    <span>{t("dashboard.workbench.heatmap.more")}</span>
                                </div>
                            </div>

                            <div className={styles.heatmap}>
                                <div className={styles.heatmapHead}>
                                    <span />
                                    {weekdayLabels.map((label) => (
                                        <span key={label} className={styles.heatmapWeekday}>
                                            {label}
                                        </span>
                                    ))}
                                </div>
                                {heatData?.weeks.map((week) => (
                                    <div key={week[0].key} className={styles.heatmapRow}>
                                        <span className={styles.heatmapWeekNo}>{week[0].key.slice(5).replace("-", "/")}</span>
                                        {week.map((cell) => (
                                            <div
                                                key={cell.key}
                                                className={[
                                                    styles.heatCell,
                                                    cell.count > 0
                                                        ? styles[`lv${heatLevel(cell.count, heatData?.maxCount ?? 0)}`]
                                                        : "",
                                                    cell.future ? styles.future : "",
                                                    cell.today ? styles.today : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                                title={t("dashboard.workbench.heatmap.cell", {
                                                    date: cell.key,
                                                    value: cell.count,
                                                })}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>

                            <div className={styles.heatFooter}>
                                <span>{t("dashboard.workbench.heatmap.month", { value: heatData?.heatTotal ?? 0 })}</span>
                                <span>
                                    {t("dashboard.workbench.heatmap.streak", {
                                        value: heatData?.longestStreak ?? 0,
                                    })}
                                </span>
                            </div>

                            <div className={styles.recent}>
                                <div className={styles.recentHead}>
                                    <h3>{t("dashboard.workbench.recent.title")}</h3>
                                    <Link to="/admin/articles">{t("dashboard.workbench.comments.all")}</Link>
                                </div>
                                {workbench.recent_articles.length === 0 ? (
                                    <EmptyState variant="inline" title={t("dashboard.workbench.recent.empty")} />
                                ) : (
                                    workbench.recent_articles.map((article) => (
                                        <div key={article.id} className={styles.recentItem}>
                                            <Link to={`/article/${article.id}`} className={styles.recentTitle}>
                                                {article.title}
                                            </Link>
                                            <span className={styles.recentMeta}>
                                                {article.author} · {formatRelativeTime(Number(article.publish_time))}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <div className={styles.rightColumn}>
                            <section className={`${styles.card} ${styles.commentsCard}`}>
                                <div className={styles.cardHead}>
                                    <h2 className={styles.cardTitle}>
                                        {t("dashboard.workbench.comments.title")}
                                        {workbench.pending_comments.total > 0 && (
                                            <span className={styles.countBadge}>{workbench.pending_comments.total}</span>
                                        )}
                                    </h2>
                                    <Link to="/admin/comments" className={styles.cardLink}>
                                        {t("dashboard.workbench.comments.all")}
                                    </Link>
                                </div>

                                {workbench.pending_comments.list.length === 0 ? (
                                    <EmptyState variant="inline" title={t("dashboard.workbench.comments.empty")} />
                                ) : (
                                    <div className={styles.commentList}>
                                        {workbench.pending_comments.list.map((comment) => (
                                            <article key={comment.id} className={styles.commentItem}>
                                                <Avatar
                                                    src={comment.author?.avatar}
                                                    name={comment.author?.name || t("dashboard.workbench.comments.anonymous")}
                                                    size={30}
                                                />
                                                <div className={styles.commentBody}>
                                                    <div className={styles.commentHead}>
                                                        <strong>
                                                            {comment.author?.name || t("dashboard.workbench.comments.anonymous")}
                                                        </strong>
                                                        <span>{formatRelativeTime(comment.created_at)}</span>
                                                    </div>
                                                    <p className={styles.commentText}>{comment.content}</p>
                                                    <div className={styles.commentFoot}>
                                                        <Link to={`/article/${comment.article?.id}`} className={styles.articleLink}>
                                                            《{comment.article?.title}》
                                                        </Link>
                                                        <div className={styles.commentActions}>
                                                            <Button
                                                                size="small"
                                                                variant="light"
                                                                color="success"
                                                                loading={actionId === comment.id}
                                                                disabled={actionId !== null && actionId !== comment.id}
                                                                onClick={() => void handleCommentAction(comment.id, "approve")}
                                                            >
                                                                {t("dashboard.workbench.comments.approve")}
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                variant="light"
                                                                color="error"
                                                                disabled={actionId !== null}
                                                                onClick={() => void handleCommentAction(comment.id, "reject")}
                                                            >
                                                                {t("dashboard.workbench.comments.reject")}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section className={`${styles.card} ${styles.feedbackCard}`}>
                                <div className={styles.cardHead}>
                                    <h2 className={styles.cardTitle}>
                                        {t("dashboard.workbench.feedback.title")}
                                        {workbench.latest_feedback.total > 0 && (
                                            <span className={styles.countBadge}>{workbench.latest_feedback.total}</span>
                                        )}
                                    </h2>
                                    <Link to="/admin/feedbacks" className={styles.cardLink}>
                                        {t("dashboard.workbench.feedback.all")}
                                    </Link>
                                </div>

                                {workbench.latest_feedback.list.length === 0 ? (
                                    <EmptyState variant="inline" title={t("dashboard.workbench.feedback.empty")} />
                                ) : (
                                    <div className={styles.feedbackList}>
                                        {workbench.latest_feedback.list.map((item) => (
                                            <div key={item.id} className={styles.feedbackItem}>
                                                <span className={`${styles.feedbackIcon} ${styles[item.type]}`}>
                                                    {item.type === "bug" ? <FaBug /> : <FaLightbulb />}
                                                </span>
                                                <div className={styles.feedbackBody}>
                                                    <p className={styles.feedbackText}>{item.content}</p>
                                                    <span className={styles.feedbackMeta}>
                                                        {item.type === "bug"
                                                            ? t("dashboard.workbench.feedback.type.bug")
                                                            : item.type === "feature"
                                                              ? t("dashboard.workbench.feedback.type.feature")
                                                              : t("dashboard.workbench.feedback.type.other")}
                                                        {item.user_name ? ` · ${item.user_name}` : ""} ·{" "}
                                                        {formatRelativeTime(item.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>

                    <div className={styles.kpiBar}>
                        {kpiItems.map((item) => {
                            const content = (
                                <>
                                    <span className={styles.kpiLabel}>{item.label}</span>
                                    <span className={styles.kpiValue}>{item.value.toLocaleString()}</span>
                                    {renderDelta(item.change)}
                                </>
                            );
                            return item.to ? (
                                <Link key={item.key} to={item.to} className={styles.kpiItem}>
                                    {content}
                                </Link>
                            ) : (
                                <div key={item.key} className={styles.kpiItem}>
                                    {content}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
