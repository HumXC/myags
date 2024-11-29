import { App, Astal, Gtk, Gdk } from "astal/gtk3";
import Tray from "./tray";
import Clock from "./clock";
import NetSpeed from "./net-speed";
import { EventIcon, Space } from "../base";
import StatusIndicators from "./status-indicators";
import Workspace from "./workspace";
import NotificationsIcon from "../notifications-icon";
import { RecorderIcon } from "../recorder-icon";
import { exec } from "astal";
export default function Bar(gdkmonitor: Gdk.Monitor) {
    const gapsOption: {
        option: string;
        custom: string;
        set: boolean;
    } = JSON.parse(exec(["hyprctl", "-j", "getoption", "general:gaps_out"]));
    let gapTop = 0;
    let gapRight = 0;
    let gapLeft = 0;

    if (gapsOption.set) {
        const gaps = gapsOption.custom.split(" ").map(Number);
        gapTop = gaps[0];
        gapRight = gaps[1];
        gapLeft = gaps[3];
    }
    return (
        <window
            className="Bar"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
            application={App}
            namespace={"top-bar"}
        >
            <centerbox
                css={`
                    margin: ${gapTop}px ${gapRight}px 0 ${gapLeft}px;
                `}
            >
                <overlay
                    overlay={<box halign={Gtk.Align.END}>{/* 时钟左侧区域 */}</box>}
                    hexpand={true}
                >
                    <box halign={Gtk.Align.START}>
                        <EventIcon iconName="nix-snowflake-colours" size={24} />
                        <Space space={8} />
                        <Tray height={24} />
                        <Space space={10} />
                        <Workspace height={24} />
                        <Space space={10} />
                        <NetSpeed height={24} />
                    </box>
                </overlay>

                <box halign={Gtk.Align.CENTER}>
                    <Space space={8} />
                    <Clock fontSize={16} useTooltip={true} />
                    <Space space={8} />
                </box>
                <overlay
                    overlay={
                        <box halign={Gtk.Align.START} hexpand={true}>
                            {/* 时钟右侧区域 */}
                            <RecorderIcon height={24} />
                        </box>
                    }
                >
                    <box halign={Gtk.Align.END}>
                        <StatusIndicators size={24} />
                        <Space space={8} />
                        <NotificationsIcon size={24} />
                        <Space space={2} />
                    </box>
                </overlay>
            </centerbox>
        </window>
    );
}
