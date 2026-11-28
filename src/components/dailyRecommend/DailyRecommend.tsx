import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FaFire } from "react-icons/fa";
import ArticleService, { type DailyRecommendItem } from "@/services/ArticleService.ts";
import { encodeId } from "@/utils/HashId";
import Skeleton from "../skeleton/Skeleton";
import styles from "./DailyRecommend.module.css";

/** 每条推荐最多展示的理由标签个数 */
const kReasonLimit = 2;

const DailyRecommend: React.FC = () => {
    const { t } = useTranslation("components");
    const navigate = useNavigate();
    const [items, setItems] = useState<DailyRecommendItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [hidden, setHidden] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;
        ArticleService.listDailyRecommend()
            .then((res) => {
                if (cancelled) {
                    return;
                }
                setItems(Array.isArray(res?.articles) ? res.articles : []);
            })
            .catch((err: unknown) => {
                if (cancelled) {
                    return;
                }
                // 服务端未启用推荐或快照生成失败时不占位
                console.warn("获取每日推荐失败:", err);
                setHidden(true);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (hidden) {
        return null;
    }

    const reasonsOf = (reason: string): string[] =>
        reason
            ? reason
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, kReasonLimit)
            : [];

    const reasonClassOf = (reason: string): string => {
        if (reason === "follow") {
            return styles.badgeFollow;
        }
        if (reason === "interest") {
            return styles.badgeInterest;
        }
        return styles.badge;
    };

    return (
        <div className={styles.panel}>
            <h3 className={styles.panelTitle}>
                <FaFire className={styles.titleIcon} /> {t("dailyRecommend.title")}
            </h3>
            {loading ? (
                <div className={styles.list}>
                    {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className={styles.skeletonItem}>
                            <Skeleton variant="text" width="100%" height={14} />
                            <Skeleton variant="text" width="55%" height={12} />
                        </div>
                    ))}
                </div>
            ) : items.length > 0 ? (
                <ol className={styles.list}>
                    {items.map((item) => (
                        <li
                            key={item.article_id}
                            className={styles.item}
                            onClick={() => navigate(`/article/${encodeId(item.article_id, "article")}`)}
                        >
                            <div className={styles.itemHead}>
                                <span className={`${styles.rank} ${item.rank_no <= 3 ? styles.rankTop : ""}`}>{item.rank_no}</span>
                                <span className={styles.itemTitle} title={item.title}>
                                    {item.title}
                                </span>
                            </div>
                            <div className={styles.itemMeta}>
                                <span className={styles.author}>{item.author || t("dailyRecommend.anonymous")}</span>
                                <span>{t("dailyRecommend.views", { value: item.views })}</span>
                            </div>
                            {reasonsOf(item.reason).length > 0 && (
                                <div className={styles.badges}>
                                    {reasonsOf(item.reason).map((reason) => (
                                        <span key={reason} className={reasonClassOf(reason)}>
                                            {t(`dailyRecommend.reason.${reason}`, { defaultValue: reason })}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </li>
                    ))}
                </ol>
            ) : (
                <div className={styles.empty}>{t("dailyRecommend.empty")}</div>
            )}
        </div>
    );
};

export default DailyRecommend;
