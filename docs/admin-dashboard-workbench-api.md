# 管理仪表盘内容工作台接口

入口：管理后台 → 仪表盘（`/admin`）
对应页面：`src/pages/admin/Dashboard.tsx`
用途：一次返回「内容工作台」首屏所需的全部只读数据，替代当前 6 个分散请求。

## 通用约定

- **Base URL**：`/api/v1`（与 `src/infra/Http.ts` 一致，本地代理目标由 `VITE_USE_PROXY` 决定）。
- **鉴权**：服务端 Session + HttpOnly `SESSIONID` Cookie，管理员权限；前端不附加 Bearer。
- **方法**：`GET`，无请求体。
- **字段命名**：请求参数与响应 JSON 全部使用 `snake_case`；前端在 `src/services/` 内转成组件使用的 camelCase。
- **响应包络**：沿用 `HttpResponse<T>`。

```json
{
    "code": 200,
    "errno": 0,
    "msg": "ok",
    "success": true,
    "data": {}
}
```

`errno = 0` 即成功；失败时 `errno` 非 0，错误文案由 `src/utils/AppConfig.ts` 的 `getErrorMsg` 按错误码表映射。`data` 的结构见下文。

---

## 请求

```http
GET /api/v1/admin/dashboard/workbench?weeks=5
Cookie: SESSIONID=...
```

### Query 参数

| 字段    | 类型 | 必填 | 默认 | 说明                                                                                |
| ------- | ---- | ---- | ---- | ----------------------------------------------------------------------------------- |
| `weeks` | int  | 否   | `5`  | 热力图周数，范围 `1–12`；服务端按周一起算，忽略未来日期。页面当前固定 5，不传即可。 |

### 时区与时间

- 所有日期边界、按天聚合均使用 **Asia/Shanghai**。
- 日期字段格式 `YYYY-MM-DD`。
- 时间戳字段统一为 **Unix 秒**（int64），与 `AdminComment.created_at`、`ArticleStatsResponse` 一致；不使用毫秒、不使用字符串。
- `weeks=5` 时窗口为「本周周一往前 4 周的周一」起，到今天为止；`end_date` 是今天（不是本周周日），未来日期不出现在 `heatmap.days` 中。

---

## 响应 data

```json
{
    "generated_at": 1795852800,
    "window": {
        "weeks": 5,
        "start_date": "2026-10-26",
        "end_date": "2026-11-28",
        "timezone": "Asia/Shanghai"
    },
    "states": {
        "pending_review": 6,
        "published": 1240,
        "published_this_week": 6,
        "rejected": 8
    },
    "heatmap": {
        "days": [
            { "date": "2026-10-26", "count": 3 },
            { "date": "2026-10-27", "count": 0 },
            { "date": "2026-10-28", "count": 5 }
        ],
        "total": 26,
        "longest_streak": 26,
        "max_count": 6
    },
    "recent_articles": [
        {
            "id": "a_1001",
            "title": "在浏览器里种一片森林",
            "author": "林晚",
            "author_avatar": "https://cdn.example.com/avatar/linwan.png",
            "publish_time": 1795849200
        }
    ],
    "pending_comments": {
        "total": 12,
        "list": [
            {
                "id": "c_2001",
                "content": "这段构建优化写得很清楚，想问下 monorepo 下也适用吗？",
                "created_at": 1795852080,
                "author": {
                    "id": "u_01",
                    "name": "陈以安",
                    "avatar": "https://cdn.example.com/avatar/chen.png"
                },
                "article": {
                    "id": "a_1002",
                    "title": "关于 Vite 构建的一点记录"
                }
            }
        ]
    },
    "latest_feedback": {
        "total": 4,
        "list": [
            {
                "id": "f_3001",
                "type": "bug",
                "content": "移动端目录按钮遮挡正文",
                "user_name": "林晚",
                "user_avatar": "",
                "created_at": 1795845600
            }
        ]
    },
    "kpis": {
        "total_users": 12480,
        "total_users_change": 2.4,
        "total_articles": 1286,
        "total_articles_change": 1.9,
        "total_comments": 8942,
        "total_comments_change": 3.1,
        "today_visits": 486,
        "today_visits_change": 18.2
    }
}
```

> 示例中的数组做了截断，实际 `heatmap.days` 返回窗口内**每一天**（含 `count: 0`），`recent_articles` 固定最多 3 条，`pending_comments.list` 固定最多 3 条，`latest_feedback.list` 固定最多 2 条。

### states：文章状态概览

| 字段                  | 类型 | 说明                                               |
| --------------------- | ---- | -------------------------------------------------- |
| `pending_review`      | int  | `state = 1`（REVIEWING）且未删除的文章数，全局统计 |
| `published`           | int  | `state = 2`（PUBLISHED）且未删除的文章数，全局累计 |
| `published_this_week` | int  | 本自然周（周一 00:00 至当前时刻）发布的文章数      |
| `rejected`            | int  | `state = 3`（UNALLOWED）且未删除的文章数           |

说明：当前数据模型没有「草稿」「已排期」状态，因此不返回这两个字段；页面文案与状态卡按以上四项渲染。

### heatmap：发布热力图

| 字段             | 类型   | 说明                                                               |
| ---------------- | ------ | ------------------------------------------------------------------ |
| `days`           | array  | 窗口内按日期升序的每一天，最多 `weeks * 7` 项，最后一项为今天      |
| `days[].date`    | string | `YYYY-MM-DD`                                                       |
| `days[].count`   | int    | 当天发布的文章数（按 Asia/Shanghai 的 `publish_time` 日期聚合）    |
| `total`          | int    | 窗口内发布总数，等于 `days[].count` 之和                           |
| `longest_streak` | int    | 窗口内连续有发布的最长天数（按 `days` 顺序计算，不跨越窗口）       |
| `max_count`      | int    | `days[].count` 的最大值；全部为 0 时返回 `0`，前端据此计算热力等级 |

只统计 `state = 2`、未删除、`publish_time` 落在窗口内的文章。没有发布记录的日期也必须返回，`count = 0`。

### recent_articles：最近发布

固定按 `publish_time` 倒序取 3 条已发布文章（`state = 2`，未删除），字段：

| 字段            | 类型   | 说明                   |
| --------------- | ------ | ---------------------- |
| `id`            | string | 文章 ID                |
| `title`         | string | 标题                   |
| `author`        | string | 作者显示名             |
| `author_avatar` | string | 头像 URL，可为空字符串 |
| `publish_time`  | int    | 发布时间，Unix 秒      |

### pending_comments：待审核评论

| 字段                | 类型   | 说明                                                                                       |
| ------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `total`             | int    | `status = "pending"` 的评论总数                                                            |
| `list`              | array  | 按 `created_at` 倒序取最多 3 条                                                            |
| `list[].id`         | string | 评论 ID                                                                                    |
| `list[].content`    | string | 评论文本（原样返回，不做截断）                                                             |
| `list[].created_at` | int    | 发表时间，Unix 秒                                                                          |
| `list[].author`     | object | `{ id, name, avatar }`；匿名用户 `name` 用页面展示名（如「访客 8821」），`id` 可为空字符串 |
| `list[].article`    | object | `{ id, title }`，评论所属文章                                                              |

通过/拒绝操作继续使用现有接口，不并入本接口：

- `PATCH /api/v1/admin/comments/approvals`（`ids`，逗号分隔，form-urlencoded）
- `PATCH /api/v1/admin/comments/rejections`（同上）

### latest_feedback：最新反馈

| 字段                 | 类型   | 说明                             |
| -------------------- | ------ | -------------------------------- |
| `total`              | int    | 反馈总数                         |
| `list`               | array  | 按 `created_at` 倒序取最多 2 条  |
| `list[].id`          | string | 反馈 ID                          |
| `list[].type`        | string | `"bug" \| "feature" \| "other"`  |
| `list[].content`     | string | 反馈内容                         |
| `list[].user_name`   | string | 反馈人显示名；没有时返回空字符串 |
| `list[].user_avatar` | string | 头像 URL，可为空                 |
| `list[].created_at`  | int    | 提交时间，Unix 秒                |

现有反馈没有处理状态，接口不返回「待处理」语义；页面标题使用「最新反馈」。

### kpis：底部指标

字段沿用当前 `/admin/dashboard/stats` 的命名与口径，只返回页面实际使用的 8 个字段（不返回 `new_users_today` / `new_users_today_change`）：

| 字段                    | 类型   | 说明                                      |
| ----------------------- | ------ | ----------------------------------------- |
| `total_users`           | int    | 总用户数                                  |
| `total_users_change`    | number | 用户数环比，百分比，保留 1 位小数，可为负 |
| `total_articles`        | int    | 文章总数                                  |
| `total_articles_change` | number | 同上                                      |
| `total_comments`        | int    | 评论总数                                  |
| `total_comments_change` | number | 同上                                      |
| `today_visits`          | int    | 今日访问量                                |
| `today_visits_change`   | number | 较昨日变化百分比，保留 1 位小数，可为负   |

无对比基线时 `*_change` 返回 `0`，不要返回 `null`。

---

## 统计口径与实现要求

1. **同一快照**：`states`、`heatmap`、`recent_articles`、`pending_comments`、`latest_feedback`、`kpis` 必须在同一次请求内基于同一时间点计算；建议只读事务或并行查询后以同一个 `generated_at` 返回。
2. **已删除数据**：文章统一排除 `is_deleted = 1`；评论使用现有管理端过滤规则（不包含已删除）。
3. **热力图日期**：按 `publish_time` 转 Asia/Shanghai 后取日期，不能用服务端本地时区直接 `DATE()`。
4. **本周**：周一 00:00:00（Asia/Shanghai）至当前时刻；与热力图最后一个自然周一致。
5. **连续天数**：`days` 中相邻日期 `count > 0` 的最长连续段；窗口首日之前、最后一天之后不计。
6. **数量上限**：`recent_articles` 3 条、`pending_comments.list` 3 条、`latest_feedback.list` 2 条由服务端固定，避免前端再传 `limit`。
7. **性能**：一次请求应控制在 3–5 条聚合 SQL 以内；`heatmap` 用 `GROUP BY date` 一次查出，禁止拉取文章明细到应用层再循环。

## 错误响应

| 场景              | HTTP | errno          | msg 示例   |
| ----------------- | ---- | -------------- | ---------- |
| 未登录 / 会话失效 | 401  | `1101`         | 未登录     |
| 非管理员          | 403  | 由错误码表给出 | 无权限     |
| `weeks` 超出 1–12 | 400  | 由错误码表给出 | 参数错误   |
| 服务端异常        | 500  | 由错误码表给出 | 服务器错误 |

错误响应仍使用统一包络：`{ "code": 400, "errno": ..., "msg": "...", "success": false, "data": null }`。

## 缓存

- 前端请求：`http.get<WorkbenchData>("/admin/dashboard/workbench", { cacheTtl: 15_000 })`。
- 评论通过/拒绝走 `PATCH`，`HttpClient` 会自动清空 GET 缓存，操作后重新拉取本接口即可。
- 服务端可选 10–15 秒只读缓存；若启用，需在接受评论审核、文章发布后主动失效，或不缓存。

## 前端对接

在 `src/services/DashboardService.ts` 增加类型和方法（内部仍用 snake_case，组件按需映射）：

```ts
export interface WorkbenchData {
    generated_at: number;
    window: { weeks: number; start_date: string; end_date: string; timezone: string };
    states: {
        pending_review: number;
        published: number;
        published_this_week: number;
        rejected: number;
    };
    heatmap: {
        days: Array<{ date: string; count: number }>;
        total: number;
        longest_streak: number;
        max_count: number;
    };
    recent_articles: Array<{
        id: string;
        title: string;
        author: string;
        author_avatar: string;
        publish_time: number;
    }>;
    pending_comments: {
        total: number;
        list: Array<{
            id: string;
            content: string;
            created_at: number;
            author: { id: string; name: string; avatar: string };
            article: { id: string; title: string };
        }>;
    };
    latest_feedback: {
        total: number;
        list: Array<{
            id: string;
            type: "bug" | "feature" | "other";
            content: string;
            user_name: string;
            user_avatar: string;
            created_at: number;
        }>;
    };
    kpis: {
        total_users: number;
        total_users_change: number;
        total_articles: number;
        total_articles_change: number;
        total_comments: number;
        total_comments_change: number;
        today_visits: number;
        today_visits_change: number;
    };
}

static async getWorkbench(weeks = 5): Promise<WorkbenchData> {
    const response = await http.get<WorkbenchData>("/admin/dashboard/workbench", {
        params: { weeks },
        cacheTtl: 15_000,
    });
    return response.data;
}
```

页面侧把当前的 `Promise.allSettled` 六个请求替换为一次 `DashboardService.getWorkbench()`；收到 `data` 后直接设置状态，评论审核动作后重新调用一次即可。

热力图网格要使用响应里的 `window.start_date` 作为第一格，而不是像现在这样按「今天减 34 天」推算——服务端按周一对齐后，窗口天数会随星期变化（周一时是 29 天，周日时是 35 天），剩余的未来格由前端留空。

## 与现有接口的关系

接口上线后，仪表盘不再调用以下只读接口（其他页面不受影响）：

- `/admin/dashboard/stats`
- `/admin/articles/stats`
- `/admin/articles?page_num=1&page_size=100&state=2&days=35`（仅为热力图取数的那次调用）
- `/admin/comments/stats`
- `/admin/comments?page_num=1&page_size=3&status=pending`
- `/admin/feedback?page=1&page_size=2`

评论审核、文章新建等写操作继续使用各自原有接口。
