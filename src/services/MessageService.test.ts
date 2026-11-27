import { beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    postForm: vi.fn(),
}));

vi.mock("../infra/Http.ts", () => ({ default: httpMock }));

import MessageService from "./MessageService.ts";

describe("MessageService", () => {
    beforeEach(() => {
        httpMock.get.mockReset();
        httpMock.post.mockReset();
        httpMock.patch.mockReset();
        httpMock.delete.mockReset();
        httpMock.postForm.mockReset();
    });

    it("loads the conversation list", async () => {
        const payload = { list: [] };
        httpMock.get.mockResolvedValue({ data: payload });

        await expect(MessageService.getConversations()).resolves.toBe(payload);
        expect(httpMock.get).toHaveBeenCalledWith("/conversations");
    });

    it("loads messages with default and explicit pagination", async () => {
        const payload = { list: [] };
        httpMock.get.mockResolvedValue({ data: payload });

        await MessageService.getMessages(42);
        expect(httpMock.get).toHaveBeenLastCalledWith("/conversations/42/messages", {
            params: { offset: 0, size: 50 },
        });

        await MessageService.getMessages("conv-7", { offset: 20, size: 10 });
        expect(httpMock.get).toHaveBeenLastCalledWith("/conversations/conv-7/messages", {
            params: { offset: 20, size: 10 },
        });
    });

    it("sends URL-encoded message text", async () => {
        const message = { id: 1, from_me: true, text: "你好 & hello", create_time: 1 };
        httpMock.postForm.mockResolvedValue({ data: message });

        await expect(MessageService.send(9, message.text)).resolves.toBe(message);
        expect(httpMock.postForm).toHaveBeenCalledWith("/conversations/9/messages", { text: message.text });
    });

    it("marks a conversation as read", async () => {
        httpMock.patch.mockResolvedValue({ data: { unread: 0 } });

        await expect(MessageService.markRead(9)).resolves.toEqual({ unread: 0 });
        expect(httpMock.patch).toHaveBeenCalledWith("/conversations/9");
    });

    it("deletes a conversation only for the current user", async () => {
        httpMock.delete.mockResolvedValue({ data: { deleted: true } });

        await expect(MessageService.deleteConversation(9)).resolves.toEqual({ deleted: true });
        expect(httpMock.delete).toHaveBeenCalledWith("/conversations/9");
    });

    it("creates a conversation with an encoded peer id", async () => {
        const conversation = {
            id: 3,
            peer_id: "user 7",
            name: "Peer",
            online: false,
            last_time: 0,
            unread: 0,
            messages: [],
        };
        httpMock.postForm.mockResolvedValue({ data: conversation });

        await expect(MessageService.createConversation(conversation.peer_id)).resolves.toBe(conversation);
        expect(httpMock.postForm).toHaveBeenCalledWith("/conversations", { peer_id: conversation.peer_id });
    });
});
