import React from "react";
import styles from "./OrganizationDetailSkeleton.module.css";

const OrganizationDetailSkeleton: React.FC = () => {
    return (
        <div className={styles.wrapper} aria-hidden="true">
            <div className={styles.heroTop}>
                <div className={`${styles.block} ${styles.back}`} />
                <div className={`${styles.block} ${styles.action}`} />
            </div>

            <div className={styles.heroMain}>
                <div className={`${styles.block} ${styles.avatar}`} />
                <div className={styles.heroBody}>
                    <div className={`${styles.block} ${styles.title}`} />
                    <div className={`${styles.block} ${styles.desc}`} />
                    <div className={`${styles.block} ${styles.meta}`} />
                </div>
            </div>

            <div className={styles.statsRow}>
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className={`${styles.block} ${styles.stat}`} />
                ))}
            </div>

            <div className={styles.panel}>
                <div className={styles.panelHead}>
                    <div className={`${styles.block} ${styles.tabs}`} />
                    <div className={`${styles.block} ${styles.panelAction}`} />
                </div>
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className={styles.row}>
                        <div className={`${styles.block} ${styles.cellUser}`} />
                        <div className={`${styles.block} ${styles.cell}`} />
                        <div className={`${styles.block} ${styles.cell}`} />
                        <div className={`${styles.block} ${styles.cell}`} />
                        <div className={`${styles.block} ${styles.cell}`} />
                    </div>
                ))}
                <div className={styles.paginationRow}>
                    <div className={`${styles.block} ${styles.paginationInfo}`} />
                    <div className={`${styles.block} ${styles.paginationBtn}`} />
                </div>
            </div>
        </div>
    );
};

export default OrganizationDetailSkeleton;
