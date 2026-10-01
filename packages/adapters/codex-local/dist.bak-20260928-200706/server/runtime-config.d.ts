type PreparedCodexRuntimeConfig = {
    notes: string[];
    cleanup: () => Promise<void>;
};
export declare function stripManagedCodexProviderBlocks(content: string): string;
export declare function prepareCodexRuntimeConfig(input: {
    env: Record<string, string>;
    codexHome: string | null;
}): Promise<PreparedCodexRuntimeConfig>;
export {};
//# sourceMappingURL=runtime-config.d.ts.map