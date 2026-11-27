import http from "../infra/Http.ts";
import type {
    CommentListResponse,
    CreateCommentResponse,
    CommentPraiseResponse,
    AdminCommentListResponse,
    BatchOperationResponse,
    CommentStatsResponse,
} from "../types/Comment.ts";

export class CommentService {
    /** 获取文章评论列表 */
    static async getList(params: { article_id: number | string; offset?: number; size?: number }): Promise<CommentListResponse> {
        const { article_id, ...rest } = params;
        const response = await http.get<CommentListResponse>(`/articles/${article_id}/comments`, { params: rest });
        return response.data;
    }

    /** 获取评论的回复列表 */
    static async getReplies(params: { comment_id: number | string; offset?: number; size?: number }): Promise<CommentListResponse> {
        const { comment_id, ...rest } = params;
        const response = await http.get<CommentListResponse>(`/comments/${comment_id}/replies`, { params: rest });
        return response.data;
    }

    /** 发表评论 */
    static async create(params: { article_id: number | string; content: string; parent_id?: number }): Promise<CreateCommentResponse> {
        const formData = new URLSearchParams();
        formData.append("content", params.content);
        if (params.parent_id !== undefined) {
            formData.append("parent_id", String(params.parent_id));
        }
        const response = await http.postForm<CreateCommentResponse>(`/articles/${params.article_id}/comments`, formData);
        return response.data;
    }

    /** 编辑评论 */
    static async update(params: { id: number | string; content: string }): Promise<CreateCommentResponse> {
        const formData = new URLSearchParams();
        formData.append("content", params.content);
        const response = await http.patch<CreateCommentResponse>(`/comments/${params.id}`, formData.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return response.data;
    }

    /** 删除评论 */
    static async delete(id: number | string): Promise<void> {
        await http.delete(`/comments/${id}`);
    }

    /** 评论点赞/取消点赞 */
    static async togglePraise(commentId: number | string): Promise<CommentPraiseResponse> {
        const response = await http.postForm<CommentPraiseResponse>(`/comments/${commentId}/praises`, {});
        return response.data;
    }

    // ============ 管理端 ============

    /** 管理端评论列表 */
    static async getAdminList(params: {
        page_num: number;
        page_size: number;
        status?: string;
        keyword?: string;
        article_id?: string;
        is_reported?: number;
    }): Promise<AdminCommentListResponse> {
        const response = await http.get<AdminCommentListResponse>("/admin/comments", { params, cacheTtl: 15_000 });
        return response.data;
    }

    /** 批量批准 */
    static async approve(ids: string[]): Promise<BatchOperationResponse> {
        const formData = new URLSearchParams();
        formData.append("ids", ids.join(","));
        const response = await http.patch<BatchOperationResponse>("/admin/comments/approvals", formData.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return response.data;
    }

    /** 批量拒绝 */
    static async reject(ids: string[]): Promise<BatchOperationResponse> {
        const formData = new URLSearchParams();
        formData.append("ids", ids.join(","));
        const response = await http.patch<BatchOperationResponse>("/admin/comments/rejections", formData.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return response.data;
    }

    /** 批量标记垃圾 */
    static async markSpam(ids: string[]): Promise<BatchOperationResponse> {
        const formData = new URLSearchParams();
        formData.append("ids", ids.join(","));
        const response = await http.patch<BatchOperationResponse>("/admin/comments/spam", formData.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return response.data;
    }

    /** 批量删除 */
    static async batchDelete(ids: string[]): Promise<BatchOperationResponse> {
        const response = await http.delete<BatchOperationResponse>(
            `/admin/comments?ids=${encodeURIComponent(ids.join(","))}`,
        );
        return response.data;
    }

    /** 管理端评论统计 */
    static async getAdminStats(): Promise<CommentStatsResponse> {
        const response = await http.get<CommentStatsResponse>("/admin/comments/stats", { cacheTtl: 15_000 });
        return response.data;
    }
}

export default CommentService;
