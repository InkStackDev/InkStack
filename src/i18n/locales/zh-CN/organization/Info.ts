const section = {
    back: "返回",
    status: {
        active: "正常",
        inactive: "停用",
    },
    joinDisabled: "该组织已停用，无法加入",
    rejoin: "重新加入",
    applyJoin: "申请加入",
    owner: "组织所有者",
    leave: "退出组织",
    cancelApply: "取消申请",
    disable: "停用组织",
    enable: "启用组织",
    delete: "删除组织",
    more: "更多",
    stats: {
        totalMembers: "总成员数",
        activeMembers: "活跃成员",
        orgAdmins: "组织管理员",
        regularMembers: "普通成员",
        repos: "代码仓库",
    },
} as const;

export default section;
