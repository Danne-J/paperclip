export const CODEX_SANDBOX_AUTH_PRECEDENCE_WARNING = "snapshot login present but configured or host credentials take precedence";
export const CODEX_SANDBOX_AUTH_PRECEDENCE_WARNING_LOG_LINE = `[paperclip] Warning: ${CODEX_SANDBOX_AUTH_PRECEDENCE_WARNING}.\n`;
export const CODEX_SANDBOX_AUTH_EXISTS_COMMAND = 'test -f "$HOME/.codex/auth.json"';
export function resolveCodexAuthPrecedence(input) {
    const winner = input.configuredApiKey
        ? "configured_api_key"
        : input.hostAuthJson
            ? "host_auth_json"
            : input.sandboxAuthJson
                ? "sandbox_auth_json"
                : "none";
    const sandboxLoginShadowed = input.sandboxAuthJson &&
        (winner === "configured_api_key" || winner === "host_auth_json");
    return {
        winner,
        sandboxLoginShadowed,
        shouldWarn: sandboxLoginShadowed,
    };
}
//# sourceMappingURL=auth-precedence.js.map