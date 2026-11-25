import { useEffect, useState } from "react";

/**
 * 延迟返回最新值，常用于搜索输入，避免每次键入都触发请求。
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebounced(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debounced;
}

export default useDebouncedValue;
