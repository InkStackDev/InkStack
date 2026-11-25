import React from "react";
import { useTranslation } from "react-i18next";
import { FaBuilding, FaShieldAlt, FaUserShield } from "react-icons/fa";
import type { IconType } from "react-icons";
import MascotLoader from "@/components/mascotLoader";

export type RdEntryStage = "auth" | "access" | "org";

interface RdEntryLoaderProps {
    stage: RdEntryStage;
    /** fullscreen：整页加载；overlay：覆盖在内容区之上，保持研发平台外壳常驻 */
    variant?: "fullscreen" | "overlay";
    /** 快速加载时不闪加载态，超过该毫秒数才展示 */
    delayMs?: number;
}

const STAGES: RdEntryStage[] = ["auth", "access", "org"];

const STAGE_ICONS: Record<RdEntryStage, IconType> = {
    auth: FaUserShield,
    access: FaShieldAlt,
    org: FaBuilding,
};

const RdEntryLoader: React.FC<RdEntryLoaderProps> = ({ stage, variant = "fullscreen", delayMs }) => {
    const { t } = useTranslation("rd");
    const Icon = STAGE_ICONS[stage];

    return (
        <MascotLoader
            variant={variant}
            delayMs={delayMs}
            tone={stage}
            animateKey={stage}
            badge={<Icon />}
            stageLabel={t(`entryLoader.stages.${stage}`)}
            title={t("entryLoader.title")}
            description={t(`entryLoader.descriptions.${stage}`)}
            progress={{ total: STAGES.length, current: STAGES.indexOf(stage) }}
        />
    );
};

export default RdEntryLoader;
