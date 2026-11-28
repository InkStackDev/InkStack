import http from "../infra/Http.ts";

export interface DashboardStats {
    total_users: number;
    total_users_change: number;
    total_articles: number;
    total_articles_change: number;
    total_comments: number;
    total_comments_change: number;
    today_visits: number;
    today_visits_change: number;
    new_users_today: number;
    new_users_today_change: number;
}

export interface TrendItem {
    label: string;
    label_id?: string;
    label_params?: Record<string, unknown>;
    weekday?: number;
    week_index?: number;
    date: string;
    visits: number;
}

export interface DashboardTrend {
    list: TrendItem[];
    total_visits: number;
    avg_visits: number;
    max_visits: number;
}

export interface DashboardActivity {
    type: "user_register" | "article_publish" | "comment_create" | "system_backup" | "profile_update";
    title: string;
    title_id?: string;
    params?: Record<string, unknown>;
    time: string;
    time_id?: string;
    time_params?: Record<string, unknown>;
    timestamp: number;
}

export interface DashboardRecentUser {
    name: string;
    role: number;
    avatar: string;
    status: "active" | "inactive";
}

export class DashboardService {
    static async getStats(): Promise<DashboardStats> {
        const response = await http.get<DashboardStats>("/admin/dashboard/stats", { cacheTtl: 15_000 });
        return response.data;
    }

    static async getTrend(period: number = 7): Promise<DashboardTrend> {
        const response = await http.get<DashboardTrend>("/admin/dashboard/trend", {
            params: { period },
            cacheTtl: 15_000,
        });
        return response.data;
    }

    static async getActivities(limit: number = 5): Promise<{ list: DashboardActivity[] }> {
        const response = await http.get<{ list: DashboardActivity[] }>("/admin/dashboard/activities", {
            params: { limit },
            cacheTtl: 15_000,
        });
        return response.data;
    }

    static async getRecentUsers(limit: number = 5): Promise<{ list: DashboardRecentUser[] }> {
        const response = await http.get<{ list: DashboardRecentUser[] }>("/admin/dashboard/recent-users", {
            params: { limit },
            cacheTtl: 15_000,
        });
        return response.data;
    }

    /** 仪表盘内容工作台聚合数据 */
    static async getWorkbench(weeks: number = 5): Promise<WorkbenchData> {
        const response = await http.get<WorkbenchData>("/admin/dashboard/workbench", {
            params: { weeks },
            cacheTtl: 15_000,
        });
        return response.data;
    }
}

export default DashboardService;

/** 内容工作台热力图单日数据 */
export interface WorkbenchHeatDay {
    date: string;
    count: number;
}

/** 内容工作台文章状态概览 */
export interface WorkbenchStates {
    pending_review: number;
    published: number;
    published_this_week: number;
    rejected: number;
}

/** 内容工作台最近发布文章 */
export interface WorkbenchRecentArticle {
    id: string;
    title: string;
    author: string;
    author_avatar: string;
    publish_time: number;
}

/** 内容工作台待审核评论 */
export interface WorkbenchPendingComment {
    id: string;
    content: string;
    created_at: number;
    author: {
        id: string;
        name: string;
        avatar: string;
    };
    article: {
        id: string;
        title: string;
    };
}

/** 内容工作台最新反馈 */
export interface WorkbenchFeedback {
    id: string;
    type: "bug" | "feature" | "other";
    content: string;
    user_name: string;
    user_avatar: string;
    created_at: number;
}

/** 内容工作台 KPI */
export interface WorkbenchKpis {
    total_users: number;
    total_users_change: number;
    total_articles: number;
    total_articles_change: number;
    total_comments: number;
    total_comments_change: number;
    today_visits: number;
    today_visits_change: number;
}

/** 内容工作台聚合数据 */
export interface WorkbenchData {
    generated_at: number;
    window: {
        weeks: number;
        start_date: string;
        end_date: string;
        timezone: string;
    };
    states: WorkbenchStates;
    heatmap: {
        days: WorkbenchHeatDay[];
        total: number;
        longest_streak: number;
        max_count: number;
    };
    recent_articles: WorkbenchRecentArticle[];
    pending_comments: {
        total: number;
        list: WorkbenchPendingComment[];
    };
    latest_feedback: {
        total: number;
        list: WorkbenchFeedback[];
    };
    kpis: WorkbenchKpis;
}
