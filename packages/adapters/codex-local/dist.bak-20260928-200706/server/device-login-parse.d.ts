export interface DeviceLoginPrompt {
    url: string;
    code: string;
}
export declare const DEVICE_LOGIN_URL = "https://auth.openai.com/codex/device";
/**
 * Parses Codex device-login output. Removes ANSI color sequences first, so
 * colored output from Codex CLI 0.128.0 and later reads the same as plain
 * output. The parser reads the URL first, then finds the "one-time code"
 * preamble after the URL, then reads the code from the dedicated code line right
 * after the preamble line. So the code binds to the prompt line that introduces
 * it, and a code-shaped token between the URL and the preamble, on the preamble
 * line, or mixed with other text on a later line, cannot form a prompt. Returns
 * the login URL and the one-time code when both are present and valid. Returns
 * null for any other input, including a non-string input, an absent prompt, a URL
 * with a query or a fragment, a wrong origin or path, and a malformed short code.
 * Never throws on input, and never puts the URL or the code into a log or an error.
 */
export declare function parseDeviceLoginPrompt(text: string): DeviceLoginPrompt | null;
//# sourceMappingURL=device-login-parse.d.ts.map