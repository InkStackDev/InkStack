const section = {
    title: "仪表盘",
    description: "欢迎回到管理后台！这里是您的数据中心，可以快速了解系统运行状况。",
    loading: "加载仪表盘中...",
    stats: {
        totalUsers: "总用户数",
        totalArticles: "文章总数",
        totalComments: "评论总数",
        todayActivity: "今日活动",
        newUsers: "新增用户",
        activityHint: "活动量 = 今日新增用户 + 文章 + 评论",
    },
    chart: {
        title: "活动趋势",
        subtitle: "（活动量 = 新增用户 + 文章 + 评论）",
        seriesName: "活动量",
        tooltipNote: "（新增用户 + 文章 + 评论）",
        activityHint: "活动量 = 新增用户 + 文章 + 评论",
        summary: {
            total: "总活动量",
            avg: "日均活动量",
            peak: "峰值",
            peakHint: "活动量峰值",
        },
    },
    range: {
        days7: "7天",
        days30: "30天",
        days90: "90天",
    },
    quickActions: {
        title: "快速操作",
        createArticle: {
            title: "创建文章",
            description: "撰写新的博客文章",
        },
        addUser: {
            title: "添加用户",
            description: "邀请新用户加入",
        },
        systemSettings: {
            title: "系统设置",
            description: "配置系统参数",
        },
        viewMetrics: {
            title: "查看运行指标",
            description: "查看接口 QPS、延迟与资源占用",
        },
    },
    recentActivity: {
        title: "最近活动",
    },
    recentUsers: {
        title: "最近用户",
    },
    workbench: {
        title: "内容工作台",
        description: "本周已发布 {{published}} 篇，{{pending}} 篇待审核。",
        descriptionClear: "本周已发布 {{published}} 篇，暂无待审核内容。",
        actions: {
            articles: "文章管理",
            create: "新建文章",
        },
        states: {
            reviewing: "待审核",
            reviewingFoot: "等待处理",
            published: "已发布",
            publishedFoot: "全站累计",
            weekly: "本周发布",
            weeklyFoot: "较上周 {{value}}",
            weeklyFlat: "与上周持平",
            rejected: "未通过",
            unit: "篇",
            rejectedFoot: "需要复核",
        },
        heatmap: {
            title: "发布热力图",
            subtitle: "近 5 周每日发布篇数",
            weekdays: {
                mon: "一",
                tue: "二",
                wed: "三",
                thu: "四",
                fri: "五",
                sat: "六",
                sun: "日",
            },
            less: "少",
            more: "多",
            month: "近 5 周已发布 {{value}} 篇",
            streak: "近 5 周最长连续 {{value}} 天",
            cell: "{{date}} · {{value}} 篇",
        },
        recent: {
            title: "最近发布",
            empty: "近 35 天还没有发布文章",
        },
        comments: {
            title: "待审核评论",
            all: "全部",
            approve: "通过",
            reject: "拒绝",
            empty: "暂无待审核评论",
            anonymous: "匿名用户",
            approved: "评论已通过",
            rejected: "评论已拒绝",
        },
        feedback: {
            title: "最新反馈",
            all: "全部",
            empty: "暂无新反馈",
            type: {
                bug: "功能异常",
                feature: "功能建议",
                other: "其他",
            },
        },
        kpi: {
            users: "总用户",
            articles: "文章总数",
            comments: "评论总数",
            activity: "今日访问",
        },
        error: {
            title: "仪表盘加载失败",
            retry: "重新加载",
        },
    },
} as const;

export default section;
