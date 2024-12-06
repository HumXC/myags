import { exec, execAsync, Gio, GLib } from "astal";
import { EventBox } from "astal/gtk3/widget";
import { Slurp as slurpConfig } from "./configs";
import { Gdk, Gtk } from "astal/gtk3";
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function setHoverClassName(widget: EventBox, className: string = "") {
    if (className === "") className = widget.className;
    widget.className = className;
    widget.connect("hover", () => (widget.className = className + "-hover"));
    widget.connect("hover-lost", () => (widget.className = className));
}

export function formatBytes(bytes: number, fixed: number = 2): [number, string] {
    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;
    let value: number;
    let unit: string;
    if (bytes >= GB * 0.8) {
        value = bytes / GB;
        unit = "G";
    } else if (bytes >= MB * 0.8) {
        value = bytes / MB;
        unit = "M";
    } else {
        value = bytes / KB;
        unit = "K";
    }
    value = parseFloat(value.toFixed(fixed));
    return [value, unit];
}
export function formatDuration(seconds: number) {
    if (typeof seconds !== "number" || seconds < 0) {
        throw new Error("Input must be a non-negative number.");
    }

    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds.toFixed(0)}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds.toFixed(0)}s`;
    } else {
        return `${seconds.toFixed(0)}s`;
    }
}
export function notifySend(
    summary: string,
    body: string,
    options?: Partial<{
        urgency: "low" | "normal" | "critical";
        expireTime: number;
        appName: string;
        category: string;
        transient: boolean;
        hint: string;
        replaceId: string;
        wait: boolean;
        action: string;
        icon: string;
    }>
) {
    const cmd = ["notify-send"];
    const addCmd = (option: string, arg: string | undefined, cfg: string) => {
        if (arg) cmd.push(`-${option}`, `${arg}`);
        else if (cfg !== "") cmd.push(`-${option}`, `${cfg}`);
    };
    addCmd("u", options?.urgency, "normal");
    addCmd("t", options?.expireTime?.toString(), "");
    addCmd("a", options?.appName, "");
    addCmd("c", options?.category, "");
    if (options?.transient === true) cmd.push("-e");
    addCmd("h", options?.hint, "");
    addCmd("r", options?.replaceId, "");
    if (options?.wait === true) cmd.push("-w");
    addCmd("A", options?.action, "");
    if (options?.icon) cmd.push("-i", options.icon);
    cmd.push('"' + summary + '"', '"' + body + '"');
    execAsync(cmd).catch((e) => print("通知发送失败", e));
}
export function slurp(
    args?: Partial<{
        dimensions: boolean;
        backgroundColor: string;
        borderColor: string;
        selectionColor: string;
        optionBoxColor: string;
        fontFamily: string;
        borderWeight: number;
        outputFormat: string;
        output: boolean;
        point: boolean;
        restrict: boolean;
        aspectRatio: string;
    }>
): [string, Error | null] {
    const cmd = ["slurp"];
    const addCmd = (option: string, arg: string | undefined, cfg: string) => {
        if (arg) cmd.push(`-${option}`, `${arg}`);
        else if (cfg !== "") cmd.push(`-${option}`, `${cfg}`);
    };
    if (args?.dimensions === true || (!args?.dimensions && slurpConfig.dimensions)) cmd.push("-d");
    addCmd("b", args?.backgroundColor, slurpConfig.backgroundColor);
    addCmd("c", args?.borderColor, slurpConfig.borderColor);
    addCmd("s", args?.selectionColor, slurpConfig.selectionColor);
    addCmd("B", args?.optionBoxColor, slurpConfig.optionBoxColor);
    addCmd("F", args?.fontFamily, slurpConfig.fontFamily);
    addCmd("w", args?.borderWeight?.toString(), slurpConfig.borderWeight.toString());
    if (args?.outputFormat) cmd.push("-f", `${args.outputFormat}`);
    if (args?.output === true) cmd.push("-o");
    if (args?.point === true) cmd.push("-p");
    if (args?.restrict === true) cmd.push("-r");
    if (args?.aspectRatio) cmd.push("-a", `${args.aspectRatio}`);
    try {
        return [exec(cmd), null];
    } catch (e) {
        return ["", e as Error];
    }
}
export function slurpRect(
    args?: Partial<{
        dimensions: boolean;
        backgroundColor: string;
        borderColor: string;
        selectionColor: string;
        optionBoxColor: string;
        fontFamily: string;
        borderWeight: number;
        output: boolean;
        restrict: boolean;
        aspectRatio: string;
    }>
): [Gdk.Rectangle, Error | null] {
    const [output, error] = slurp(args);
    if (error) return [new Gdk.Rectangle(), error];
    const region = output.split(" ");
    const [x, y] = region[0].split(",").map(Number);
    const [width, height] = region[1].split("x").map(Number);
    return [new Gdk.Rectangle({ x, y, width, height }), null];
}
export function rectToString(rect: Gdk.Rectangle): string {
    return `${rect.x},${rect.y} ${rect.width}x${rect.height}`;
}

// TODO: 测试 Gio.InputStream | GLib.Bytes
export function wlCopy(body: string | Gio.InputStream | GLib.Bytes, mime: string | null = null) {
    const cmd = ["wl-copy"];
    if (mime) cmd.push("-t", mime);
    if (typeof body === "string") cmd.push(body);

    const proc = Gio.Subprocess.new(cmd, Gio.SubprocessFlags.STDOUT_PIPE);

    if (typeof body === "string") proc.communicate(null, null);
    else if (body instanceof GLib.Bytes) proc.communicate(body, null);
    else {
        const stdin = proc.get_stdin_pipe()!;
        let length = 0.1; // 用于进入循环
        while (length > 0) {
            const [l, b] = body.read(null);
            length = l;
            if (l > 0) stdin.write(b, null);
        }
        stdin.close();
    }
}

export function grim<T extends string | Gio.OutputStream>(
    output: T,
    args?: Partial<{
        factor: number;
        geometry: string | Gdk.Rectangle;
        filetype: "png" | "ppm" | "jpeg";
        quality: number;
        compression: number;
        monitor: string;
        includeCursor: boolean;
    }>
) {
    const cmd = ["grim"];
    if (args?.factor) cmd.push("-s", args.factor.toString());
    if (args?.geometry) {
        if (typeof args.geometry === "string") cmd.push("-g", args.geometry);
        else cmd.push("-g", rectToString(args.geometry));
    }
    if (args?.filetype) cmd.push("-t", args.filetype);
    if (args?.quality) cmd.push("-q", args.quality.toString());
    if (args?.compression) cmd.push("-l", args.compression.toString());
    if (args?.monitor) cmd.push("-m", args.monitor);
    if (args?.includeCursor) cmd.push("-c");
    if (typeof output === "string") cmd.push(output);

    const proc = Gio.Subprocess.new(cmd, Gio.SubprocessFlags.STDOUT_PIPE);

    if (typeof output === "string") {
        const [_, __, error] = proc.communicate(null, null);
        if (error) throw Error(new TextDecoder("utf-8").decode(error.toArray()));
    } else {
        const stdout = proc.get_stdout_pipe()!;
        let length = 0.1; // 用于进入循环
        while (length > 0) {
            const [l, b] = stdout.read(null);
            length = l;
            if (l > 0) output.write(b, null);
        }
        output.close();
    }
}

export function getHyprloandOption(option: string, type: "custom" | "int"): string | null {
    const opt: {
        option: string;
        set: boolean;
    } = JSON.parse(exec(["hyprctl", "-j", "getoption", option]));
    if (!opt.set) return null;
    return (opt as any)[type];
}
export function lookUpIcon(
    name: string,
    size: 16 | 22 | 24 | 32 | 64 | 256,
    flags: Gtk.IconLookupFlags = 0
) {
    const icon = Gtk.IconTheme.get_default().lookup_icon(name, size, flags);
    if (icon) return icon.load_icon();
    return null;
}
