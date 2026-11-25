import http from "../infra/Http.ts";

/**
 * 后端 Registry::RenderJson 返回的单条指标
 */
export interface MetricSample {
    name: string;
    help: string;
    type: "counter" | "gauge" | "histogram";
    labels: Record<string, string>;
    /** counter / gauge 的值 */
    value?: number;
    /** histogram 分桶，累计计数 */
    buckets?: Array<{ le: number; cumulative: number }>;
    /** histogram 样本总数 */
    count?: number;
    /** histogram 样本值总和（秒） */
    sum?: number;
}

export interface MetricsPayload {
    metrics?: MetricSample[];
    /** 参与聚合的存活实例数 */
    instanceCount?: number;
    /** Redis 聚合失败/不完整时为 true，此时只保证本实例数据 */
    degraded?: boolean;
}

export interface RouteMetricsRow {
    route: string;
    requests: number;
    errors: number;
    /** 错误率，百分比 */
    errorRate: number;
    /** 当前 QPS（最近一个采样窗口） */
    recentQps: number;
    /** 启动以来平均 QPS */
    avgQps: number;
    /** 平均耗时（毫秒） */
    avgLatencyMs: number;
    /** P95 耗时（毫秒），null 表示超过最大桶 */
    p95Ms: number | null;
    /** P99 耗时（毫秒），null 表示超过最大桶 */
    p99Ms: number | null;
    /** 最大桶上界（毫秒） */
    maxBucketMs: number;
    buckets: Array<{ le: number; cumulative: number }>;
    count: number;
    /** 总耗时（秒） */
    sum: number;
}

export interface ServiceInfo {
    name: string;
    version: string;
    pid: string;
}

export interface ProcessMetrics {
    uptimeSeconds: number;
    rssKb: number;
    vmKb: number;
    threads: number;
    systemTotalKb: number;
    systemAvailableKb: number;
    fibers: number;
}

export interface ConnectionMetrics {
    http: number;
    /** WSServer 的 TCP 活跃连接数（含尚未完成握手/鉴权的连接） */
    ws: number;
    /** WSMgr 中已注册到设备表的 WebSocket 连接数 */
    wsDevices: number;
    onlineUsers: number;
}

export interface MetricsTotals {
    requests: number;
    errors: number;
    errorRate: number;
    recentQps: number;
    avgQps: number;
}

export interface MetricsSnapshot {
    service: ServiceInfo | null;
    process: ProcessMetrics;
    connections: ConnectionMetrics;
    totals: MetricsTotals;
    routes: RouteMetricsRow[];
    /** 参与聚合的存活实例数（后端未返回时按 1 处理） */
    instanceCount: number;
    /** 后端聚合降级（Redis 不可用/部分快照缺失） */
    degraded: boolean;
}

interface RouteAccumulator {
    requests: number;
    errors: number;
    avgQpsMilli: number;
    recentQpsMilli: number;
    histogram: MetricSample | null;
}

const ROUTE_REQUESTS = "blog_http_requests_total";
const ROUTE_ERRORS = "blog_http_errors_total";
const ROUTE_DURATION = "blog_http_request_duration_seconds";
const ROUTE_AVG_QPS = "blog_http_route_avg_qps_milli";
const ROUTE_RECENT_QPS = "blog_http_route_recent_qps_milli";

/**
 * 从累计分桶估算分位数。
 * 后端 JSON 只包含有限桶，样本落在最大桶之外时返回 null。
 */
function estimatePercentileMs(buckets: Array<{ le: number; cumulative: number }>, count: number, ratio: number): number | null {
    if (count <= 0 || buckets.length === 0) {
        return null;
    }

    const target = count * ratio;
    for (const bucket of buckets) {
        if (bucket.cumulative >= target) {
            return bucket.le * 1000;
        }
    }

    return null;
}

/**
 * 合并多个实例的 histogram 样本：同 le 的桶累加，count/sum 相加。
 */
function mergeHistogram(current: MetricSample | null, sample: MetricSample): MetricSample {
    if (!current) {
        return sample;
    }

    const buckets = new Map<number, number>();
    for (const bucket of current.buckets ?? []) {
        buckets.set(bucket.le, bucket.cumulative);
    }
    for (const bucket of sample.buckets ?? []) {
        buckets.set(bucket.le, (buckets.get(bucket.le) ?? 0) + bucket.cumulative);
    }

    return {
        ...current,
        buckets: Array.from(buckets.entries())
            .sort(([left], [right]) => left - right)
            .map(([le, cumulative]) => ({ le, cumulative })),
        count: (current.count ?? 0) + (sample.count ?? 0),
        sum: (current.sum ?? 0) + (sample.sum ?? 0),
    };
}

export class MetricsService {
    /**
     * 拉取聚合后的指标数据（metrics + instanceCount/degraded）
     */
    static async getMetrics(signal?: AbortSignal): Promise<MetricsPayload> {
        const response = await http.get<MetricsPayload>("/admin/metrics", signal ? { signal } : undefined);
        return response.data ?? {};
    }

    /**
     * 将原始指标聚合成页面可直接消费的结构
     * @param samples 原始指标
     * @param instanceCount 参与聚合的实例数
     * @param degraded 后端聚合是否降级
     */
    static buildSnapshot(samples: MetricSample[], instanceCount = 1, degraded = false): MetricsSnapshot {
        const routes = new Map<string, RouteAccumulator>();
        const sumByName = new Map<string, number>();
        const maxByName = new Map<string, number>();
        const minByName = new Map<string, number>();
        const firstByName = new Map<string, MetricSample>();

        const addSum = (name: string, value?: number) => {
            if (typeof value === "number") {
                sumByName.set(name, (sumByName.get(name) ?? 0) + value);
            }
        };
        const addMax = (name: string, value?: number) => {
            if (typeof value === "number") {
                maxByName.set(name, Math.max(maxByName.get(name) ?? value, value));
            }
        };
        const addMin = (name: string, value?: number) => {
            if (typeof value === "number") {
                minByName.set(name, Math.min(minByName.get(name) ?? value, value));
            }
        };

        for (const sample of samples) {
            const route = sample.labels?.route;
            if (route) {
                let accumulator = routes.get(route);
                if (!accumulator) {
                    accumulator = {
                        requests: 0,
                        errors: 0,
                        avgQpsMilli: 0,
                        recentQpsMilli: 0,
                        histogram: null,
                    };
                    routes.set(route, accumulator);
                }

                switch (sample.name) {
                    case ROUTE_REQUESTS:
                        accumulator.requests += sample.value ?? 0;
                        break;
                    case ROUTE_ERRORS:
                        accumulator.errors += sample.value ?? 0;
                        break;
                    case ROUTE_AVG_QPS:
                        accumulator.avgQpsMilli += sample.value ?? 0;
                        break;
                    case ROUTE_RECENT_QPS:
                        accumulator.recentQpsMilli += sample.value ?? 0;
                        break;
                    case ROUTE_DURATION:
                        accumulator.histogram = mergeHistogram(accumulator.histogram, sample);
                        break;
                    default:
                        break;
                }
                continue;
            }

            if (!firstByName.has(sample.name)) {
                firstByName.set(sample.name, sample);
            }
            if (sample.name === "blog_info") {
                continue;
            }
            if (sample.name === "blog_process_uptime_seconds") {
                addMin(sample.name, sample.value);
            } else if (
                sample.name === "blog_online_users" ||
                sample.name === "blog_metrics_snapshot_age_seconds" ||
                sample.name.startsWith("blog_system_memory_")
            ) {
                addMax(sample.name, sample.value);
            } else {
                addSum(sample.name, sample.value);
            }
        }

        const routeRows: RouteMetricsRow[] = Array.from(routes.entries()).map(([route, accumulator]) => {
            const histogram = accumulator.histogram;
            const buckets = histogram?.buckets ?? [];
            const count = histogram?.count ?? 0;
            const sum = histogram?.sum ?? 0;

            return {
                route,
                requests: accumulator.requests,
                errors: accumulator.errors,
                errorRate: accumulator.requests > 0 ? (accumulator.errors / accumulator.requests) * 100 : 0,
                recentQps: accumulator.recentQpsMilli / 1000,
                avgQps: accumulator.avgQpsMilli / 1000,
                avgLatencyMs: count > 0 ? (sum / count) * 1000 : 0,
                p95Ms: estimatePercentileMs(buckets, count, 0.95),
                p99Ms: estimatePercentileMs(buckets, count, 0.99),
                maxBucketMs: buckets.length > 0 ? buckets[buckets.length - 1].le * 1000 : 0,
                buckets,
                count,
                sum,
            };
        });

        routeRows.sort((a, b) => b.requests - a.requests);

        const sumValue = (name: string): number => sumByName.get(name) ?? 0;
        const maxValue = (name: string): number => maxByName.get(name) ?? 0;
        const minValue = (name: string): number => minByName.get(name) ?? 0;

        const info = firstByName.get("blog_info");
        const totalRequests = routeRows.reduce((total, row) => total + row.requests, 0);
        const totalErrors = routeRows.reduce((total, row) => total + row.errors, 0);

        return {
            service: info
                ? {
                      name: info.labels.name ?? "",
                      version: info.labels.version ?? "",
                      pid: info.labels.pid ?? "",
                  }
                : null,
            process: {
                uptimeSeconds: minValue("blog_process_uptime_seconds"),
                rssKb: sumValue("blog_process_resident_memory_kb"),
                vmKb: sumValue("blog_process_virtual_memory_kb"),
                threads: sumValue("blog_process_threads"),
                systemTotalKb: maxValue("blog_system_memory_total_kb"),
                systemAvailableKb: maxValue("blog_system_memory_available_kb"),
                fibers: sumValue("blog_fibers"),
            },
            connections: {
                http: sumValue("blog_http_active_connections"),
                ws: sumValue("blog_ws_active_connections"),
                wsDevices: sumValue("blog_ws_online_devices"),
                onlineUsers: maxValue("blog_online_users"),
            },
            totals: {
                requests: totalRequests,
                errors: totalErrors,
                errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
                recentQps: routeRows.reduce((total, row) => total + row.recentQps, 0),
                avgQps: routeRows.reduce((total, row) => total + row.avgQps, 0),
            },
            routes: routeRows,
            instanceCount,
            degraded,
        };
    }
}

export default MetricsService;
