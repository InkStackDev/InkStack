import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { ArticleMarkdownPluginProps } from "./Markdown";

/**
 * 含数学公式的 Markdown 插件。
 * 单独成模块，配合动态 import，让 KaTeX 只在文章包含公式时加载。
 */
export const articleMarkdownPlugins: ArticleMarkdownPluginProps = {
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [rehypeKatex],
};

export default articleMarkdownPlugins;
