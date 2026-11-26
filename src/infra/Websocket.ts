import { getErrorMsg } from "../utils/ErrorCodes.ts";

type MessageHandler = (data: unknown) => void;
type EventHandler = (event?: Event) => void;

export interface WebSocketClientOptions {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    maxReconnectDelay?: number;
    maxPendingMessages?: number;
    /** 应用层心跳间隔（毫秒），客户端发送纯文本 "ping"；默认 5 秒 */
    heartbeatInterval?: number;
    /** 发出 ping 后等待 pong 的超时（毫秒），默认 3 秒 */
    pongTimeout?: number;
}

/** WebSocket 服务端错误帧（与 HTTP API 同构的 errno / errstr 格式） */
export interface WsServerError {
    errno: number;
    errstr: string;
    message: string;
    /** 统一网关的业务通道：system / notification / presence / chat */
    channel?: string;
}

type ServerErrorHandler = (err: WsServerError) => void;

/**
 * WebSocket 客户端封装
 * 支持自动重连、消息分发、Cookie 鉴权
 */
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private basePath: string;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts: number;
    private readonly reconnectDelay: number;
    private readonly maxReconnectDelay: number;
    private readonly maxPendingMessages: number;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
    private openHandlers: Set<EventHandler> = new Set();
    private closeHandlers: Set<EventHandler> = new Set();
    private errorHandlers: Set<EventHandler> = new Set();
    private serverErrorHandlers: Set<ServerErrorHandler> = new Set();
    private intentionalClose = false;
    private pendingSend: string[] = [];
    private uid: string | number | undefined;
    /** 每次建连递增；旧连接的异步事件不能影响新连接。 */
    private connectionGeneration = 0;
    private hasOpened = false;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private pongTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly heartbeatInterval: number;
    private readonly pongTimeout: number;

    /**
     * @param path WebSocket 路径，如 "/notification"
     */
    constructor(path: string, options: WebSocketClientOptions = {}) {
        const explicit = import.meta.env.VITE_WS_URL;
        const useProxy = import.meta.env.VITE_USE_PROXY === "true";
        const wsProto = window.location.protocol === "https:" ? "wss" : "ws";
        const isLoopback = !explicit || /^wss?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?/i.test(explicit);
        const baseUrl = isLoopback || useProxy ? `${wsProto}://${window.location.host}` : explicit;
        const cleanBase = baseUrl.replace(/\/+$/, "");
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        this.basePath = `${cleanBase}${cleanPath}`;
        this.maxReconnectAttempts = Math.max(0, options.maxReconnectAttempts ?? 5);
        this.reconnectDelay = Math.max(0, options.reconnectDelay ?? 1000);
        this.maxReconnectDelay = Math.max(this.reconnectDelay, options.maxReconnectDelay ?? 30000);
        this.maxPendingMessages = Math.max(0, options.maxPendingMessages ?? 100);
        this.heartbeatInterval = Math.max(0, options.heartbeatInterval ?? 5000);
        this.pongTimeout = Math.max(0, options.pongTimeout ?? 3000);

        window.addEventListener(
            "beforeunload",
            () => {
                this.intentionalClose = true;
            },
            { once: true },
        );
    }

    get readyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED;
    }

    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    get hasEstablishedConnection(): boolean {
        return this.hasOpened;
    }

    /** 是否允许再次主动建连（`replaced` / 主动 disconnect 后为 false，避免重连循环） */
    get canReconnect(): boolean {
        return !this.intentionalClose;
    }

    connect(uid?: string | number): boolean {
        if (uid !== undefined) {
            this.uid = uid;
        }
        if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
            return true;
        }

        this.intentionalClose = false;
        this.clearReconnectTimer();
        const generation = ++this.connectionGeneration;

        // 认证完全依赖同源 HttpOnly SESSIONID Cookie。
        // uid 仅用于日志和后端 onClose 兜底，不参与鉴权。
        const params = new URLSearchParams();
        if (this.uid !== undefined && this.uid !== null && this.uid !== "") {
            params.set("uid", String(this.uid));
        }

        const query = params.toString();
        const connectUrl = query ? `${this.basePath}?${query}` : this.basePath;
        console.log("[WS] 正在连接:", connectUrl, { uid: this.uid, auth: "cookie" });

        const socket = new WebSocket(connectUrl);
        this.ws = socket;

        const isCurrentConnection = () => this.ws === socket && this.connectionGeneration === generation;

        socket.onopen = () => {
            if (!isCurrentConnection()) {
                return;
            }
            console.log("[WS] 连接已建立");
            this.hasOpened = true;
            this.reconnectAttempts = 0;
            while (this.pendingSend.length > 0) {
                const message = this.pendingSend[0];
                try {
                    socket.send(message);
                    this.pendingSend.shift();
                } catch (error) {
                    console.error("[WS] 待发送消息发送失败:", error);
                    break;
                }
            }
            this.startHeartbeat();
            this.dispatchHandlers(this.openHandlers, undefined, "open");
        };

        socket.onmessage = (event: MessageEvent) => {
            if (!isCurrentConnection()) {
                return;
            }
            if (event.data === "pong") {
                this.clearPongTimer();
                return;
            }
            let data: unknown;
            try {
                data = JSON.parse(event.data);
            } catch {
                this.dispatchMessage("*", event.data);
                return;
            }

            if (this.isMessageRecord(data)) {
                if (typeof data.errno === "number" && data.errno !== 0) {
                    const errstr = typeof data.errstr === "string" ? data.errstr : typeof data.msg === "string" ? data.msg : "";
                    const parsed: WsServerError = {
                        errno: data.errno,
                        errstr,
                        message: getErrorMsg(data.errno, errstr),
                        channel: typeof data.channel === "string" ? data.channel : undefined,
                    };
                    this.dispatchHandlers(this.serverErrorHandlers, parsed, "server error");
                }
                const type = typeof data.type === "string" ? data.type : typeof data.event === "string" ? data.event : "message";
                // 统一网关的下行帧同时带 channel。通知帧的 type 是业务类型（comment/praise/...），
                // 因此额外按 channel 分发一次，业务侧可以直接 onMessage("notification")。
                const channel = typeof data.channel === "string" ? data.channel : "";
                this.dispatchMessage(type, data);
                if (channel && channel !== type) {
                    this.dispatchMessage(channel, data);
                }
            } else {
                this.dispatchMessage("message", data);
            }
            if (this.isMessageRecord(data) && (data.type === "*" || data.event === "*")) {
                return;
            }
            this.dispatchMessage("*", data);
        };

        socket.onclose = (event: CloseEvent) => {
            if (!isCurrentConnection()) {
                return;
            }
            this.stopHeartbeat();
            console.log("[WS] 连接关闭, code:", event.code, "reason:", event.reason || "(无)");
            this.dispatchHandlers(this.closeHandlers, event, "close");
            // 已建立的连接断线要重连；首次握手失败也允许有限重试，
            // 避免代理/实例重启窗口导致“页面打开后一直没有 WS”。
            if (!this.intentionalClose) {
                this.scheduleReconnect();
            }
        };

        socket.onerror = (event: Event) => {
            if (!isCurrentConnection()) {
                return;
            }
            console.error("[WS] 连接错误:", event);
            this.dispatchHandlers(this.errorHandlers, event, "error");
        };
        return true;
    }

    disconnect() {
        this.stopHeartbeat();
        this.intentionalClose = true;
        this.connectionGeneration++;
        this.clearReconnectTimer();
        const socket = this.ws;
        this.ws = null;
        if (socket) {
            socket.onmessage = null;
            socket.onclose = null;
            socket.onerror = null;
            socket.onopen = null;
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
                socket.close();
            }
        }
        this.pendingSend = [];
        this.reconnectAttempts = 0;
        this.hasOpened = false;
    }

    send(data: string | object): boolean {
        let payload: string;
        try {
            payload = typeof data === "string" ? data : JSON.stringify(data);
        } catch (error) {
            console.error("[WS] 消息序列化失败:", error);
            return false;
        }
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(payload);
                return true;
            } catch (error) {
                console.error("[WS] 消息发送失败:", error);
                return false;
            }
        }
        if (this.intentionalClose) {
            return false;
        }
        if (this.pendingSend.length >= this.maxPendingMessages) {
            return false;
        }
        this.pendingSend.push(payload);
        return true;
    }

    onMessage(type: string, handler: MessageHandler): () => void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type)!.add(handler);
        return () => {
            this.messageHandlers.get(type)?.delete(handler);
        };
    }

    onOpen(handler: EventHandler): () => void {
        this.openHandlers.add(handler);
        return () => {
            this.openHandlers.delete(handler);
        };
    }

    onClose(handler: EventHandler): () => void {
        this.closeHandlers.add(handler);
        return () => {
            this.closeHandlers.delete(handler);
        };
    }

    onError(handler: EventHandler): () => void {
        this.errorHandlers.add(handler);
        return () => {
            this.errorHandlers.delete(handler);
        };
    }

    onServerError(handler: ServerErrorHandler): () => void {
        this.serverErrorHandlers.add(handler);
        return () => {
            this.serverErrorHandlers.delete(handler);
        };
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn("[WS] 自动重连次数已用尽，等待下一次触发");
            return;
        }
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
        this.reconnectAttempts++;
        const generation = this.connectionGeneration;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.connectionGeneration !== generation || this.intentionalClose) {
                return;
            }
            this.connect();
        }, delay);
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        if (this.heartbeatInterval <= 0) {
            return;
        }
        this.heartbeatTimer = setInterval(() => {
            const socket = this.ws;
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                return;
            }
            try {
                socket.send("ping");
            } catch (error) {
                console.error("[WS] 心跳发送失败:", error);
                return;
            }
            this.startPongTimeout(socket);
        }, this.heartbeatInterval);
    }

    private startPongTimeout(socket: WebSocket): void {
        this.clearPongTimer();
        if (this.pongTimeout <= 0) {
            return;
        }
        this.pongTimer = setTimeout(() => {
            if (this.ws !== socket || this.intentionalClose) {
                return;
            }
            console.warn("[WS] pong 超时，主动关闭并重连");
            socket.close();
        }, this.pongTimeout);
    }

    private clearPongTimer(): void {
        if (this.pongTimer) {
            clearTimeout(this.pongTimer);
            this.pongTimer = null;
        }
    }

    private stopHeartbeat(): void {
        this.clearPongTimer();
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private isMessageRecord(data: unknown): data is Record<string, unknown> {
        return typeof data === "object" && data !== null;
    }

    private dispatchMessage(type: string, data: unknown): void {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            this.dispatchHandlers(handlers, data, `message:${type}`);
        }
    }

    private dispatchHandlers<T>(handlers: Set<(data: T) => void>, data: T, eventName: string): void {
        for (const handler of [...handlers]) {
            try {
                handler(data);
            } catch (error) {
                console.error(`[WS] ${eventName} 处理器执行失败:`, error);
            }
        }
    }
}

export default WebSocketClient;
