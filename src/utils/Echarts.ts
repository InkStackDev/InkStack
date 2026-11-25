/**
 * 统一注册 ECharts 按需模块，避免把完整 echarts 打进图表页面 chunk。
 * 新增图表类型时，在这里补充对应的 Chart/Component 注册即可。
 */
import { use } from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

use([
    BarChart,
    LineChart,
    PieChart,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    LabelLayout,
    UniversalTransition,
    CanvasRenderer,
]);

export * from "echarts/core";
export type { EChartsOption };
