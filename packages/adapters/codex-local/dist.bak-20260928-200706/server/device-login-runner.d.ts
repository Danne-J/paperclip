import { type LoginRunnerDisposable, type LoginRunnerLifecycleOptions, type LoginRunnerOutcome, type LoginRunnerResult } from "@paperclipai/adapter-utils";
import { type DeviceLoginPrompt } from "./device-login-parse.js";
/** The default Codex device-login command. */
export declare const CODEX_DEVICE_LOGIN_COMMAND = "codex login --device-auth";
/**
 * The sandbox side of the device-login run. The runner never calls Daytona
 * directly; a caller injects a concrete driver. A production driver binds `start`
 * to the shared login pseudo-terminal (PTY) transport, binds `readFile` to a
 * descriptor-bound credential read, and binds `dispose` to the transport dispose.
 *
 * The `start` shape matches the shared login pseudo-terminal transport start
 * method, so the driver runs the login command on a real pseudo-terminal. The
 * login command
 * needs a pseudo-terminal: pipe stdio emits no login prompt. The runner never
 * calls `stop` or `write` on the driver; the device-login flow needs no delayed
 * input, and the service owns the sandbox delete. The runner disposes the driver
 * one time on every terminal state.
 */
export interface SandboxLoginDriver extends LoginRunnerDisposable {
    /**
     * Starts `command` on a pseudo-terminal and streams the terminal output to
     * `onData` in memory, in order, as the pseudo-terminal emits it. Resolves with
     * the command exit code when the command ends. A driver must not persist the raw
     * output to any durable log.
     */
    start(command: string, onData: (chunk: string) => void): Promise<{
        exitCode: number | null;
    }>;
    /**
     * Reads the credential bytes with one descriptor-bound read. The read is
     * separate from the pseudo-terminal session; the session has no file-read
     * method. A driver runs one fixed, server-controlled operation that opens the
     * verified session home and the credential file with no symlink follow, checks
     * the opened descriptor, and reads only from that same descriptor.
     */
    readFile(path: string): Promise<Buffer>;
}
/** Receives the parsed prompt one time in memory. The caller displays it. */
export type DeviceLoginPromptSink = (prompt: DeviceLoginPrompt) => void;
/** The device-login runner outcome. It is a fixed, non-secret status. */
export type DeviceLoginOutcome = LoginRunnerOutcome;
/** The runner result. It never carries a URL, a code, or a token byte. */
export type DeviceLoginResult = LoginRunnerResult;
export interface RunDeviceLoginOptions extends LoginRunnerLifecycleOptions {
    /** The login command. Defaults to {@link CODEX_DEVICE_LOGIN_COMMAND}. */
    command?: string;
    /** Parses the prompt from the login output. Defaults to
     *  {@link parseDeviceLoginPrompt}. */
    parsePrompt?: (output: string) => DeviceLoginPrompt | null;
    /** Receives the parsed prompt one time in memory. The caller displays it. */
    onPrompt: DeviceLoginPromptSink;
    /**
     * Receives the sandbox `auth.json` bytes one time in memory on success. The
     * runner reads the bytes with {@link SandboxLoginDriver.readFile} before it
     * disposes the driver. Set together with {@link authPath}.
     */
    onCredential?: (authBytes: Buffer) => void | Promise<void>;
    /** The sandbox path of the credential file to read on success. */
    authPath?: string;
}
/**
 * Runs the device-login command through `driver`. Surfaces the prompt one time
 * through `onPrompt`. On success it reads the credential and surfaces the bytes
 * one time through `onCredential`. Returns a fixed status. Always disposes the
 * driver. Never logs the raw stream, and never puts a URL, a code, or a token
 * into a log line, the result, or a thrown error.
 */
export declare function runDeviceLogin(driver: SandboxLoginDriver, options: RunDeviceLoginOptions): Promise<DeviceLoginResult>;
//# sourceMappingURL=device-login-runner.d.ts.map