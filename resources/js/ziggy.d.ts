import { Config as ZiggyConfig } from 'ziggy-js';

declare global {
    interface Window {
        Ziggy: ZiggyConfig;
    }
    
    var route: typeof import('ziggy-js').default;
}

export {};

