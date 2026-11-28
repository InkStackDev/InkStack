const section = {
    title: "Dashboard",
    description:
        "Welcome back to the admin console! This is your data center where you can quickly review how the system is performing.",
    loading: "Loading dashboard...",
    stats: {
        totalUsers: "Total Users",
        totalArticles: "Total Articles",
        totalComments: "Total Comments",
        todayActivity: "Today's Activity",
        newUsers: "New Users",
        activityHint: "Activity = New users today + Articles + Comments",
    },
    chart: {
        title: "Activity Trend",
        subtitle: "(Activity = New users + Articles + Comments)",
        seriesName: "Activity",
        tooltipNote: "(New users + Articles + Comments)",
        activityHint: "Activity = New users + Articles + Comments",
        summary: {
            total: "Total Activity",
            avg: "Daily Average Activity",
            peak: "Peak",
            peakHint: "Peak Activity",
        },
    },
    range: {
        days7: "7 days",
        days30: "30 days",
        days90: "90 days",
    },
    quickActions: {
        title: "Quick Actions",
        createArticle: {
            title: "Create Article",
            description: "Write a new blog post",
        },
        addUser: {
            title: "Add User",
            description: "Invite new users to join",
        },
        systemSettings: {
            title: "System Settings",
            description: "Configure system parameters",
        },
        viewMetrics: {
            title: "View Runtime Metrics",
            description: "Inspect endpoint QPS, latency, and resource usage",
        },
    },
    recentActivity: {
        title: "Recent Activity",
    },
    recentUsers: {
        title: "Recent Users",
    },
    workbench: {
        title: "Content Workbench",
        description: "{{published}} published this week, {{pending}} awaiting review.",
        descriptionClear: "{{published}} published this week. Nothing awaiting review.",
        actions: {
            articles: "Manage articles",
            create: "New article",
        },
        states: {
            reviewing: "In review",
            reviewingFoot: "Waiting for review",
            published: "Published",
            publishedFoot: "All time",
            weekly: "This week",
            weeklyFoot: "{{value}} vs last week",
            weeklyFlat: "Same as last week",
            rejected: "Rejected",
            unit: "posts",
            rejectedFoot: "Needs revision",
        },
        heatmap: {
            title: "Publishing heatmap",
            subtitle: "Posts per day over the last 5 weeks",
            weekdays: {
                mon: "Mon",
                tue: "Tue",
                wed: "Wed",
                thu: "Thu",
                fri: "Fri",
                sat: "Sat",
                sun: "Sun",
            },
            less: "Less",
            more: "More",
            month: "{{value}} published in the last 5 weeks",
            streak: "Longest streak: {{value}} days in 5 weeks",
            cell: "{{date}} · {{value}} posts",
        },
        recent: {
            title: "Recently published",
            empty: "Nothing published in the last 35 days",
        },
        comments: {
            title: "Comments in review",
            all: "View all",
            approve: "Approve",
            reject: "Reject",
            empty: "No comments awaiting review",
            anonymous: "Anonymous",
            approved: "Comment approved",
            rejected: "Comment rejected",
        },
        feedback: {
            title: "Latest feedback",
            all: "View all",
            empty: "No new feedback",
            type: {
                bug: "Bug report",
                feature: "Feature request",
                other: "Other",
            },
        },
        kpi: {
            users: "Total users",
            articles: "Total articles",
            comments: "Total comments",
            activity: "Visits today",
        },
        error: {
            title: "Failed to load dashboard",
            retry: "Reload",
        },
    },
} as const;

export default section;
