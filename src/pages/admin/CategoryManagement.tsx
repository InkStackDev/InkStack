import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    FaTags,
    FaPlus,
    FaEdit,
    FaTrash,
    FaFilter,
    FaEye,
    FaChartBar,
    FaCheckCircle,
    FaTimes,
    FaLayerGroup,
    FaAngleDoubleLeft,
    FaAngleDoubleRight,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";
import CustomSelect from "@/components/customSelect/CustomSelect";
import Input from "@/components/input/Input";
import Button from "@/components/button/Button";
import AdminListSkeleton from "@/components/adminListSkeleton/AdminListSkeleton";
import Modal from "@/components/modal/Modal";
import { confirm } from "@/components/confirm/Confirm";
import message from "@/components/message/Message";
import type { SelectOption } from "@/types";
import PageHeader from "@/components/pageHeader/PageHeader";
import styles from "./CategoryManagement.module.css";
import CategoryService from "@/services/CategoryService.ts";
import AuthService from "@/services/AuthService.ts";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/utils/Utils.ts";
import Avatar from "@/components/avatar/Avatar";
import { useDebouncedValue } from "@/hooks/UseDebouncedValue";
import { useInitialLoaded } from "@/hooks/UseInitialLoaded";

interface Category {
    id: string | number;
    name: string;
    slug: string;
    description: string;
    color: string;
    icon?: string;
    parentId?: string | number;
    userId: string | number;
    author?: string;
    authorAvatar?: string;
    articleCount: number;
    views: number;
    createdAt: string;
    updatedAt: string;
    status: "active" | "inactive";
    children?: Category[];
    level: number;
}

interface CategoryFormData {
    name: string;
    slug: string;
    description: string;
    color: string;
    icon: string;
    parentId: string;
    ownerId: string;
    status: "active" | "inactive";
}

interface CategoryStats {
    totalCategories: number;
    activeCategories: number;
    totalArticles: number;
    totalViews: number;
}

interface FilterOptions {
    search: string;
    userId: string;
    status: string;
    sortBy: "name" | "articleCount" | "views" | "createdAt";
    sortOrder: "asc" | "desc";
}

const SORT_BY_MAP: Record<FilterOptions["sortBy"], "name" | "created_at" | "article_count" | "views"> = {
    name: "name",
    articleCount: "article_count",
    views: "views",
    createdAt: "created_at",
};

const mapCategoryItem = (item: any): Category => ({
    id: item.id,
    name: item.name,
    slug: item.url,
    description: item.description || "",
    color: item.color,
    icon: item.icon,
    parentId: item.parent_id,
    userId: item.user_id ?? "",
    author: item.author || "",
    authorAvatar: item.author_avatar || "",
    articleCount: item.article_count || 0,
    views: item.view_count || 0,
    createdAt: item.create_time ? formatDateTime(item.create_time) : "-",
    updatedAt: item.update_time ? formatDateTime(item.update_time) : "-",
    status: item.status === 1 ? "active" : "inactive",
    level: item.parent_id ? 1 : 0,
    children: [],
});

const CategoryManagement: React.FC = () => {
    const { t } = useTranslation("admin");
    const { user } = useAuth();
    const iconMap: Record<string, string> = {
        "": t("categories.icons.default"),
        "📁": t("categories.icons.folder"),
        "💻": t("categories.icons.tech"),
        "🌟": t("categories.icons.life"),
        "✈️": t("categories.icons.travel"),
        "🍔": t("categories.icons.food"),
        "🎨": t("categories.icons.design"),
        "🎵": t("categories.icons.music"),
        "⚽": t("categories.icons.sports"),
        "📚": t("categories.icons.reading"),
        "📷": t("categories.icons.photography"),
    };
    const [categories, setCategories] = useState<Category[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState<CategoryStats>({
        totalCategories: 0,
        activeCategories: 0,
        totalArticles: 0,
        totalViews: 0,
    });
    const pageSize = 10;
    const [filters, setFilters] = useState<FilterOptions>({
        search: "",
        userId: "",
        status: "",
        sortBy: "name",
        sortOrder: "asc",
    });
    const debouncedSearch = useDebouncedValue(filters.search, 300);
    const initialLoaded = useInitialLoaded(loading);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CategoryFormData>({
        name: "",
        slug: "",
        description: "",
        color: "#4361ee",
        icon: "",
        parentId: "",
        ownerId: "",
        status: "active",
    });
    const [submitting, setSubmitting] = useState(false);

    const statusOptions: SelectOption[] = [
        { id: "", name: t("categories.status.all"), color: "#6c757d" },
        { id: "active", name: t("categories.status.active"), color: "#28a745" },
        { id: "inactive", name: t("categories.status.inactive"), color: "#dc3545" },
    ];

    const sortOptions: SelectOption[] = [
        { id: "name", name: t("categories.sort.name"), color: "#007bff" },
        { id: "articleCount", name: t("categories.sort.articleCount"), color: "#007bff" },
        { id: "views", name: t("categories.sort.views"), color: "#007bff" },
        { id: "createdAt", name: t("categories.sort.createdAt"), color: "#007bff" },
    ];

    const iconOptions: SelectOption[] = Object.entries(iconMap).map(([value, label]) => ({
        id: value,
        name: value ? `${label} ${value}` : label,
        color: "#007bff",
    }));

    const getParentCategoryOptions = (): SelectOption[] => {
        const options: SelectOption[] = [{ id: "", name: t("categories.parent.none"), color: "#6c757d" }];
        const ownerId = formData.ownerId || String(user?.id || "");
        const activeCategories = allCategories.filter(
            (cat) =>
                cat.level === 0 &&
                cat.status === "active" &&
                String(cat.userId) === ownerId &&
                String(cat.id) !== String(editingCategory?.id ?? ""),
        );
        options.push(
            ...activeCategories.map((cat) => ({
                id: cat.id.toString(),
                name: cat.name,
                color: "#17a2b8",
            })),
        );
        return options;
    };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await AuthService.listUsersAdmin({ page_num: 1, page_size: 1000 });
                const options = (res.list || []).map((item) => ({
                    id: String(item.id),
                    name: item.name || item.email,
                    color: "#17a2b8",
                }));
                setUserOptions([{ id: "", name: t("categories.filter.allUsers"), color: "#6c757d" }, ...options]);
            } catch (error) {
                console.error("加载用户列表失败:", error);
            }
        };
        fetchUsers();
    }, []);

    const loadCategories = useCallback(async () => {
        setLoading(true);
        try {
            const response = await CategoryService.queryCategory({
                page_num: currentPage,
                page_size: pageSize,
                user_id: filters.userId || undefined,
                status: filters.status === "" ? -1 : filters.status === "active" ? 1 : 0,
                keyword: debouncedSearch || undefined,
                sort_by: SORT_BY_MAP[filters.sortBy],
                sort_order: filters.sortOrder,
            });

            setCategories((response.list || []).map(mapCategoryItem));
            setTotal(response.total ?? 0);
            const responseStats = response.stats;
            setStats({
                totalCategories: responseStats?.total_categories ?? response.total ?? 0,
                activeCategories: responseStats?.active_categories ?? 0,
                totalArticles: responseStats?.total_articles ?? 0,
                totalViews: responseStats?.total_views ?? 0,
            });
        } catch (error) {
            console.error("加载分类失败:", error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, filters.userId, filters.status, filters.sortBy, filters.sortOrder, debouncedSearch]);

    const fetchAllCategories = useCallback(async () => {
        try {
            const response = await CategoryService.queryCategory();
            setAllCategories((response.list || []).map(mapCategoryItem));
        } catch (error) {
            console.error("加载分类选项失败:", error);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
    };

    const handleFilterChange = (field: keyof FilterOptions, value: string) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleSelectChange = (field: keyof FilterOptions) => {
        return (selectedOption: SelectOption | null) => {
            setFilters((prev) => ({ ...prev, [field]: selectedOption?.id || "" }));
            setCurrentPage(1);
        };
    };

    const clearFilters = () => {
        setFilters({ search: "", userId: "", status: "", sortBy: "name", sortOrder: "asc" });
        setCurrentPage(1);
    };

    const openModal = (category?: Category) => {
        void fetchAllCategories();
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                slug: category.slug || category.name,
                description: category.description,
                color: category.color,
                icon: category.icon || "",
                parentId: category.parentId && String(category.parentId) !== "0" ? String(category.parentId) : "",
                ownerId: String(category.userId || ""),
                status: category.status,
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: "",
                slug: "",
                description: "",
                color: "#4361ee",
                icon: "",
                parentId: "",
                ownerId: String(user?.id || ""),
                status: "active",
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCategory(null);
    };

    const saveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            message.error(t("categories.request.nameRequired"));
            return;
        }
        if (!formData.slug.trim()) {
            message.error(t("categories.request.slugRequired"));
            return;
        }
        setSubmitting(true);
        try {
            const ownerId = formData.ownerId || String(user?.id || "");
            await CategoryService.createCategory({
                id: editingCategory ? editingCategory.id : undefined,
                user_id: ownerId || undefined,
                name: formData.name,
                url: formData.slug || formData.name,
                color: formData.color,
                icon: formData.icon || "📁",
                description: formData.description,
                parent_id: formData.parentId,
                status: formData.status === "active" ? 1 : 0,
            });

            message.success(editingCategory ? t("categories.request.updated") : t("categories.request.created"));
            closeModal();
            await loadCategories();
            void fetchAllCategories();
        } catch (error) {
            message.error(t("categories.request.saveFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    const deleteCategory = async (category: Category) => {
        const isConfirmed = await confirm({
            title: t("categories.deleteConfirm.title"),
            content: (
                <div>
                    <p>
                        {t("categories.deleteConfirm.contentBefore")}
                        <strong>{category.name}</strong>
                        {t("categories.deleteConfirm.contentAfter")}
                    </p>
                    <p style={{ color: "var(--error)" }}>{t("categories.deleteConfirm.warning")}</p>
                </div>
            ),
            confirmText: t("categories.deleteConfirm.confirmText"),
            cancelText: t("categories.deleteConfirm.cancelText"),
        });
        if (!isConfirmed) {
            return;
        }

        try {
            await CategoryService.deleteCategory({ ids: String(category.id), user_id: category.userId });
            message.success(t("categories.request.deleted"));
            await loadCategories();
            void fetchAllCategories();
        } catch (error) {
            message.error(t("categories.request.deleteFailed"));
        }
    };

    const toggleCategoryStatus = async (category: Category) => {
        const newStatus = category.status === "active" ? "inactive" : "active";
        try {
            await CategoryService.createCategory({
                id: category.id,
                user_id: category.userId,
                name: category.name,
                url: category.slug || category.name,
                color: category.color,
                icon: category.icon || "📁",
                description: category.description,
                parent_id: category.parentId || "",
                status: newStatus === "active" ? 1 : 0,
            });
            await loadCategories();
            void fetchAllCategories();
        } catch (error) {
            message.error(t("categories.request.toggleFailed"));
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) {
            return "-";
        }
        return formatDateTime(dateString);
    };

    const getOwnerName = (category: Category) =>
        category.author || userOptions.find((option) => option.id === String(category.userId))?.name || category.userId || "-";

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageStart = total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const pageEnd = Math.min(currentPage * pageSize, total);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + maxVisiblePages - 1);
            if (start > 1) {
                pages.push(1);
                if (start > 2) {
                    pages.push("...");
                }
            }
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            if (end < totalPages) {
                if (end < totalPages - 1) {
                    pages.push("...");
                }
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (!initialLoaded) {
        return (
            <div className={styles.categoryManagement}>
                <AdminListSkeleton stats={4} columns={6} />
            </div>
        );
    }

    return (
        <div className={styles.categoryManagement}>
            <PageHeader
                title={t("categories.title")}
                description={t("categories.description")}
                actions={
                    <Button onClick={() => openModal()}>
                        <FaPlus />
                        {t("categories.addCategory")}
                    </Button>
                }
            />

            {/* 统计卡片 */}
            <div className={styles.statsContainer}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.primary}`}>
                        <FaLayerGroup />
                    </div>
                    <div className={styles.statValue}>{stats.totalCategories}</div>
                    <div className={styles.statLabel}>{t("categories.stats.total")}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.success}`}>
                        <FaCheckCircle />
                    </div>
                    <div className={styles.statValue}>{stats.activeCategories}</div>
                    <div className={styles.statLabel}>{t("categories.stats.active")}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.primary}`}>
                        <FaChartBar />
                    </div>
                    <div className={styles.statValue}>{stats.totalArticles}</div>
                    <div className={styles.statLabel}>{t("categories.stats.articles")}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.warning}`}>
                        <FaEye />
                    </div>
                    <div className={styles.statValue}>{stats.totalViews.toLocaleString()}</div>
                    <div className={styles.statLabel}>{t("categories.stats.views")}</div>
                </div>
            </div>

            {/* 筛选区域 */}
            <div className={styles.filterSection}>
                <div className={styles.filterHeader}>
                    <h3 className={styles.filterTitle}>
                        <FaFilter />
                        {t("categories.filter.title")}
                    </h3>
                    <div className={styles.filterActions}>
                        <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={clearFilters}>
                            {t("categories.filter.clear")}
                        </button>
                    </div>
                </div>
                <div className={styles.filterForm}>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t("categories.filter.searchLabel")}</label>
                        <Input
                            placeholder={t("categories.filter.searchPlaceholder")}
                            value={filters.search}
                            onChange={(value) => handleFilterChange("search", value)}
                            allowClear={true}
                            size="large"
                            style={{ minHeight: "46px", height: "50px" }}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t("categories.filter.userLabel")}</label>
                        <CustomSelect
                            name={t("categories.filter.userLabel")}
                            options={userOptions}
                            value={userOptions.find((option) => option.id === filters.userId) || userOptions[0] || null}
                            onChange={handleSelectChange("userId")}
                            placeholder={t("categories.filter.userPlaceholder")}
                            className="adminCustomSelect"
                            hideBadge={true}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t("categories.filter.statusLabel")}</label>
                        <CustomSelect
                            name={t("categories.filter.statusLabel")}
                            options={statusOptions}
                            value={statusOptions.find((option) => option.id === filters.status) || null}
                            onChange={handleSelectChange("status")}
                            placeholder={t("categories.filter.statusPlaceholder")}
                            className="adminCustomSelect"
                            hideBadge={true}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t("categories.filter.sortLabel")}</label>
                        <CustomSelect
                            name={t("categories.filter.sortLabel")}
                            options={sortOptions}
                            value={sortOptions.find((option) => option.id === filters.sortBy) || null}
                            onChange={handleSelectChange("sortBy")}
                            placeholder={t("categories.filter.sortPlaceholder")}
                            className="adminCustomSelect"
                            hideBadge={true}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t("categories.filter.orderLabel")}</label>
                        <button
                            className={`${styles.btn} ${styles.btnOutline}`}
                            onClick={() => {
                                setFilters((prev) => ({ ...prev, sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" }));
                                setCurrentPage(1);
                            }}
                            style={{ minHeight: "46px", height: "50px", justifyContent: "center" }}
                        >
                            {filters.sortOrder === "asc" ? t("categories.filter.ascending") : t("categories.filter.descending")}
                        </button>
                    </div>
                </div>
            </div>

            {/* 分类表格 */}
            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <h3 className={styles.tableTitle}>{t("categories.table.title")}</h3>
                    <div className={styles.tableActions}>
                        <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                            {t("categories.table.total", { total })}
                        </span>
                    </div>
                </div>
                <table className={styles.categoriesTable}>
                    <thead>
                        <tr>
                            <th>{t("categories.table.headers.info")}</th>
                            <th>{t("categories.table.headers.owner")}</th>
                            <th>{t("categories.table.headers.parent")}</th>
                            <th>{t("categories.table.headers.status")}</th>
                            <th>{t("categories.table.headers.stats")}</th>
                            <th>{t("categories.table.headers.createdAt")}</th>
                            <th>{t("categories.table.headers.actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length > 0 ? (
                            categories.map((category) => (
                                <tr key={category.id}>
                                    <td>
                                        <div className={styles.categoryInfo}>
                                            <div className={styles.categoryIcon} style={{ backgroundColor: category.color }}>
                                                {category.icon || <FaTags />}
                                            </div>
                                            <div className={styles.categoryDetails}>
                                                <div className={styles.categoryName}>{category.name}</div>
                                                <div className={styles.categorySlug}>{category.slug}</div>
                                                {category.description && (
                                                    <div className={styles.categoryDescription}>{category.description}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.ownerCell}>
                                            <Avatar src={category.authorAvatar} name={String(getOwnerName(category))} size={24} />
                                            <span>{getOwnerName(category)}</span>
                                        </span>
                                    </td>
                                    <td>
                                        {category.parentId ? (
                                            <span className={styles.parentBadge}>
                                                {allCategories.find((c) => c.id === category.parentId)?.name ||
                                                    categories.find((c) => c.id === category.parentId)?.name ||
                                                    "-"}
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>
                                                {t("categories.parent.top")}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[category.status]}`}>
                                            <span className={styles.statusIndicator}></span>
                                            {category.status === "active"
                                                ? t("categories.status.active")
                                                : t("categories.status.inactive")}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.statsInfo}>
                                            <span>
                                                <FaTags /> {t("categories.table.articles", { value: category.articleCount })}
                                            </span>
                                            <span>
                                                <FaEye /> {category.views.toLocaleString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td>{formatDate(category.createdAt)}</td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button
                                                className={`${styles.actionButton} ${styles.edit}`}
                                                title={t("categories.table.edit")}
                                                onClick={() => openModal(category)}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                className={`${styles.actionButton} ${styles.edit}`}
                                                title={
                                                    category.status === "active"
                                                        ? t("categories.table.disable")
                                                        : t("categories.table.enable")
                                                }
                                                onClick={() => toggleCategoryStatus(category)}
                                            >
                                                {category.status === "active" ? <FaTimes /> : <FaCheckCircle />}
                                            </button>
                                            <Button
                                                color="error"
                                                variant="ghost"
                                                size="small"
                                                onClick={() => deleteCategory(category)}
                                                className={styles.actionButton}
                                                aria-label={t("categories.table.delete")}
                                            >
                                                <FaTrash />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={7}
                                    style={{
                                        textAlign: "center",
                                        padding: "40px",
                                        color: "var(--text-secondary)",
                                    }}
                                >
                                    {t("categories.table.empty")}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className={styles.pagination}>
                    <span className={styles.pageInfo}>
                        {t("categories.pagination.info", { start: pageStart, end: pageEnd, total })}
                    </span>
                    <div className={styles.pageButtons}>
                        <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                            <FaAngleDoubleLeft />
                        </button>
                        <button
                            className={styles.pageBtn}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((prev) => prev - 1)}
                        >
                            <FaChevronLeft />
                        </button>

                        {getPageNumbers().map((page, index) => (
                            <React.Fragment key={index}>
                                {page === "..." ? (
                                    <span className={styles.paginationEllipsis}>...</span>
                                ) : (
                                    <button
                                        className={`${styles.pageBtn} ${currentPage === page ? styles.active : ""}`}
                                        onClick={() => setCurrentPage(page as number)}
                                        disabled={total === 0}
                                    >
                                        {page}
                                    </button>
                                )}
                            </React.Fragment>
                        ))}

                        <button
                            className={styles.pageBtn}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((prev) => prev + 1)}
                        >
                            <FaChevronRight />
                        </button>
                        <button
                            className={styles.pageBtn}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                        >
                            <FaAngleDoubleRight />
                        </button>
                    </div>
                </div>
            </div>

            {/* 新增/编辑模态框 */}
            <Modal
                visible={showModal}
                title={editingCategory ? t("categories.modal.editTitle") : t("categories.modal.createTitle")}
                onClose={closeModal}
                width={600}
                footer={
                    <>
                        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal} disabled={submitting}>
                            {t("categories.modal.cancel")}
                        </button>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveCategory} disabled={submitting}>
                            {submitting
                                ? t("categories.modal.saving")
                                : editingCategory
                                  ? t("categories.modal.save")
                                  : t("categories.modal.create")}
                        </button>
                    </>
                }
            >
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t("categories.modal.ownerLabel")}</label>
                    <CustomSelect
                        name={t("categories.modal.ownerLabel")}
                        options={userOptions.filter((option) => option.id !== "")}
                        value={userOptions.find((option) => option.id === formData.ownerId) || null}
                        onChange={(option) =>
                            setFormData((prev) => ({
                                ...prev,
                                ownerId: String(option?.id || ""),
                                parentId: "",
                            }))
                        }
                        hideBadge={true}
                        placeholder={t("categories.modal.ownerPlaceholder")}
                        disabled={!!editingCategory}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t("categories.modal.nameLabel")}</label>
                    <Input
                        placeholder={t("categories.modal.namePlaceholder")}
                        value={formData.name}
                        onChange={(value) => {
                            setFormData((prev) => ({
                                ...prev,
                                name: value,
                                slug: value ? generateSlug(value) || value : "",
                            }));
                        }}
                        className={styles.formInput}
                        size="large"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t("categories.modal.slugLabel")}</label>
                    <Input
                        placeholder={t("categories.modal.slugPlaceholder")}
                        value={formData.slug}
                        onChange={(value) => setFormData((prev) => ({ ...prev, slug: value }))}
                        className={styles.formInput}
                        size="large"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t("categories.modal.descriptionLabel")}</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        className={styles.formTextarea}
                        placeholder={t("categories.modal.descriptionPlaceholder")}
                        rows={3}
                    />
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>{t("categories.modal.colorLabel")}</label>
                        <div className={styles.colorPickerContainer}>
                            <input
                                type="color"
                                className={styles.colorInput}
                                value={formData.color}
                                onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                            />
                            <div className={styles.colorPreview} style={{ backgroundColor: formData.color }} />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>{t("categories.modal.iconLabel")}</label>
                        <CustomSelect
                            name={t("categories.modal.iconLabel")}
                            value={iconOptions.find((o) => o.id === formData.icon) || null}
                            onChange={(option) => setFormData((prev) => ({ ...prev, icon: String(option?.id || "") }))}
                            options={iconOptions}
                            hideBadge={true}
                            placeholder={t("categories.modal.iconPlaceholder")}
                        />
                    </div>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>{t("categories.modal.parentLabel")}</label>
                        <CustomSelect
                            name={t("categories.modal.parentLabel")}
                            value={getParentCategoryOptions().find((option) => option.id === formData.parentId) || null}
                            onChange={(option) => setFormData((prev) => ({ ...prev, parentId: String(option?.id || "") }))}
                            options={getParentCategoryOptions()}
                            hideBadge={true}
                            placeholder={t("categories.modal.parentPlaceholder")}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>{t("categories.modal.statusLabel")}</label>
                        <CustomSelect
                            name={t("categories.modal.statusLabel")}
                            value={statusOptions.find((option) => option.id === formData.status) || null}
                            onChange={(option) =>
                                setFormData((prev) => ({ ...prev, status: (option?.id as "active" | "inactive") || "active" }))
                            }
                            options={statusOptions.slice(1)}
                            hideBadge={true}
                            placeholder={t("categories.modal.statusPlaceholder")}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CategoryManagement;
