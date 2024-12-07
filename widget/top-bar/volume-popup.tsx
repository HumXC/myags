import { Astal, Gdk, Gtk } from "astal/gtk3";
import PopupWindow from "../base/popup-window";
import WirePlumber from "gi://AstalWp";
import { bind, Variable } from "astal";
import { EventIcon, Space } from "../base";
import Pango from "gi://Pango?version=1.0";
const setVolume = (device: WirePlumber.Endpoint, v: number) => {
    device.volume = v;
    if (v == 0) device.set_mute(true);
    else device.set_mute(false);
};
const onScroll = (device: WirePlumber.Endpoint, delta_y: number) => {
    let v = device.volume + 0.01 * (delta_y < 0 ? 1.0 : -1.0);
    setVolume(device, Math.min(Math.max(v, 0), 1));
};
function Slider({ endpoint: p }: { endpoint: WirePlumber.Endpoint }) {
    const bgColor = Variable("rgba(255, 255, 255, 0.1)");
    const m = WirePlumber.MediaClass;
    const getIcon = () => {
        switch (p.mediaClass) {
            case m.AUDIO_STREAM:
            case m.AUDIO_SPEAKER:
            case m.AUDIO_RECORDER:
                if (p.mute) return "audio-volume-muted-symbolic";
                else return "audio-volume-high-symbolic";
            case m.AUDIO_MICROPHONE:
                if (p.mute) return "audio-input-microphone-muted-symbolic";
                else return "audio-input-microphone-high-symbolic";
            default:
                return "audio-volume-high-symbolic";
        }
    };
    return (
        <eventbox onScroll={(_, e) => onScroll(p, e.delta_y)}>
            <box
                setup={(self) => {
                    self.hook(bind(p, "isDefault"), () => {
                        if (p.isDefault && p.mediaClass === m.AUDIO_SPEAKER)
                            bgColor.set("rgba(31, 136, 255, 0.149)");
                        else bgColor.set("rgba(255, 255, 255, 0.1)");
                    });
                    if (p.isDefault && p.mediaClass === m.AUDIO_SPEAKER)
                        bgColor.set("rgba(31, 136, 255, 0.149)");
                    else bgColor.set("rgba(255, 255, 255, 0.1)");
                }}
                css={bgColor(
                    (c) => `
                background: ${c};
                padding: 6px 12px 6px 12px;
                border-radius: 8px;
            `
                )}
            >
                <EventIcon
                    iconName={bind(p, "mute").as((m) => {
                        return getIcon();
                    })}
                    size={38}
                    iconSize={64}
                    useCssColor={false}
                    onClick={() => {
                        p.set_mute(!p.mute);
                    }}
                    tooltipText={p.description}
                />
                <eventbox onClick={() => p.set_is_default(true)}>
                    <box vertical={true} hexpand={true}>
                        <label
                            label={p.description}
                            halign={Gtk.Align.START}
                            marginStart={10}
                            ellipsize={Pango.EllipsizeMode.END}
                            marginEnd={10}
                            wrap={true}
                            wrapMode={Pango.WrapMode.CHAR}
                        />
                        <slider
                            setup={(self) => {
                                self.value = p.volume * 100;
                                self.connect("scroll-event", (_, e: Gdk.Event) =>
                                    onScroll(p, e.get_scroll_deltas()[2])
                                );
                            }}
                            halign={Gtk.Align.FILL}
                            hexpand={true}
                            orientation={Gtk.Orientation.HORIZONTAL}
                            widthRequest={220}
                            max={100}
                            onDragged={(self) => setVolume(p, self.value / 100)}
                            value={bind(p, "volume").as((n) => n * 100)}
                        />
                    </box>
                </eventbox>
                <label
                    css={"font-size: 16px;"}
                    halign={Gtk.Align.CENTER}
                    widthRequest={32}
                    label={bind(p, "volume").as((n) => (n * 100).toFixed(0))}
                />
            </box>
        </eventbox>
    );
}
export default function VolumePopup({
    forward,
    trigger,
    onHover = () => {},
    onHoverLost = () => {},
}: {
    forward: "bottom" | "top" | "left" | "right";
    trigger: Gtk.Widget;
    onHover?: (self: Astal.Window, event: Astal.HoverEvent) => void;
    onHoverLost?: (self: Astal.Window, event: Astal.HoverEvent) => void;
}) {
    const wp = WirePlumber.get_default() as WirePlumber.Wp;

    return (
        <PopupWindow forward={forward} trigger={trigger}>
            <eventbox
                onHover={(self, e) => onHover(self.parent as Astal.Window, e)}
                onHoverLost={(self, e) => onHoverLost(self.parent as Astal.Window, e)}
            >
                <box
                    className={"VolumePopup"}
                    vertical={true}
                    spacing={8}
                    css={`
                        padding: 16px;
                    `}
                >
                    <label
                        label={"声音"}
                        halign={Gtk.Align.START}
                        marginStart={8}
                        css={`
                            font-size: 20px;
                        `}
                    />
                    {(() => {
                        const list = wp
                            .get_endpoints()
                            ?.filter(
                                (p) =>
                                    p.mediaClass === WirePlumber.MediaClass.AUDIO_STREAM ||
                                    p.mediaClass === WirePlumber.MediaClass.VIDEO_STREAM
                            )
                            .map((endpoint) => Slider({ endpoint: endpoint }));
                        if (list?.length && list.length > 0)
                            list.push(<Space space={8} useVertical={true} />);
                        return list;
                    })()}
                    {(() => {
                        return wp
                            .get_endpoints()
                            ?.filter(
                                (p) =>
                                    p.mediaClass === WirePlumber.MediaClass.AUDIO_SPEAKER ||
                                    p.mediaClass === WirePlumber.MediaClass.VIDEO_SINK
                            )
                            .map((endpoint) => Slider({ endpoint: endpoint }));
                    })()}
                    {(() => {
                        return wp
                            .get_endpoints()
                            ?.filter(
                                (p) =>
                                    ![
                                        WirePlumber.MediaClass.AUDIO_STREAM,
                                        WirePlumber.MediaClass.VIDEO_STREAM,
                                        WirePlumber.MediaClass.AUDIO_SPEAKER,
                                        WirePlumber.MediaClass.VIDEO_SINK,
                                    ].includes(p.mediaClass)
                            )
                            .map((endpoint) => Slider({ endpoint: endpoint }));
                    })()}
                </box>
            </eventbox>
        </PopupWindow>
    ) as Astal.Window;
}