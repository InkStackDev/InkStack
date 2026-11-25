import React from "react";
import Skeleton from "@/components/skeleton/Skeleton";
import styles from "./AdminListSkeleton.module.css";

interface AdminListSkeletonProps {
    /** 统计卡片数量，0 表示不展示统计区 */
    stats?: number;
    /** 表格行数 */
    rows?: number;
    /** 表格列数 */
    columns?: number;
}

const AdminListSkeleton: React.FC<AdminListSkeletonProps> = ({ stats = 4, rows = 7, columns = 6 }) => {
    const gridStyle: React.CSSProperties = {
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <Skeleton width={180} height={26} />
                    <Skeleton width={320} height={14} style={{ marginTop: 10 }} />
                </div>
            </div>

            {stats > 0 && (
                <div className={styles.stats}>
                    {Array.from({ length: stats }, (_, index) => (
                        <div key={index} className={styles.statCard}>
                            <Skeleton variant="rounded" width={40} height={40} />
                            <Skeleton width="45%" height={26} style={{ marginTop: 12 }} />
                            <Skeleton width="65%" height={13} style={{ marginTop: 8 }} />
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.filter}>
                {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} variant="rounded" width="100%" height={42} />
                ))}
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <Skeleton width={110} height={18} />
                    <Skeleton width={90} height={14} />
                </div>
                <div className={styles.tableHeadRow} style={gridStyle}>
                    {Array.from({ length: columns }, (_, index) => (
                        <Skeleton key={index} width="70%" height={13} />
                    ))}
                </div>
                {Array.from({ length: rows }, (_, rowIndex) => (
                    <div key={rowIndex} className={styles.tableRow} style={gridStyle}>
                        {Array.from({ length: columns }, (_, colIndex) => (
                            <Skeleton key={colIndex} width={colIndex === 0 ? "85%" : "60%"} height={14} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminListSkeleton;
