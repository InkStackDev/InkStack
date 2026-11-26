import http from "../infra/Http.ts";
import type { FollowListResponse, MutualFollowListResponse } from "../types/Follow.ts";

/**
 * 关注服务
 */
export class FollowService {
    /**
     * 关注用户
     */
    static async follow(followingId: number | string): Promise<void> {
        await http.post(`/users/${followingId}/followers`);
    }

    /**
     * 取消关注
     */
    static async unfollow(followingId: number | string): Promise<void> {
        await http.delete(`/users/${followingId}/followers/me`);
    }

    /**
     * 判断是否已关注某用户
     */
    static async isFollowing(userId: number | string): Promise<boolean> {
        const response = await http.get<{ is_following: boolean }>(`/users/${userId}/following/me`);
        return response.data.is_following;
    }

    /**
     * 获取关注列表
     * @param userId 不传则查当前用户
     */
    static async getFollowingList(params?: {
        user_id?: number | string;
        offset?: number;
        size?: number;
    }): Promise<FollowListResponse> {
        const response = await http.get<FollowListResponse>(
            params?.user_id ? `/users/${params.user_id}/following` : "/users/me/following",
            { params },
        );
        return response.data;
    }

    /**
     * 获取粉丝列表
     * @param userId 不传则查当前用户
     */
    static async getFollowerList(params?: { user_id?: number | string; offset?: number; size?: number }): Promise<FollowListResponse> {
        const response = await http.get<FollowListResponse>(
            params?.user_id ? `/users/${params.user_id}/followers` : "/users/me/followers",
            { params },
        );
        return response.data;
    }

    /**
     * 获取互相关注的用户列表（发起私信会话的搜索数据源）
     */
    static async getMutualFollowingList(params?: {
        keyword?: string;
        offset?: number;
        size?: number;
    }): Promise<MutualFollowListResponse> {
        const response = await http.get<MutualFollowListResponse>("/users/me/mutual-following", {
            params: {
                keyword: params?.keyword ?? "",
                offset: params?.offset ?? 0,
                size: params?.size ?? 20,
            },
        });
        return response.data;
    }
}

export default FollowService;
