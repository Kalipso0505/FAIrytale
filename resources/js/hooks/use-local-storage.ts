import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for syncing state with localStorage
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    // Get initial value from localStorage or use default
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Sync to localStorage when value changes
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

/**
 * Hook for managing a Set in localStorage
 */
export function useLocalStorageSet(
    key: string
): [Set<string>, (id: string) => void, (id: string) => void, () => void] {
    const [set, setSet] = useLocalStorage<string[]>(key, []);
    
    const add = useCallback((id: string) => {
        setSet(prev => [...new Set([...prev, id])]);
    }, [setSet]);
    
    const remove = useCallback((id: string) => {
        setSet(prev => prev.filter(item => item !== id));
    }, [setSet]);
    
    const clear = useCallback(() => {
        setSet([]);
    }, [setSet]);
    
    return [new Set(set), add, remove, clear];
}
