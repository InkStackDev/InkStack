import React from "react";
import Button from "@/components/button/Button";
import styles from "./ErrorState.module.css";

interface ErrorStateProps {
    title: string;
    message?: string;
    icon?: React.ReactNode;
    actionText?: string;
    onAction?: () => void;
    className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ title, message, icon, actionText, onAction, className = "" }) => {
    return (
        <div className={`${styles.container} ${className}`}>
            {icon && <div className={styles.icon}>{icon}</div>}
            <h2 className={styles.title}>{title}</h2>
            {message && <p className={styles.message}>{message}</p>}
            {actionText && (
                <Button className={styles.actionBtn} onClick={onAction}>
                    {actionText}
                </Button>
            )}
        </div>
    );
};

export default ErrorState;
