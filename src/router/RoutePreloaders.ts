/**
 * 路由 chunk 预取表。
 * 悬停链接、认证加载期间都可以复用，避免重复 import。
 */
const PAGE_PRELOADERS: Array<[prefix: string, load: () => Promise<unknown>]> = [
    ["/index", () => import("../pages/home/IndexPage")],
    ["/auth", () => import("../pages/auth/AuthPage")],
    ["/article/create", () => import("../pages/article/ArticleCreate")],
    ["/article/edit", () => import("../pages/article/ArticleCreate")],
    ["/article", () => import("../pages/article/ArticleViewPage")],
    ["/organizations/list", () => import("../pages/organization/OrganizationList")],
    ["/organization/detail", () => import("../pages/organization/OrganizationDetail")],
    ["/products", () => import("../pages/product/ProductList")],
    ["/help", () => import("../pages/user/HelpCenter")],
    ["/profile", () => import("../pages/profile/ProfilePage")],
    ["/assignment/submit", () => import("../pages/assignment/AssignmentSubmit")],
    ["/assignment/submissions", () => import("../pages/assignment/AssignmentSubmissions")],
    ["/personal", () => import("../pages/personal/PersonalCenter")],
    ["/messages", () => import("../pages/user/Messages")],
    ["/admin/metrics", () => import("../pages/admin/Metrics")],
    ["/admin/users", () => import("../pages/admin/UserManagement")],
    ["/admin/articles", () => import("../pages/admin/ArticleManagement")],
    ["/admin/assignments", () => import("../pages/admin/AssignmentManagement")],
    ["/admin/organizations", () => import("../pages/admin/OrganizationManagement")],
    ["/admin/comments", () => import("../pages/admin/CommentManagement")],
    ["/admin/categories", () => import("../pages/admin/CategoryManagement")],
    ["/admin/media", () => import("../pages/admin/MediaManagement")],
    ["/admin/database", () => import("../pages/admin/DataManagement")],
    ["/admin/settings", () => import("../pages/admin/Settings")],
    ["/admin/notifications", () => import("../pages/admin/NotificationManagement")],
    ["/admin/feedbacks", () => import("../pages/admin/FeedbackManagement")],
    ["/admin", () => import("../pages/admin/Dashboard")],
    ["/rd/trends", () => import("../pages/rd-platform/TrendAnalysis")],
    ["/rd/requirements", () => import("../pages/rd-platform/RequirementList")],
    ["/rd/bugs", () => import("../pages/rd-platform/BugList")],
    ["/rd/tasks", () => import("../pages/rd-platform/TaskList")],
    ["/rd/reviews", () => import("../pages/rd-platform/CodeReviewList")],
    ["/rd/my-tickets", () => import("../pages/rd-platform/MyTickets")],
    ["/rd", () => import("../pages/rd-platform/Dashboard")],
];

// Agent 页面仅在启用时注册预取，未启用构建不会产生 Agent chunk
const AGENT_PRELOADERS: Array<[prefix: string, load: () => Promise<unknown>]> =
    import.meta.env.VITE_AGENT_ENABLED === "true" ? [["/rd/agent", () => import("../pages/rd-platform/AgentSessionPanel")]] : [];

const ALL_PRELOADERS = [...PAGE_PRELOADERS, ...AGENT_PRELOADERS];

const preloadedRoutes = new Set<string>();

export function preloadRouteForPath(path: string): void {
    const matched = ALL_PRELOADERS.filter(([prefix]) => path === prefix || path.startsWith(`${prefix}/`)).sort(
        (a, b) => b[0].length - a[0].length,
    )[0];
    if (!matched || preloadedRoutes.has(matched[0])) {
        return;
    }
    preloadedRoutes.add(matched[0]);
    void matched[1]().catch(() => {
        // 预取失败不提示，真正点击时会重新加载
        preloadedRoutes.delete(matched[0]);
    });
}
