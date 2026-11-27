const section = {
    authRequired: "You need to sign in to view and manage organizations.",
    title: "Organizations",
    applyCreate: "Apply to Create",
    searchPlaceholder: "Search by name, type, or description",
    filterLabel: "Filter organizations by status",
    total: "{{value}} organizations",
    clearFilter: "Clear filters",
    retry: "Retry",
    pending: 'Creation request for "{{name}}" is under review',
    applyPending: "Under review",
    applyPendingHint: "You already have a pending creation request. You can apply again once it is reviewed.",
    filter: {
        all: "All",
        active: "Active",
        inactive: "Inactive",
    },
    status: {
        active: "Active",
        inactive: "Inactive",
    },
    memberCount: "{{value}} members",
    rd: "R&D",
    viewDetail: "View Details",
    error: {
        title: "Failed to load organizations",
        message: "Check your network connection and try again.",
    },
    empty: {
        title: "No organizations yet",
        subtitle: "There are no organizations yet. Apply to create the first one.",
    },
    emptyFiltered: {
        title: "No matching organizations",
        subtitle: "Try a different keyword or clear the filters.",
    },
} as const;

export default section;
