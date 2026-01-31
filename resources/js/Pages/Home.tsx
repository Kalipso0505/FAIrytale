import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { ExternalLink } from 'lucide-react';

export default function Home() {
    return (
        <>
            <Head title="Home" />
            
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
                {/* Header Navigation */}
                <header className="fixed top-0 left-0 right-0 p-6 z-50">
                    <nav className="max-w-7xl mx-auto flex items-center justify-end gap-4">
                        {/* Beispiel: Sobald Login/Register Routen existieren, kannst du route() verwenden:
                            <Link href={route('login')}>
                        */}
                        <a href="/login">
                            <Button variant="ghost" size="sm">
                                Log in
                            </Button>
                        </a>
                        <a href="/register">
                            <Button variant="outline" size="sm">
                                Register
                            </Button>
                        </a>
                    </nav>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl w-full mx-auto flex flex-col lg:flex-row items-center gap-12 mt-20">
                    {/* Left Side - Content */}
                    <div className="flex-1 space-y-8">
                        <div className="space-y-4">
                            <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                Laravel 12 × React × Inertia
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
                                Willkommen bei
                                <span className="block text-primary mt-2">Laravel</span>
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-2xl">
                                Eine moderne Full-Stack Anwendung mit React, Inertia.js und shadcn/ui
                            </p>
                        </div>

                        {/* Quick Start Cards */}
                        <div className="grid md:grid-cols-2 gap-6 pt-8">
                            <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        Dokumentation
                                        <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </CardTitle>
                                    <CardDescription>
                                        Erfahre mehr über Laravel
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Laravel hat ein unglaublich reiches Ökosystem mit hervorragender Dokumentation.
                                    </p>
                                    <a 
                                        href="https://laravel.com/docs" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                                    >
                                        Zur Dokumentation
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </CardContent>
                            </Card>

                            <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        Video Tutorials
                                        <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </CardTitle>
                                    <CardDescription>
                                        Lerne mit Laracasts
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Tausende von Video-Tutorials für alle Erfahrungsstufen auf Laracasts.
                                    </p>
                                    <a 
                                        href="https://laracasts.com" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                                    >
                                        Zu Laracasts
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </CardContent>
                            </Card>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4 pt-4">
                            <a 
                                href="https://cloud.laravel.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                <Button size="lg" className="gap-2">
                                    Jetzt deployen
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </a>
                            <a 
                                href="https://github.com/laravel/laravel" 
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                <Button size="lg" variant="outline" className="gap-2">
                                    GitHub ansehen
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* Right Side - Visual */}
                    <div className="flex-1 flex items-center justify-center">
                        <div className="relative">
                            {/* Decorative background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-3xl rounded-full transform -rotate-6"></div>
                            
                            {/* Laravel Logo SVG */}
                            <svg 
                                className="relative w-full max-w-md h-auto text-primary drop-shadow-2xl" 
                                viewBox="0 0 50 52" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path 
                                    d="M49.626 11.564a.809.809 0 0 1 .028.209v10.972a.8.8 0 0 1-.402.694l-9.209 5.302V39.25c0 .286-.152.55-.4.694L20.42 51.01c-.044.025-.092.041-.14.058-.018.006-.035.017-.054.022a.805.805 0 0 1-.41 0c-.022-.006-.042-.018-.063-.026-.044-.016-.09-.03-.132-.054L.402 39.944A.801.801 0 0 1 0 39.25V6.334c0-.072.01-.142.028-.21.006-.023.02-.044.028-.067.015-.042.029-.085.051-.124.015-.026.037-.047.055-.071.023-.032.044-.065.071-.093.023-.023.053-.04.079-.06.029-.024.055-.05.088-.069h.001l9.61-5.533a.802.802 0 0 1 .8 0l9.61 5.533h.002c.032.02.059.045.088.068.026.02.055.038.078.06.028.029.048.062.072.094.017.024.04.045.054.071.023.04.036.082.052.124.008.023.022.044.028.068a.809.809 0 0 1 .028.209v20.559l8.008-4.611v-10.51c0-.07.01-.141.028-.208.007-.024.02-.045.028-.068.016-.042.03-.085.052-.124.015-.026.037-.047.054-.071.024-.032.044-.065.072-.093.023-.023.052-.04.078-.06.03-.024.056-.05.088-.069h.001l9.611-5.533a.801.801 0 0 1 .8 0l9.61 5.533c.034.02.06.045.09.068.025.02.054.038.077.06.028.029.048.062.072.094.018.024.04.045.054.071.023.039.036.082.052.124.009.023.022.044.028.068zm-1.574 10.718v-9.124l-3.363 1.936-4.646 2.675v9.124l8.01-4.611zm-9.61 16.505v-9.13l-4.57 2.61-13.05 7.448v9.216l17.62-10.144zM1.602 7.719v31.068L19.22 48.93v-9.214l-9.204-5.209-.003-.002-.004-.002c-.031-.018-.057-.044-.086-.066-.025-.02-.054-.036-.076-.058l-.002-.003c-.026-.025-.044-.056-.066-.084-.02-.027-.044-.05-.06-.078l-.001-.003c-.018-.03-.029-.066-.042-.1-.013-.03-.03-.058-.038-.09v-.001c-.01-.038-.012-.078-.016-.117-.004-.03-.012-.06-.012-.09v-.002-21.481L4.965 9.654 1.602 7.72zm8.81-5.994L2.405 6.334l8.005 4.609 8.006-4.61-8.006-4.608zm4.164 28.764l4.645-2.674V7.719l-3.363 1.936-4.646 2.675v20.096l3.364-1.937zM39.243 7.164l-8.006 4.609 8.006 4.609 8.005-4.61-8.005-4.608zm-.801 10.605l-4.646-2.675-3.363-1.936v9.124l4.645 2.674 3.364 1.937v-9.124zM20.02 38.33l11.743-6.704 5.87-3.35-8-4.606-9.211 5.303-8.395 4.833 7.993 4.524z" 
                                    fill="currentColor"
                                />
                            </svg>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-auto pt-12 pb-6 text-center text-sm text-muted-foreground">
                    <p>Laravel v12 - Das PHP Framework für Web-Künstler</p>
                </footer>
            </div>
        </>
    );
}

