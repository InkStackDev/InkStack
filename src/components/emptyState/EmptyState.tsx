import React from "react";
import Button from "@/components/button/Button";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    actionText?: string;
    onAction?: () => void;
    /** card：独立卡片（默认）；inline：用于表格/列表内部空行 */
    variant?: "card" | "inline";
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon,
    actionText,
    onAction,
    variant = "card",
    className = "",
}) => {
    return (
        <div className={`${styles.container} ${styles[variant]} ${className}`.trim()}>
            {icon && <div className={styles.icon}>{icon}</div>}
            <h3 className={styles.title}>{title}</h3>
            {description && <p className={styles.description}>{description}</p>}
            {actionText && onAction && (
                <div className={styles.action}>
                    <Button onClick={onAction}>{actionText}</Button>
                </div>
            )}
        </div>
    );
};

export default EmptyState;
