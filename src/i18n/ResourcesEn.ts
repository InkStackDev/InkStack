/**
 * en-US 资源单独成包，仅在用户使用英文时动态加载。
 */

import common from "./locales/en-US/Common";
import nav from "./locales/en-US/Nav";
import auth from "./locales/en-US/Auth";
import error from "./locales/en-US/Error";
import article from "./locales/en-US/Article";
import admin from "./locales/en-US/Admin";
import personal from "./locales/en-US/Personal";
import rd from "./locales/en-US/Rd";
import calendar from "./locales/en-US/Calendar";
import enums from "./locales/en-US/Enums";
import organization from "./locales/en-US/Organization";
import assignment from "./locales/en-US/Assignment";
import user from "./locales/en-US/User";
import profile from "./locales/en-US/Profile";
import components from "./locales/en-US/Components";
import home from "./locales/en-US/Home";
import blog from "./locales/en-US/Blog";
import services from "./locales/en-US/Services";
import sample from "./locales/en-US/Sample";

export const enResources = {
    common,
    nav,
    auth,
    error,
    article,
    admin,
    personal,
    rd,
    calendar,
    enums,
    organization,
    assignment,
    user,
    profile,
    components,
    home,
    blog,
    services,
    sample,
} as const;

export default enResources;
