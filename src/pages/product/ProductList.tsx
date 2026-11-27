import React from "react";
import { FaCube, FaCode, FaDownload, FaUserFriends, FaWrench, FaPuzzlePiece, FaLayerGroup } from "react-icons/fa";
import PageHeader from "@/components/pageHeader/PageHeader";
import styles from "./ProductList.module.css";
import { MOCK_PRODUCTS } from "./MockProducts";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    工具: <FaWrench />,
    SDK: <FaCode />,
    插件: <FaPuzzlePiece />,
    平台: <FaLayerGroup />,
};

const TONES = [styles.tone0, styles.tone1, styles.tone2, styles.tone3];

const ProductList: React.FC = () => {
    return (
        <div className={styles.mainContent}>
            <PageHeader
                title={
                    <>
                        <FaCube /> 产品包
                    </>
                }
                description="我们打造的一系列软件产品与工具集"
            />

            <div className={styles.grid}>
                {MOCK_PRODUCTS.map((product, index) => (
                    <article key={product.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={`${styles.cardIcon} ${TONES[index % TONES.length]}`}>
                                {CATEGORY_ICONS[product.category] || <FaCube />}
                            </div>
                            <div className={styles.cardTitleRow}>
                                <h2 className={styles.cardTitle}>{product.name}</h2>
                                <span className={styles.versionBadge}>{product.version}</span>
                            </div>
                        </div>

                        <p className={styles.cardDesc}>{product.description}</p>

                        <div className={styles.cardFooter}>
                            <span className={styles.cardMeta}>
                                <span className={styles.categoryTag}>{product.category}</span>
                                <span className={styles.cardMetric}>
                                    <FaUserFriends /> {product.users} 人使用
                                </span>
                            </span>
                            <a className={styles.actionLink} href={product.link} target="_blank" rel="noreferrer">
                                <FaDownload /> 下载
                            </a>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
};

export default ProductList;
