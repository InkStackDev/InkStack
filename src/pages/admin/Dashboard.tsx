import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ECharts } from "@/utils/Echarts";
import {
    FaUsers,
    FaFileAlt,
    FaComments,
    FaEye,
    FaArrowUp,
    FaArrowDown,
    FaMinus,
    FaEdit,
    FaChartBar,
    FaCog,
    FaUserPlus,
    FaChevronRight,
} from "react-icons/fa";
import Loading from "@/components/loading/Loading";
import Avatar from "@/components/avatar/Avatar";
import DashboardService, {
    type DashboardStats,
    type DashboardTrend,
    type DashboardActivity,
    type DashboardRecentUser,
} from "@/services/DashboardService.ts";
import type { PlatformRole } from "@/types/Roles.ts";
import { useEnumLabels } from "@/i18n/UseEnumLabels";
import { useTheme } from "@/contexts/ThemeContext";
import { getThemeFontFamily } from "@/utils/ThemeFont";
import { resolveBackendMessage } from "@/utils/AppConfig.ts";
import styles from "./Dashboard.module.css";

const Dashboard: React.FC = () => {
    const { t } = useTranslation("admin");
    const { t: tCal } = useTranslation("calendar");
    const enums = useEnumLabels();
    const { preset } = useTheme();
    const [selectedPeriod, setSelectedPeriod] = React.useState("7天");
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<ECharts | null>(null);
    const [echartsModule, setEchartsModule] = useState<typeof import("@/utils/Echarts") | null>(null);

    // 图表库延迟加载：先渲染统计卡片，再加载 ECharts
    useEffect(() => {
        let cancelled = false;
        void import("@/utils/Echarts").then((module) => {
            if (!cancelled) {
                setEchartsModule(module);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [trendData, setTrendData] = useState<DashboardTrend | null>(null);
    const [activities, setActivities] = useState<DashboardActivity[]>([]);
    const [recentUsers, setRecentUsers] = useState<DashboardRecentUser[]>([]);

    // 首次加载：stats + activities + recent-users（趋势数据由下方周期 effect 负责）
    useEffect(() => {
        const fetchOnce = async () => {
            setLoading(true);
            try {
                const [statsRes, activitiesRes, usersRes] = await Promise.all([
                    DashboardService.getStats(),
                    DashboardService.getActivities(5),
                    DashboardService.getRecentUsers(5),
                ]);
                setStats(statsRes);
                setActivities(activitiesRes.list || []);
                setRecentUsers(usersRes.list || []);
            } catch {
                // error handled by interceptor
            } finally {
                setLoading(false);
            }
        };
        fetchOnce();
    }, []);

    // 切换周期时仅重新请求趋势数据
    useEffect(() => {
        const fetchTrend = async () => {
            try {
                const trendRes = await DashboardService.getTrend(selectedPeriod === "7天" ? 7 : selectedPeriod === "30天" ? 30 : 90);
                setTrendData(trendRes);
            } catch {
                // error handled by interceptor
            }
        };
        void fetchTrend();
    }, [selectedPeriod]);

    // 快速操作数据
    const quickActions = [
        {
            title: t("dashboard.quickActions.createArticle.title"),
            description: t("dashboard.quickActions.createArticle.description"),
            icon: <FaEdit />,
            path: "/article/create",
        },
        {
            title: t("dashboard.quickActions.addUser.title"),
            description: t("dashboard.quickActions.addUser.description"),
            icon: <FaUserPlus />,
            path: "/admin/users",
        },
        {
            title: t("dashboard.quickActions.systemSettings.title"),
            description: t("dashboard.quickActions.systemSettings.description"),
            icon: <FaCog />,
            path: "/admin/settings",
        },
        {
            title: t("dashboard.quickActions.viewMetrics.title"),
            description: t("dashboard.quickActions.viewMetrics.description"),
            icon: <FaChartBar />,
            path: "/admin/metrics",
        },
    ];

    const getChangeType = (change: number): "positive" | "negative" | "neutral" => {
        if (change > 0) {
            return "positive";
        }
        if (change < 0) {
            return "negative";
        }
        return "neutral";
    };

    const formatChange = (change: number) => (change > 0 ? "+" : "") + change + "%";

    // 统计卡片数据（从 API 数据派生）
    const statCards = stats
        ? [
              {
                  title: t("dashboard.stats.totalUsers"),
                  value: stats.total_users.toLocaleString(),
                  change: formatChange(stats.total_users_change),
                  changeType: getChangeType(stats.total_users_change),
                  icon: <FaUsers />,
                  iconColor: "blue" as const,
              },
              {
                  title: t("dashboard.stats.totalArticles"),
                  value: stats.total_articles.toLocaleString(),
                  change: formatChange(stats.total_articles_change),
                  changeType: getChangeType(stats.total_articles_change),
                  icon: <FaFileAlt />,
                  iconColor: "green" as const,
              },
              {
                  title: t("dashboard.stats.totalComments"),
                  value: stats.total_comments.toLocaleString(),
                  change: formatChange(stats.total_comments_change),
                  changeType: getChangeType(stats.total_comments_change),
                  icon: <FaComments />,
                  iconColor: "orange" as const,
              },
              {
                  title: t("dashboard.stats.todayActivity"),
                  value: stats.today_visits.toLocaleString(),
                  change: formatChange(stats.today_visits_change),
                  changeType: getChangeType(stats.today_visits_change),
                  icon: <FaEye />,
                  iconColor: "purple" as const,
                  hint: t("dashboard.stats.activityHint"),
              },
              {
                  title: t("dashboard.stats.newUsers"),
                  value: stats.new_users_today.toLocaleString(),
                  change: formatChange(stats.new_users_today_change),
                  changeType: getChangeType(stats.new_users_today_change),
                  icon: <FaUserPlus />,
                  iconColor: "blue" as const,
              },
          ]
        : [];

    // 活动图标映射
    const getActivityIcon = (type: DashboardActivity["type"]) => {
        switch (type) {
            case "user_register":
            case "profile_update":
                return <FaUsers />;
            case "article_publish":
                return <FaFileAlt />;
            case "comment_create":
                return <FaComments />;
            case "system_backup":
                return <FaCog />;
            default:
                return <FaUsers />;
        }
    };

    // 活动类型 -> CSS class
    const getActivityTypeClass = (type: DashboardActivity["type"]): string => {
        if (type === "user_register" || type === "profile_update") {
            return "user";
        }
        if (type === "article_publish") {
            return "article";
        }
        if (type === "comment_create") {
            return "comment";
        }
        return "system";
    };

    // 角色名称映射
    const getRoleName = (role: number) => {
        return enums.platformRole[role as PlatformRole] || String(role);
    };

    // 获取变化指示器
    const getChangeIndicator = (change: string, type: "positive" | "negative" | "neutral") => {
        const getIcon = () => {
            if (type === "positive") {
                return <FaArrowUp />;
            }
            if (type === "negative") {
                return <FaArrowDown />;
            }
            return <FaMinus />;
        };

        return (
            <span className={`${styles.statChange} ${styles[type]}`}>
                {getIcon()}
                {change}
            </span>
        );
    };

    // 获取活动图标样式
    const getActivityIconClass = (type: string) => {
        return `${styles.activityIcon} ${styles[type]}`;
    };

    // 初始化和更新ECharts图表
    useEffect(() => {
        if (!echartsModule || !chartRef.current) {
            return;
        }
        const echarts = echartsModule;

        // 初始化图表
        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current, "light", {
                renderer: "canvas",
            });
        }

        const chart = chartInstance.current;
        const data = trendData?.list || [];

        // 将后端返回的中文星期标签（如“周一”）本地化
        const localizedWeekdays = [
            tCal("weekdays.sun"),
            tCal("weekdays.mon"),
            tCal("weekdays.tue"),
            tCal("weekdays.wed"),
            tCal("weekdays.thu"),
            tCal("weekdays.fri"),
            tCal("weekdays.sat"),
        ];
        const axisLabels = data.map((item) => {
            if (typeof item.weekday === "number") {
                return localizedWeekdays[item.weekday] ?? item.label;
            }
            return resolveBackendMessage(item.label_id, item.label_params, item.label);
        });

        // ECharts配置
        const themeFont = getThemeFontFamily();
        const option = {
            textStyle: {
                fontFamily: themeFont,
            },
            tooltip: {
                trigger: "axis",
                backgroundColor: "#ffffff",
                borderColor: "#e1e5e9",
                borderWidth: 1,
                borderRadius: 6,
                padding: [8, 12],
                textStyle: {
                    color: "#333333",
                    fontSize: 12,
                    fontFamily: themeFont,
                },
                formatter: (params: any) => {
                    const point = params[0];
                    const dataIndex = point.dataIndex;
                    const item = data[dataIndex];
                    return `
                        <div style="padding: 4px 0;">
                            <div style="font-weight: 600; margin-bottom: 4px; color: #333;">${point.name}</div>
                            <div style="color: #4361ee; font-weight: 500;">${t("dashboard.chart.seriesName")}: ${point.value.toLocaleString()}</div>
                            <div style="font-size: 11px; color: #999999; margin-top: 4px;">${t("dashboard.chart.tooltipNote")}</div>
                            <div style="font-size: 11px; color: #666666; margin-top: 2px;">${item.date}</div>
                        </div>
                    `;
                },
            },
            grid: {
                left: "2%",
                right: "3%",
                bottom: 0,
                top: "8%",
                containLabel: true,
            },
            xAxis: {
                type: "category",
                data: axisLabels,
                axisLine: {
                    lineStyle: {
                        color: "#e1e5e9",
                        width: 1,
                    },
                },
                axisTick: {
                    show: false,
                },
                axisLabel: {
                    color: "#666666",
                    fontSize: 11,
                    interval: 0,
                    rotate: data.length > 4 ? 30 : 0,
                    margin: 8,
                    overflow: "truncate",
                    width: 60,
                },
            },
            yAxis: {
                type: "value",
                axisLine: {
                    show: false,
                },
                axisTick: {
                    show: false,
                },
                axisLabel: {
                    color: "#999999",
                    fontSize: 10,
                    margin: 4,
                    formatter: (value: number) => {
                        if (value >= 1000) {
                            return (value / 1000).toFixed(1) + "k";
                        }
                        return value.toString();
                    },
                },
                splitLine: {
                    lineStyle: {
                        color: "#f0f0f0",
                        type: "dashed",
                        width: 1,
                        opacity: 0.6,
                    },
                },
            },
            series: [
                {
                    name: t("dashboard.chart.seriesName"),
                    type: "line",
                    data: data.map((item) => item.visits),
                    smooth: true,
                    symbol: "circle",
                    symbolSize: 5,
                    sampling: "average",
                    lineStyle: {
                        width: 2.5,
                        color: "#4361ee",
                        shadowColor: "rgba(67, 97, 238, 0.3)",
                        shadowBlur: 8,
                        shadowOffsetY: 3,
                    },
                    itemStyle: {
                        color: "#4361ee",
                        borderColor: "#ffffff",
                        borderWidth: 2,
                        shadowColor: "rgba(67, 97, 238, 0.5)",
                        shadowBlur: 6,
                    },
                    areaStyle: {
                        color: {
                            type: "linear",
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                {
                                    offset: 0,
                                    color: "#4361ee",
                                    opacity: 0.25,
                                },
                                {
                                    offset: 0.6,
                                    color: "#4361ee",
                                    opacity: 0.08,
                                },
                                {
                                    offset: 1,
                                    color: "#4361ee",
                                    opacity: 0.01,
                                },
                            ],
                        },
                    },
                    emphasis: {
                        itemStyle: {
                            color: "#4361ee",
                            borderColor: "#ffffff",
                            borderWidth: 3,
                            shadowColor: "rgba(67, 97, 238, 0.8)",
                            shadowBlur: 10,
                        },
                        lineStyle: {
                            width: 3,
                            shadowBlur: 12,
                        },
                    },
                },
            ],
        };

        chart.setOption(option);

        // 响应式处理
        const handleResize = () => {
            chart.resize();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [echartsModule, selectedPeriod, trendData, t, tCal, preset]);

    // 渲染活动趋势图表
    const renderVisitTrendChart = () => {
        const totalVisits = trendData?.total_visits ?? 0;
        const avgVisits = trendData?.avg_visits ?? 0;
        const maxVisits = trendData?.max_visits ?? 0;

        return (
            <div className={styles.visitTrendChart}>
                <div className={styles.echartContainer} ref={chartRef} />
                <div className={styles.chartSummary}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel} title={t("dashboard.chart.activityHint")}>
                            {t("dashboard.chart.summary.total")}
                        </span>
                        <span className={styles.summaryValue}>{totalVisits.toLocaleString()}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel} title={t("dashboard.chart.activityHint")}>
                            {t("dashboard.chart.summary.avg")}
                        </span>
                        <span className={styles.summaryValue}>{avgVisits.toLocaleString()}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel} title={t("dashboard.chart.summary.peakHint")}>
                            {t("dashboard.chart.summary.peak")}
                        </span>
                        <span className={styles.summaryValue}>{maxVisits.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className={styles.dashboard}>
                <Loading text={t("dashboard.loading")} size="large" />
            </div>
        );
    }

    return (
        <div className={styles.dashboard}>
            {/* 页面头部 */}
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{t("dashboard.title")}</h1>
                <p className={styles.pageDescription}>{t("dashboard.description")}</p>
            </div>

            {/* 统计卡片 */}
            <div className={styles.statsGrid}>
                {statCards.map((stat, index) => (
                    <div key={index} className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <div className={`${styles.statIcon} ${styles[stat.iconColor]}`}>{stat.icon}</div>
                            {getChangeIndicator(stat.change, stat.changeType)}
                        </div>
                        <div className={styles.statValue}>{stat.value}</div>
                        <div className={styles.statLabel} title={stat.hint}>
                            {stat.title}
                            {stat.hint ? <span style={{ color: "var(--text-tertiary)", cursor: "help" }}> *</span> : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* 主要内容区域 */}
            <div className={styles.contentGrid}>
                {/* 图表区域 */}
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>
                            {t("dashboard.chart.title")}
                            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 400, marginLeft: "8px" }}>
                                {t("dashboard.chart.subtitle")}
                            </span>
                        </h3>
                        <div className={styles.chartActions}>
                            <button
                                className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${selectedPeriod === "7天" ? styles.active : ""}`}
                                onClick={() => setSelectedPeriod("7天")}
                            >
                                {t("dashboard.range.days7")}
                            </button>
                            <button
                                className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${selectedPeriod === "30天" ? styles.active : ""}`}
                                onClick={() => setSelectedPeriod("30天")}
                            >
                                {t("dashboard.range.days30")}
                            </button>
                            <button
                                className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${selectedPeriod === "90天" ? styles.active : ""}`}
                                onClick={() => setSelectedPeriod("90天")}
                            >
                                {t("dashboard.range.days90")}
                            </button>
                        </div>
                    </div>
                    <div className={styles.chartContainer}>{renderVisitTrendChart()}</div>
                </div>

                {/* 快速操作 */}
                <div className={styles.quickActionsCard}>
                    <h3 className={styles.quickActionsTitle}>{t("dashboard.quickActions.title")}</h3>
                    <div className={styles.quickActionsList}>
                        {quickActions.map((action, index) => (
                            <Link key={index} to={action.path} className={styles.quickActionItem}>
                                <div className={styles.quickActionIcon}>{action.icon}</div>
                                <div className={styles.quickActionContent}>
                                    <div className={styles.quickActionTitle}>{action.title}</div>
                                    <div className={styles.quickActionDescription}>{action.description}</div>
                                </div>
                                <FaChevronRight className={styles.quickActionArrow} />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* 底部内容 */}
            <div className={styles.bottomGrid}>
                {/* 最近活动 */}
                <div className={styles.recentActivityCard}>
                    <h3 className={styles.cardTitle}>{t("dashboard.recentActivity.title")}</h3>
                    <div className={styles.activityList}>
                        {activities.map((activity, index) => (
                            <div key={index} className={styles.activityItem}>
                                <div className={getActivityIconClass(getActivityTypeClass(activity.type))}>
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className={styles.activityContent}>
                                    <div className={styles.activityTitle}>
                                        {resolveBackendMessage(activity.title_id, activity.params, activity.title)}
                                    </div>
                                    <div className={styles.activityTime}>
                                        {resolveBackendMessage(activity.time_id, activity.time_params, activity.time)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 最近用户 */}
                <div className={styles.recentUsersCard}>
                    <h3 className={styles.cardTitle}>{t("dashboard.recentUsers.title")}</h3>
                    <div className={styles.userList}>
                        {recentUsers.map((user, index) => (
                            <div key={index} className={styles.userItem}>
                                <Avatar src={user.avatar} name={user.name} size={40} />
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{user.name}</div>
                                    <div className={styles.userRole}>{getRoleName(user.role)}</div>
                                </div>
                                <div
                                    className={styles.userStatus}
                                    style={{
                                        backgroundColor: user.status === "active" ? "var(--success)" : "var(--text-tertiary)",
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
