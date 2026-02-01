import '../css/app.css';
import './bootstrap';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { route as ziggyRoute } from 'ziggy-js';
import { configureEcho } from '@laravel/echo-react';

// Configure Echo for WebSocket support (optional - only if Reverb is configured)
const reverbKey = import.meta.env.VITE_REVERB_APP_KEY;
if (reverbKey) {
    try {
        configureEcho({
            broadcaster: 'reverb',
            key: reverbKey,
            wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
            wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
            wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
            forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
            enabledTransports: ['ws', 'wss'],
        });
        console.log('Echo configured for WebSocket support');
    } catch (e) {
        console.warn('Failed to configure Echo:', e);
    }
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Make Ziggy route function available globally
declare global {
    var route: typeof ziggyRoute;
}
window.route = ziggyRoute;

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

