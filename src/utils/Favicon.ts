const SIZE = 32;
const BADGE_X = SIZE - 2;
const BADGE_Y = 2;

let originalHref: string | null = null;
let lastUnread = 0;
let loadingTimer: ReturnType<typeof setInterval> | null = null;
let loadingBaseHref: string | null = null;
let loadingRotation = 0;

export function resetOriginalFavicon(): void {
    originalHref = null;
}

/**
 * 导航期间在浏览器页签显示旋转的 favicon，模拟 GitHub/浏览器的加载指示。
 */
export function setFaviconLoading(active: boolean): void {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
        return;
    }

    if (active) {
        if (loadingTimer !== null) {
            return;
        }
        loadingBaseHref = link.href;
        loadingRotation = 0;
        const render = () => {
            const canvas = document.createElement("canvas");
            canvas.width = SIZE;
            canvas.height = SIZE;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return;
            }

            ctx.clearRect(0, 0, SIZE, SIZE);
            ctx.beginPath();
            ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            loadingRotation += Math.PI / 4;
            ctx.beginPath();
            ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 6, loadingRotation, loadingRotation + Math.PI * 1.35);
            ctx.strokeStyle = "#0969da";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.stroke();

            link.href = canvas.toDataURL("image/png");
        };

        render();
        loadingTimer = setInterval(render, 90);
        return;
    }

    if (loadingTimer !== null) {
        clearInterval(loadingTimer);
        loadingTimer = null;
    }
    if (loadingBaseHref && link.href !== loadingBaseHref) {
        link.href = loadingBaseHref;
    }
    loadingBaseHref = null;
    if (lastUnread > 0) {
        setFaviconBadge(lastUnread);
    }
}

export function setFaviconBadge(unread: number): void {
    lastUnread = unread;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
        return;
    }

    if (originalHref === null) {
        originalHref = link.href;
    }

    if (unread <= 0) {
        if (originalHref && link.href !== originalHref) {
            link.href = originalHref;
        }
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        drawBadge(ctx, unread);
        link.href = canvas.toDataURL("image/png");
    };
    img.onerror = () => {
        drawBadge(ctx, unread);
        link.href = canvas.toDataURL("image/png");
    };
    img.src = originalHref || "";
}

function drawBadge(ctx: CanvasRenderingContext2D, unread: number): void {
    const text = unread > 99 ? "99+" : String(unread);
    const fontSize = text.length > 2 ? 9 : text.length > 1 ? 10 : 12;

    ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Pill-shaped badge
    const paddingX = text.length > 2 ? 3 : text.length > 1 ? 3 : 2;
    const paddingY = 1;
    const badgeW = Math.max(textWidth + paddingX * 2, textHeight + paddingY * 2);
    const badgeH = textHeight + paddingY * 2;
    const radius = badgeH / 2;
    const badgeRight = BADGE_X;
    const badgeLeft = badgeRight - badgeW;
    const badgeTop = BADGE_Y;

    // Draw pill
    ctx.beginPath();
    ctx.moveTo(badgeLeft + radius, badgeTop);
    ctx.lineTo(badgeRight - radius, badgeTop);
    ctx.arc(badgeRight - radius, badgeTop + radius, radius, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(badgeLeft + radius, badgeTop + badgeH);
    ctx.arc(badgeLeft + radius, badgeTop + radius, radius, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();

    // Fill
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Number
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, badgeLeft + badgeW / 2, badgeTop + badgeH / 2);
}
