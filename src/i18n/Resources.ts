/**
 * i18n 资源汇总（以 zh-CN 为 source of truth）
 *
 * en-US 资源单独放在 ResourcesEn.ts，按需动态加载，避免首屏同时打包两种语言。
 * 新增模块时：在 locales/<lang>/ 下补同名命名空间文件，并在此登记。
 */

import commonZh from "./locales/zh-CN/Common";
import navZh from "./locales/zh-CN/Nav";
import authZh from "./locales/zh-CN/Auth";
import errorZh from "./locales/zh-CN/Error";
import articleZh from "./locales/zh-CN/Article";
import adminZh from "./locales/zh-CN/Admin";
import personalZh from "./locales/zh-CN/Personal";
import rdZh from "./locales/zh-CN/Rd";
import calendarZh from "./locales/zh-CN/Calendar";
import enumsZh from "./locales/zh-CN/Enums";
import organizationZh from "./locales/zh-CN/Organization";
import assignmentZh from "./locales/zh-CN/Assignment";
import userZh from "./locales/zh-CN/User";
import profileZh from "./locales/zh-CN/Profile";
import componentsZh from "./locales/zh-CN/Components";
import homeZh from "./locales/zh-CN/Home";
import blogZh from "./locales/zh-CN/Blog";
import servicesZh from "./locales/zh-CN/Services";
import sampleZh from "./locales/zh-CN/Sample";

export const resources = {
    "zh-CN": {
        common: commonZh,
        nav: navZh,
        auth: authZh,
        error: errorZh,
        article: articleZh,
        admin: adminZh,
        personal: personalZh,
        rd: rdZh,
        calendar: calendarZh,
        enums: enumsZh,
        organization: organizationZh,
        assignment: assignmentZh,
        user: userZh,
        profile: profileZh,
        components: componentsZh,
        home: homeZh,
        blog: blogZh,
        services: servicesZh,
        sample: sampleZh,
        backend: {},
    },
} as const;

export async function loadEnResources() {
    const module = await import("./ResourcesEn");
    return module.enResources;
}

export default resources;
