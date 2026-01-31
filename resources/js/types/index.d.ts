export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export interface AutoNote {
    text: string;
    category: 'alibi' | 'motive' | 'relationship' | 'observation' | 'contradiction';
    timestamp: string;
    source_message: string;
}

export type AutoNotesMap = Record<string, AutoNote[]>;

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };
};

