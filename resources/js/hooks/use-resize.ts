import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './use-local-storage';

interface ResizeState {
    leftWidth: number;
    rightWidth: number;
    isResizingLeft: boolean;
    isResizingRight: boolean;
}

interface ResizeActions {
    startResizeLeft: () => void;
    startResizeRight: () => void;
    stopResize: () => void;
}

interface ResizeOptions {
    minWidth?: number;
    maxWidth?: number;
    defaultLeftWidth?: number;
    defaultRightWidth?: number;
}

/**
 * Hook for managing resizable panel widths
 */
export function useResize(options: ResizeOptions = {}): [ResizeState, ResizeActions] {
    const {
        minWidth = 200,
        maxWidth = 600,
        defaultLeftWidth = 320,
        defaultRightWidth = 384,
    } = options;

    const [leftWidth, setLeftWidth] = useLocalStorage('column-width-left', defaultLeftWidth);
    const [rightWidth, setRightWidth] = useLocalStorage('column-width-right', defaultRightWidth);
    const [isResizingLeft, setIsResizingLeft] = useState(false);
    const [isResizingRight, setIsResizingRight] = useState(false);

    const startResizeLeft = useCallback(() => {
        setIsResizingLeft(true);
    }, []);

    const startResizeRight = useCallback(() => {
        setIsResizingRight(true);
    }, []);

    const stopResize = useCallback(() => {
        setIsResizingLeft(false);
        setIsResizingRight(false);
    }, []);

    useEffect(() => {
        if (!isResizingLeft && !isResizingRight) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = document.querySelector('[data-resize-container]');
            if (!container) return;

            const rect = container.getBoundingClientRect();

            if (isResizingLeft) {
                const newWidth = e.clientX - rect.left - 8;
                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    setLeftWidth(newWidth);
                }
            }

            if (isResizingRight) {
                const newWidth = rect.right - e.clientX - 8;
                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    setRightWidth(newWidth);
                }
            }
        };

        const handleMouseUp = () => {
            stopResize();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizingLeft, isResizingRight, minWidth, maxWidth, setLeftWidth, setRightWidth, stopResize]);

    return [
        { leftWidth, rightWidth, isResizingLeft, isResizingRight },
        { startResizeLeft, startResizeRight, stopResize }
    ];
}
