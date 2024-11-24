import { exec } from "astal";
import { GObject, register, property, GLib, signal } from "astal/gobject";
import { Gtk } from "astal/gtk3";
function formatBytes(bytes: number): string {
    function formatValue(value: number): string {
        // 判断是否需要保留小数位
        return value % 1 === 0 ? `${value}` : `${value.toFixed(2)}`;
    }

    if (bytes >= 800 * 1024 * 1024) {
        // 超过 800 MB，显示为 GB
        return `${formatValue(bytes / 1e9)} GB`;
    } else if (bytes >= 800 * 1024) {
        // 超过 800 KB，但未达到 800 MB，显示为 MB
        return `${formatValue(bytes / 1e6)} MB`;
    } else {
        // 小于 800 KB，显示为 KB
        return `${formatValue(bytes / 1024)} KB`;
    }
}
@register()
class NetworkSpeed extends GObject.Object {
    @property(Object) declare speed: {
        download: string;
        upload: string;
    };
    @property(Object) declare iface: string[];
    @signal(Object) declare ifaceUpdate: (iface: string[]) => void;
    @property(String) declare currentIFace: string;

    private intervalId: GLib.Source;
    bytes: Map<
        string,
        {
            download: number;
            upload: number;
        }
    > = new Map();
    getBytes(iface: string): {
        download: string;
        upload: string;
    } {
        if (this.bytes.has(iface)) {
            const bytes = this.bytes.get(iface)!;
            return {
                download: formatBytes(bytes.download),
                upload: formatBytes(bytes.upload),
            };
        }
        return {
            download: "0 KB",
            upload: "0 KB",
        };
    }
    prev_data: { kernel: any } | null = null;
    constructor() {
        super();
        this.speed = {
            download: "0 KB/s",
            upload: "0 KB/s",
        };
        this.iface = [];
        this.currentIFace = "All";
        this.intervalId = setInterval(() => this.interval(), 1000);
    }
    destroy(): void {
        clearInterval(this.intervalId);
    }
    createMenu() {
        const menu = new Gtk.Menu();
        const all = new Gtk.MenuItem({ label: "All Interfaces" });
        all.connect("activate", () => {
            this.currentIFace = "All";
        });
        menu.add(all);
        for (const iface of this.iface) {
            const bs = this.getBytes(iface);
            const item = new Gtk.MenuItem({
                label: iface + " " + bs.download + " / " + bs.upload,
            });
            item.connect("activate", () => {
                this.currentIFace = iface;
            });
            menu.add(item);
        }
        menu.show_all();
        return menu;
    }
    interval() {
        const current_data = JSON.parse(exec(`ifstat -j`));
        if (this.prev_data === null) {
            this.prev_data = current_data;
            return;
        }
        let totalRxBytes = 0;
        let totalTxBytes = 0;
        const ifaceList = [];
        for (const iface of Object.keys(current_data.kernel)) {
            if (iface === "lo") continue; // 忽略 lo 接口
            if (!this.bytes.has(iface)) this.bytes.set(iface, { download: 0, upload: 0 });
            this.bytes.get(iface)!.download = current_data.kernel[iface].rx_bytes;
            this.bytes.get(iface)!.upload = current_data.kernel[iface].tx_bytes;
            ifaceList.push(iface);
            if (this.currentIFace === "All" || this.currentIFace === iface) {
                const prev = this.prev_data.kernel[iface];
                const current = current_data.kernel[iface];
                if (!prev || !current) continue;
                totalRxBytes += current.rx_bytes - prev.rx_bytes;
                totalTxBytes += current.tx_bytes - prev.tx_bytes;
            }
        }
        this.speed = {
            download: formatBytes(totalRxBytes) + "/s",
            upload: formatBytes(totalTxBytes) + "/s",
        };
        if (this.iface.length !== ifaceList.length) {
            this.iface = ifaceList;
            this.ifaceUpdate(ifaceList);
        } else {
            for (let i = 0; i < ifaceList.length; i++) {
                if (this.iface[i] !== ifaceList[i]) {
                    this.iface = ifaceList;
                    this.ifaceUpdate(ifaceList);
                    break;
                }
            }
        }

        this.prev_data = current_data;
    }
}

export default NetworkSpeed;