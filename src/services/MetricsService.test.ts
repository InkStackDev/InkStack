import { describe, expect, it } from "vitest";
import { MetricsService, routeRowKey, type MetricSample } from "./MetricsService.ts";

function routeMetric(name: string, route: string, value: number, method = "GET"): MetricSample {
    return {
        name,
        type: "counter",
        labels: { route, method },
        value,
    };
}

function routeHistogram(
    route: string,
    buckets: Array<{ le: number; cumulative: number }>,
    count: number,
    sum: number,
    method = "GET",
): MetricSample {
    return {
        name: "blog_http_request_duration_seconds",
        type: "histogram",
        labels: { route, method },
        buckets,
        count,
        sum,
    };
}

describe("routeRowKey", () => {
    it("combines method and route, and degrades when method is missing", () => {
        expect(routeRowKey("GET", "/api/a")).toBe("GET /api/a");
        expect(routeRowKey("", "/api/a")).toBe("/api/a");
    });
});

describe("MetricsService.buildSnapshot", () => {
    const samples: MetricSample[] = [
        routeMetric("blog_http_requests_total", "/api/a", 100),
        routeMetric("blog_http_errors_total", "/api/a", 5),
        routeHistogram(
            "/api/a",
            [
                { le: 0.01, cumulative: 90 },
                { le: 0.1, cumulative: 95 },
            ],
            100,
            4,
        ),
        routeMetric("blog_http_requests_total", "/api/b", 300),
        routeMetric("blog_http_errors_total", "/api/b", 0),
        routeHistogram("/api/b", [{ le: 0.005, cumulative: 300 }], 300, 1.5),
        {
            name: "blog_info",
            type: "gauge",
            labels: { name: "blog", version: "1.0.0", pid: "4321" },
            value: 1,
        },
        {
            name: "blog_process_uptime_seconds",
            type: "gauge",
            labels: {},
            value: 90,
        },
        {
            name: "blog_http_active_connections",
            type: "gauge",
            labels: {},
            value: 3,
        },
        {
            name: "blog_online_users",
            type: "gauge",
            labels: {},
            value: 7,
        },
    ];

    it("aggregates totals and sorts routes by requests", () => {
        const snapshot = MetricsService.buildSnapshot(samples);

        expect(snapshot.routes.map((row) => row.key)).toEqual(["GET /api/b", "GET /api/a"]);
        expect(snapshot.totals.requests).toBe(400);
        expect(snapshot.totals.errors).toBe(5);
        expect(snapshot.totals.errorRate).toBeCloseTo(1.25);
    });

    it("derives average QPS from requests, uptime and instance count", () => {
        const snapshot = MetricsService.buildSnapshot(samples, 2, false);
        const routeA = snapshot.routes.find((row) => row.key === "GET /api/a");

        expect(routeA).toBeDefined();
        // 聚合后 requests 求和、uptime 取最小值，必须再除以实例数才不会被放大
        expect(routeA?.avgQps).toBeCloseTo(100 / 90 / 2);
        expect(snapshot.totals.avgQps).toBeCloseTo(400 / 90 / 2);
        // 首次采样没有基线，当前 QPS 退回平均值
        expect(routeA?.recentQps).toBeCloseTo(100 / 90 / 2);
        expect(snapshot.totals.recentQps).toBeCloseTo(snapshot.totals.avgQps);
    });

    it("computes current QPS from the request delta between two samples", () => {
        const t0 = 1_700_000_000_000;
        const first = MetricsService.buildSnapshot(samples, 1, false, null, t0);

        const later: MetricSample[] = samples.map((sample) => {
            if (sample.labels.route === "/api/a" && sample.name === "blog_http_requests_total") {
                return { ...sample, value: 150 };
            }
            return sample;
        });

        const second = MetricsService.buildSnapshot(later, 1, false, first.rateState, t0 + 5000);
        const routeA = second.routes.find((row) => row.key === "GET /api/a");
        const routeB = second.routes.find((row) => row.key === "GET /api/b");

        expect(routeA?.recentQps).toBeCloseTo(10);
        // 无新增请求的接口当前 QPS 归零，但平均 QPS 仍在累计值上
        expect(routeB?.recentQps).toBeCloseTo(0);
        expect(routeB?.avgQps).toBeCloseTo(300 / 90);
        expect(second.rateState.requests.get("GET /api/a")).toBe(150);
    });

    it("keeps different methods of the same route as separate rows", () => {
        const withPost = [
            ...samples,
            routeMetric("blog_http_requests_total", "/api/a", 20, "POST"),
            routeMetric("blog_http_errors_total", "/api/a", 2, "POST"),
        ];
        const snapshot = MetricsService.buildSnapshot(withPost);
        const get = snapshot.routes.find((row) => row.key === "GET /api/a");
        const post = snapshot.routes.find((row) => row.key === "POST /api/a");

        expect(snapshot.routes).toHaveLength(3);
        expect(get?.requests).toBe(100);
        expect(get?.errorRate).toBeCloseTo(5);
        expect(post?.requests).toBe(20);
        expect(post?.errorRate).toBeCloseTo(10);
    });

    it("computes latency statistics", () => {
        const snapshot = MetricsService.buildSnapshot(samples);
        const routeA = snapshot.routes.find((row) => row.key === "GET /api/a");

        expect(routeA?.avgLatencyMs).toBeCloseTo(40);
        expect(routeA?.p95Ms).toBeCloseTo(100);
        expect(routeA?.p99Ms).toBeNull();
        expect(routeA?.maxBucketMs).toBeCloseTo(100);
    });

    it("reads service and process gauges", () => {
        const snapshot = MetricsService.buildSnapshot(samples);

        expect(snapshot.service).toEqual({ name: "blog", version: "1.0.0", pid: "4321" });
        expect(snapshot.process.uptimeSeconds).toBe(90);
        expect(snapshot.connections.http).toBe(3);
        expect(snapshot.connections.onlineUsers).toBe(7);
    });

    it("sums per-instance connection gauges instead of taking the first sample", () => {
        const multi: MetricSample[] = [
            { name: "blog_ws_active_connections", type: "gauge", labels: {}, value: 0 },
            { name: "blog_ws_active_connections", type: "gauge", labels: {}, value: 1 },
            { name: "blog_ws_online_devices", type: "gauge", labels: {}, value: 0 },
            { name: "blog_ws_online_devices", type: "gauge", labels: {}, value: 1 },
            { name: "blog_online_users", type: "gauge", labels: {}, value: 0 },
            { name: "blog_online_users", type: "gauge", labels: {}, value: 2 },
        ];

        const snapshot = MetricsService.buildSnapshot(multi, 2, false);

        expect(snapshot.connections.ws).toBe(1);
        expect(snapshot.connections.wsDevices).toBe(1);
        expect(snapshot.connections.onlineUsers).toBe(2);
        expect(snapshot.instanceCount).toBe(2);
        expect(snapshot.degraded).toBe(false);
    });
});
