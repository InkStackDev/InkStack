const section = {
    authRequired: "您需要登录后才能查看和管理组织列表。",
    title: "组织列表",
    description: "浏览全部组织，查看详情或申请创建新的组织。",
    applyCreate: "申请创建组织",
    searchPlaceholder: "搜索组织名称、类型或描述",
    filterLabel: "按状态筛选组织",
    total: "共 {{value}} 个组织",
    clearFilter: "清除筛选",
    retry: "重试",
    pending: "「{{name}}」的创建申请审核中",
    applyPending: "申请审核中",
    applyPendingHint: "您已有待审核的创建申请，审核通过后可再次申请",
    filter: {
        all: "全部",
        active: "正常",
        inactive: "停用",
    },
    status: {
        active: "正常",
        inactive: "停用",
    },
    memberCount: "{value} 成员",
    createdAt: "创建于 {{date}}",
    rd: "研发",
    viewDetail: "查看详情",
    error: {
        title: "组织列表加载失败",
        message: "请检查网络连接后重试。",
    },
    empty: {
        title: "暂无组织",
        subtitle: "还没有任何组织，你可以申请创建第一个组织。",
    },
    emptyFiltered: {
        title: "没有匹配的组织",
        subtitle: "试试更换关键词或清除筛选条件。",
    },
} as const;

export default section;
