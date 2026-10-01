export declare const CODEX_SANDBOX_AUTH_PRECEDENCE_WARNING = "snapshot login present but configured or host credentials take precedence";
export declare const CODEX_SANDBOX_AUTH_PRECEDENCE_WARNING_LOG_LINE = "[paperclip] Warning: snapshot login present but configured or host credentials take precedence.\n";
export declare const CODEX_SANDBOX_AUTH_EXISTS_COMMAND = "test -f \"$HOME/.codex/auth.json\"";
export type CodexAuthPrecedenceWinner = "configured_api_key" | "host_auth_json" | "sandbox_auth_json" | "none";
export interface CodexAuthPrecedenceInput {
    configuredApiKey: boolean;
    hostAuthJson: boolean;
    sandboxAuthJson: boolean;
}
export interface CodexAuthPrecedenceResolution {
    winner: CodexAuthPrecedenceWinner;
    sandboxLoginShadowed: boolean;
    shouldWarn: boolean;
}
export declare function resolveCodexAuthPrecedence(input: CodexAuthPrecedenceInput): CodexAuthPrecedenceResolution;
//# sourceMappingURL=auth-precedence.d.ts.map