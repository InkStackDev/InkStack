import React from "react";
import { useNavigationPending } from "../routeProgress/NavigationState";
import styles from "./NavSpinner.module.css";

/** 导航栏中的 Turbo 风格转圈提示 */
const NavSpinner: React.FC = () => {
    const pending = useNavigationPending();
    return (
        <span className={`${styles.slot} ${pending ? styles.visible : ""}`}>
            {pending ? <span className={styles.spinner} aria-hidden="true" /> : null}
        </span>
    );
};

export default NavSpinner;
