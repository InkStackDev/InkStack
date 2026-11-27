// 个人中心中组织的类型定义
import type { OrgRole } from "./Roles.ts";

export interface PersonalOrganization {
    id: string;
    name: string;
    type: string;
    description?: string;
    memberCount: number;
    role: OrgRole;
    createTime?: string;
    status?: "active" | "inactive";
    avatar?: string;
}

// 组织成员
export interface Member {
    id: string;
    user_id: string;
    name: string;
    avatar?: string;
    role?: OrgRole | null;
    status?: "active" | "inactive";
    email?: string;
    joinTime?: string;
}

// 组织详情
export interface OrganizationDetail {
    id: string;
    name: string;
    type: string;
    status: "active" | "inactive";
    description?: string;
    memberCount: number;
    members: Member[];
    /** 当前用户在该组织的成员状态（原始枚举值，显示时用 useEnumLabels().orgMembershipStatus 本地化） */
    user_in_org?: number;
    /** 当前用户在该组织的角色（原始枚举值，显示时用 useEnumLabels().orgRole 本地化） */
    user_role?: number;
    /** 组织所有者用户 ID */
    owner_id?: string;
    /** 组织所有者用户名 */
    owner_name?: string;
    /** 组织所有者头像 */
    owner_avatar?: string;
    /** 当前用户是否为组织所有者 */
    is_owner?: boolean;
}

// 成员统计
export interface MemberStats {
    totalMembers: number;
    activeMembers: number;
    orgAdminMembers: number;
    devLeadMembers: number;
    regularMembers: number;
}

// 组织内任务
export interface Task {
    deadline: string;
    maxFileSize: number;
    courseName: string;
    status: "draft" | "active" | "closed";
    id: number | string;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    assignee: string;
    assign_id: string | number;
    assignee_name?: string;
    creator: string | number;
    creator_name: string;
    created_at: string;
    allowedTypes: string[];
    updated_at?: string;
    due_date: string;
    org_id: number | string;
}

// 任务表单
export interface TaskForm {
    title: string;
    description: string;
    priority: Task["priority"];
    assignee: string;
    due_date: string;
}
