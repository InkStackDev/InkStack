import http from "../infra/Http.ts";

export interface SiteSettings {
    siteName: string;
    siteDescription: string;
    siteKeywords: string;
    siteIcon: string;
    siteLogo: string;
    favicon: string;
    adminEmail: string;
    timezone: string;
    language: string;
}

export interface EmailSettings {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    smtpEncryption: "none" | "ssl" | "tls";
    fromEmail: string;
    fromName: string;
    replyTo: string;
}

export interface SystemSettings {
    enableRegistration: boolean;
    requireEmailVerification: boolean;
    allowComments: boolean;
    moderateComments: boolean;
    maxFileSize: number;
    allowedFileTypes: string;
    sessionTimeout: number;
    maintenanceMode: boolean;
    backupSchedule: string;
}

export interface AllSettings {
    siteName: string;
    siteDescription: string;
    siteKeywords: string;
    siteIcon: string;
    siteLogo: string;
    favicon: string;
    adminEmail: string;
    timezone: string;
    language: string;

    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    smtpEncryption: "none" | "ssl" | "tls";
    fromEmail: string;
    fromName: string;
    replyTo: string;

    enableRegistration: boolean;
    requireEmailVerification: boolean;
    allowComments: boolean;
    moderateComments: boolean;
    maxFileSize: number;
    allowedFileTypes: string;
    sessionTimeout: number;
    maintenanceMode: boolean;
    backupSchedule: string;
}

export interface UploadImageResponse {
    url: string;
}

export interface PublicSiteSettings {
    siteName: string;
    siteDescription: string;
    siteKeywords: string;
    siteIcon: string;
    siteLogo: string;
    favicon: string;
    timezone: string;
    language: string;
    enableRegistration: boolean;
    allowComments: boolean;
    moderateComments: boolean;
    maintenanceMode: boolean;
}

export interface SiteStatus {
    maintenanceMode: boolean;
}

function toPublicSiteSettings(raw: any): PublicSiteSettings {
    return {
        siteName: raw.site_name || "",
        siteDescription: raw.site_description || "",
        siteKeywords: raw.site_keywords || "",
        siteIcon: raw.site_icon || "",
        siteLogo: raw.site_logo || "",
        favicon: raw.favicon || "",
        timezone: raw.timezone || "",
        language: raw.language || "",
        enableRegistration: !!raw.enable_registration,
        allowComments: !!raw.allow_comments,
        moderateComments: !!raw.moderate_comments,
        maintenanceMode: !!raw.maintenance_mode,
    };
}

function toAllSettings(raw: any): AllSettings {
    return {
        siteName: raw.site_name || "",
        siteDescription: raw.site_description || "",
        siteKeywords: raw.site_keywords || "",
        siteIcon: raw.site_icon || "",
        siteLogo: raw.site_logo || "",
        favicon: raw.favicon || "",
        adminEmail: raw.admin_email || "",
        timezone: raw.timezone || "",
        language: raw.language || "",
        smtpHost: raw.smtp_host || "",
        smtpPort: Number(raw.smtp_port) || 0,
        smtpUsername: raw.smtp_username || "",
        smtpPassword: raw.smtp_password || "",
        smtpEncryption: raw.smtp_encryption || "none",
        fromEmail: raw.from_email || "",
        fromName: raw.from_name || "",
        replyTo: raw.reply_to || "",
        enableRegistration: !!raw.enable_registration,
        requireEmailVerification: !!raw.require_email_verification,
        allowComments: !!raw.allow_comments,
        moderateComments: !!raw.moderate_comments,
        maxFileSize: Number(raw.max_file_size) || 0,
        allowedFileTypes: raw.allowed_file_types || "",
        sessionTimeout: Number(raw.session_timeout) || 0,
        maintenanceMode: !!raw.maintenance_mode,
        backupSchedule: raw.backup_schedule || "",
    };
}

function toSettingsPayload(settings: AllSettings): Record<string, unknown> {
    return {
        site_name: settings.siteName,
        site_description: settings.siteDescription,
        site_keywords: settings.siteKeywords,
        site_icon: settings.siteIcon,
        site_logo: settings.siteLogo,
        favicon: settings.favicon,
        admin_email: settings.adminEmail,
        timezone: settings.timezone,
        language: settings.language,
        smtp_host: settings.smtpHost,
        smtp_port: settings.smtpPort,
        smtp_username: settings.smtpUsername,
        smtp_password: settings.smtpPassword,
        smtp_encryption: settings.smtpEncryption,
        from_email: settings.fromEmail,
        from_name: settings.fromName,
        reply_to: settings.replyTo,
        enable_registration: settings.enableRegistration,
        require_email_verification: settings.requireEmailVerification,
        allow_comments: settings.allowComments,
        moderate_comments: settings.moderateComments,
        max_file_size: settings.maxFileSize,
        allowed_file_types: settings.allowedFileTypes,
        session_timeout: settings.sessionTimeout,
        maintenance_mode: settings.maintenanceMode,
        backup_schedule: settings.backupSchedule,
    };
}

export class SettingsService {
    static async getPublicSettings(): Promise<PublicSiteSettings> {
        const response = await http.get<any>("/site/settings");
        return toPublicSiteSettings(response.data || {});
    }

    static async getSiteStatus(): Promise<SiteStatus> {
        const response = await http.get<any>("/site/status");
        return { maintenanceMode: !!response.data?.maintenance_mode };
    }

    static async getSettings(): Promise<AllSettings> {
        const response = await http.get<any>("/admin/settings");
        return toAllSettings(response.data || {});
    }

    static async updateSettings(settings: AllSettings): Promise<void> {
        await http.put("/admin/settings", toSettingsPayload(settings));
    }

    static async uploadImage(file: File, type: "siteIcon" | "siteLogo" | "favicon"): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const response = await http.upload<UploadImageResponse>("/admin/settings/upload", formData);
        return response.data.url;
    }
}

export default SettingsService;
