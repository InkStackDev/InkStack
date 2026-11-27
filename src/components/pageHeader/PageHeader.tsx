import React from "react";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
    /** 页面主标题 */
    title: React.ReactNode;
    /** 标题下的说明文字 */
    description?: React.ReactNode;
    /** 右侧操作区 */
    actions?: React.ReactNode;
    /** 标题/描述下方的补充内容（如提示行） */
    children?: React.ReactNode;
    className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, children, className = "" }) => {
    return (
        <div className={`${styles.header} ${className}`.trim()}>
            <div className={styles.text}>
                <h1 className={styles.title}>{title}</h1>
                {description && <p className={styles.description}>{description}</p>}
                {children}
            </div>
            {actions && <div className={styles.actions}>{actions}</div>}
        </div>
    );
};

export default PageHeader;
