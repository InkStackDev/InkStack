import React, { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import MaintenanceGuard from "../components/maintenance/MaintenanceGuard";
import { FrontLayout } from "../components/appShell";
import AuthRequired from "../components/auth/AuthRequired";
import AdminLayout from "../pages/admin/AdminLayout";
import RdLayout from "../pages/rd-platform/RdLayout";
import Loading from "../components/loading/Loading";
import { preloadRouteForPath } from "./RoutePreloaders";

// 路由级按需加载：避免首屏把后台、图表、编辑器等页面全部打进同一个 chunk
const AuthPage = lazy(() => import("../pages/auth/AuthPage"));
const NotFound404 = lazy(() => import("../pages/error/NotFound404"));
const IndexPage = lazy(() => import("../pages/home/IndexPage"));
const ArticleCreate = lazy(() => import("../pages/article/ArticleCreate"));
const Profile = lazy(() => import("../pages/profile/ProfilePage"));
const PersonalCenter = lazy(() => import("../pages/personal/PersonalCenter"));
const Dashboard = lazy(() => import("../pages/admin/Dashboard"));
const Metrics = lazy(() => import("../pages/admin/Metrics"));
const UserManagement = lazy(() => import("../pages/admin/UserManagement"));
const ArticleManagement = lazy(() => import("../pages/admin/ArticleManagement"));
const AssignmentManagement = lazy(() => import("../pages/admin/AssignmentManagement"));
const CategoryManagement = lazy(() => import("../pages/admin/CategoryManagement"));
const CommentManagement = lazy(() => import("../pages/admin/CommentManagement"));
const MediaManagement = lazy(() => import("../pages/admin/MediaManagement"));
const NotificationManagement = lazy(() => import("../pages/admin/NotificationManagement"));
const FeedbackManagement = lazy(() => import("../pages/admin/FeedbackManagement"));
const DataManagement = lazy(() => import("../pages/admin/DataManagement"));
const Settings = lazy(() => import("../pages/admin/Settings"));
const OrganizationManagement = lazy(() => import("../pages/admin/OrganizationManagement"));
const OrganizationList = lazy(() => import("../pages/organization/OrganizationList"));
const OrganizationDetail = lazy(() => import("../pages/organization/OrganizationDetail"));
const ArticleViewPage = lazy(() => import("../pages/article/ArticleViewPage"));
const AssignmentSubmit = lazy(() => import("../pages/assignment/AssignmentSubmit"));
const AssignmentSubmissions = lazy(() => import("../pages/assignment/AssignmentSubmissions"));
const ChunkUploadTest = lazy(() => import("../pages/test/ChunkUploadTest"));
const SampleThemeStylePanel = lazy(() => import("../sample/ThemeStylePanel"));
// Agent UI 属于可选产品面：未启用时不能产出任何 Agent chunk
const AgentSessionPanel =
    import.meta.env.VITE_AGENT_ENABLED === "true" ? lazy(() => import("../pages/rd-platform/AgentSessionPanel")) : null;
const SampleAgentSessionPanel =
    import.meta.env.DEV && import.meta.env.VITE_AGENT_ENABLED === "true" ? lazy(() => import("../sample/AgentSessionPanel")) : null;
const RdDashboard = lazy(() => import("../pages/rd-platform/Dashboard"));
const RequirementList = lazy(() => import("../pages/rd-platform/RequirementList"));
const BugList = lazy(() => import("../pages/rd-platform/BugList"));
const TaskList = lazy(() => import("../pages/rd-platform/TaskList"));
const MyTickets = lazy(() => import("../pages/rd-platform/MyTickets"));
const CodeReviewList = lazy(() => import("../pages/rd-platform/CodeReviewList"));
const TicketDetail = lazy(() => import("../pages/rd-platform/TicketDetail"));
const TrendAnalysis = lazy(() => import("../pages/rd-platform/TrendAnalysis"));
const HelpCenter = lazy(() => import("../pages/user/HelpCenter"));
const Messages = lazy(() => import("../pages/user/Messages"));
const ProductList = lazy(() => import("../pages/product/ProductList"));

const RouterConfig: React.FC = () => {
    const { t } = useTranslation("auth");
    const location = useLocation();

    // 当前路由 chunk 立即预取，和认证/站点设置并行
    useEffect(() => {
        preloadRouteForPath(location.pathname);
    }, [location.pathname]);

    // 悬停/聚焦站内链接时预取对应路由 chunk
    useEffect(() => {
        const maybePreload = (target: EventTarget | null) => {
            if (!(target instanceof Element)) {
                return;
            }
            const anchor = target.closest("a[href]");
            if (!(anchor instanceof HTMLAnchorElement)) {
                return;
            }
            if (anchor.target && anchor.target !== "_self") {
                return;
            }
            const url = new URL(anchor.href, window.location.href);
            if (url.origin !== window.location.origin) {
                return;
            }
            preloadRouteForPath(url.pathname);
        };

        const handlePointerOver = (event: PointerEvent) => maybePreload(event.target);
        const handleFocusIn = (event: FocusEvent) => maybePreload(event.target);

        document.addEventListener("pointerover", handlePointerOver, { passive: true });
        document.addEventListener("focusin", handleFocusIn);
        return () => {
            document.removeEventListener("pointerover", handlePointerOver);
            document.removeEventListener("focusin", handleFocusIn);
        };
    }, []);

    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loading size="large" />
                </div>
            }
        >
            <Routes>
                {/* 默认路由重定向到主页 */}
                <Route path="/" element={<Navigate to="/index" replace />} />

                {/* 登录页不受维护模式限制（管理员需要登录后台） */}
                <Route path="/auth" element={<AuthPage />} />

                {/* 管理中心不受维护模式限制（管理员需要关闭维护模式） */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="metrics" element={<Metrics />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="articles" element={<ArticleManagement />} />
                    <Route path="assignments" element={<AssignmentManagement />} />
                    <Route path="organizations" element={<OrganizationManagement />} />
                    <Route path="comments" element={<CommentManagement />} />
                    <Route path="categories" element={<CategoryManagement />} />
                    {import.meta.env.DEV && <Route path="media" element={<MediaManagement />} />}
                    <Route path="database" element={<DataManagement />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="notifications" element={<NotificationManagement />} />
                    <Route path="feedbacks" element={<FeedbackManagement />} />
                </Route>

                {/* 维护模式路由守卫 */}
                <Route element={<MaintenanceGuard />}>
                    {/* 使用前台统一外壳（常驻侧栏/顶栏/页脚）的页面 */}
                    <Route element={<FrontLayout />}>
                        {/* 主页 */}
                        <Route path="/index" element={<IndexPage />} />

                        {/* 文章创建页 */}
                        <Route path="/article/create" element={<ArticleCreate />} />
                        <Route path="/article/edit/:id" element={<ArticleCreate />} />

                        {/* 用户组织列表页 */}
                        <Route path="/organizations/list" element={<OrganizationList />} />
                        {/* 组织详情页 */}
                        <Route path="/organization/detail/:id" element={<OrganizationDetail />} />

                        {/* 产品包列表（仅开发环境可见） */}
                        {import.meta.env.DEV && <Route path="/products" element={<ProductList />} />}

                        {/* 用户系统：帮助中心 */}
                        <Route path="/help" element={<HelpCenter />} />

                        {/* 个人主页 */}
                        <Route
                            path="/profile/:id"
                            element={
                                <AuthRequired fill>
                                    <Profile />
                                </AuthRequired>
                            }
                        />

                        {/* 作业提交页 */}
                        <Route path="/assignment/submit/:id" element={<AssignmentSubmit />} />
                        {/* 作业提交详情页 */}
                        <Route path="/assignment/submissions/:id" element={<AssignmentSubmissions />} />

                        {/* 私信会话：页面正式开放，但必须登录后访问 */}
                        <Route
                            path="/messages"
                            element={
                                <AuthRequired fill title={t("pageRequired.messagesTitle")} message={t("pageRequired.messagesMessage")}>
                                    <Messages />
                                </AuthRequired>
                            }
                        />
                    </Route>

                    {/* 文章详情页（独立沉浸式阅读界面，不使用前台外壳） */}
                    <Route path="/article/:id" element={<ArticleViewPage />} />

                    {/* 作业列表页 */}
                    <Route path="/assignments" element={<Navigate to="/personal?tab=assignments" replace />} />

                    {/* 测试页面（仅开发环境可见） */}
                    {import.meta.env.DEV && <Route path="/test/chunk-upload" element={<ChunkUploadTest />} />}
                    {import.meta.env.DEV && <Route path="/test/theme-style-panel" element={<SampleThemeStylePanel />} />}

                    {/* 个人管理中心 */}
                    <Route path="/personal" element={<PersonalCenter />} />

                    {SampleAgentSessionPanel && import.meta.env.VITE_AGENT_ENABLED === "true" && import.meta.env.DEV && (
                        <Route path="/test/agent-session-panel" element={<SampleAgentSessionPanel />} />
                    )}

                    {/* 研发平台 */}
                    <Route path="/rd" element={<RdLayout />}>
                        <Route index element={<RdDashboard />} />
                        {AgentSessionPanel && import.meta.env.VITE_AGENT_ENABLED === "true" && (
                            <Route
                                path="agent"
                                element={
                                    <AuthRequired title={t("pageRequired.agentTitle")} message={t("pageRequired.agentMessage")}>
                                        <AgentSessionPanel />
                                    </AuthRequired>
                                }
                            />
                        )}

                        <Route path="trends" element={<TrendAnalysis />} />
                        <Route path="requirements" element={<RequirementList />} />
                        <Route path="requirements/:id" element={<TicketDetail />} />
                        <Route path="bugs" element={<BugList />} />
                        <Route path="bugs/:id" element={<TicketDetail />} />
                        <Route path="tasks" element={<TaskList />} />
                        <Route path="tasks/:id" element={<TicketDetail />} />
                        <Route path="reviews" element={<CodeReviewList />} />
                        <Route path="my-tickets" element={<MyTickets />} />
                    </Route>

                    {/* 404 页面 */}
                    <Route path="*" element={<NotFound404 />} />
                </Route>
            </Routes>
        </Suspense>
    );
};

export default RouterConfig;
