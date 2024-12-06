import { AstalIO, bind, Binding, exec, execAsync, GLib, idle, timeout, Variable } from "astal";
import { Gdk, Gtk } from "astal/gtk3";
import Auth from "gi://AstalAuth";
import { Clock } from "./top-bar";
import { GetConfig } from "../configs";
import { BindableChild } from "astal/gtk3/astalify";

function auth(password: string): Promise<void> {
    return new Promise((resolve, reject) => {
        Auth.Pam.authenticate(password, (_, task) => {
            try {
                Auth.Pam.authenticate_finish(task);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}
class LockScreenConfig {
    wallpaper: string = "";
}

export default function LockScreen() {
    let wallpaper = GetConfig(LockScreenConfig, "lockscreen").wallpaper;
    if (wallpaper !== "") {
        const allowImages = ["jpg", "jpeg", "png"];
        const ext = wallpaper.split(".").pop()?.toLowerCase();
        if (ext !== undefined && !allowImages.includes(ext)) {
            try {
                const images = exec(["ls", "-1", wallpaper])
                    .split("\n")
                    .filter((file) => {
                        const ext = file.split(".").pop()?.toLowerCase();
                        return ext !== undefined && allowImages.includes(ext);
                    });
                wallpaper += "/" + images[Math.floor(Math.random() * images.length)];
            } catch (error) {}
        }
    }
    let blurWallpaper = "";
    execAsync([
        "magick",
        wallpaper,
        "-resize",
        "30%",
        "-gaussian-blur",
        "18x6",
        "/tmp/lockscreen-blur.jpg",
    ])
        .then(() => (blurWallpaper = "/tmp/lockscreen-blur.jpg"))
        .catch((e) => {
            console.error(e);
        });
    const err = new Variable("");
    const inputState = new Variable(false);
    const animateDuration = 500;
    const background = (
        <box
            onDestroy={() => {
                if (blurWallpaper !== "") {
                    execAsync(["rm", "-f", blurWallpaper]);
                }
            }}
            css={bind(inputState).as((s) => {
                if (s && blurWallpaper !== "")
                    return `
                background-image: url("${blurWallpaper}");
                background-size: cover;
                background-repeat: no-repeat;
                background-position: center;
            `;
                return `
                background-image: url("${wallpaper}");
                background-size: cover;
                background-repeat: no-repeat;
                background-position: center;
            `;
            })}
        >
            <centerbox hexpand={true}>
                <box />
                <revealer
                    css={`
                        padding-bottom: 600px;
                        text-shadow: 0 0 5px #000;
                    `}
                    transitionType={Gtk.RevealerTransitionType.CROSSFADE}
                    setup={(self) => {
                        self.hook(bind(inputState), (_, t) => {
                            if (!t) self.transitionDuration = animateDuration / 2;
                            else self.transitionDuration = animateDuration * 1.5;
                        });
                    }}
                    revealChild={inputState().as((t) => {
                        return !t;
                    })}
                >
                    <Clock fontSize={128} fontWeight="normal" />
                </revealer>

                <box />
            </centerbox>
        </box>
    );
    const entry = (
        <entry
            visibility={false}
            css={`
                border-radius: 20px;
                margin: 64px 10px 12px 10px;
                background-color: rgba(0, 0, 0, 0.5);
                border: 1px solid #fff;
                box-shadow: 0 0 2px #000;
            `}
        />
    ) as Gtk.Entry;
    const inputPage = (
        <box
            className={"LockScreen"}
            css={`
                background-color: rgba(0, 0, 0, 0.5);
            `}
        >
            <centerbox vertical={true} hexpand={true} halign={Gtk.Align.CENTER}>
                <box />
                <box halign={Gtk.Align.CENTER} css={"padding-bottom: 128px;"} vertical={true}>
                    <box
                        vexpand={false}
                        heightRequest={200}
                        widthRequest={200}
                        css={`
                            background-image: url("${GLib.get_home_dir()}/.face");
                            background-size: cover;
                            background-repeat: no-repeat;
                            background-position: center;
                            border-radius: 100%;
                            box-shadow: 0 0 10px #000;
                        `}
                    />
                    <label
                        label={GLib.get_user_name()}
                        css={"font-size: 32px; margin-top: 12px; text-shadow: 0 0 5px #000;"}
                    />
                    <box vertical={true}>
                        {entry}
                        <label halign={Gtk.Align.CENTER} label={err()} />
                    </box>
                </box>
                <box />
            </centerbox>
        </box>
    );
    const window = new Gtk.Window({
        child: (
            <overlay
                className={"LockScreen"}
                overlay={
                    <revealer
                        transitionDuration={animateDuration}
                        transitionType={Gtk.RevealerTransitionType.CROSSFADE}
                        revealChild={inputState()}
                    >
                        {inputPage}
                    </revealer>
                }
            >
                {background}
            </overlay>
        ),
    });
    let revealing = false;
    let canReveal = true;
    let timer: AstalIO.Time | null = null;
    window.connect("key-press-event", (self, e) => {
        if (!canReveal) return;
        const doReveal = () => {
            revealing = true;
            if (timer) timer.cancel();

            let t = animateDuration;
            if (!inputState.get()) {
                t = animateDuration * 1.5; // 时钟的关闭时间是1.5倍于背景的打开时间
            }
            idle(() => {
                entry.text = "";
                err.set("");
                if (inputState.get()) {
                    entry.editable = true;
                    entry.grab_focus();
                }
            });
            timer = timeout(t, () => {
                revealing = false;
            });
        };
        if (canReveal && e.get_keyval()[1] === Gdk.KEY_Escape && inputState.get()) {
            doReveal();
            inputState.set(false);
        }
        if (canReveal && e.get_keyval()[1] === Gdk.KEY_Return && !inputState.get()) {
            doReveal();
            inputState.set(true);
        }
        if (!revealing && e.get_keyval()[1] === Gdk.KEY_Return && inputState.get()) {
            err.set("");
            const password = entry.text;
            if (password.length === 0) return;
            entry.editable = false;
            canReveal = false;
            auth(password)
                .then(() => {
                    self.destroy();
                })
                .catch((error) => {
                    err.set(error.message);
                    idle(() => {
                        entry.editable = true;
                        entry.grab_focus();
                        entry.select_region(0, -1);
                        canReveal = true;
                    });
                });
        }
    });

    return window;
}

function TransitionAB({
    duration,
    isShow,
    busy,
    child,
}: {
    duration: number;
    isShow: Binding<boolean>;
    busy?: Variable<boolean>;
    child?: BindableChild;
}) {
    return (
        <revealer
            revealChild={false}
            transitionType={Gtk.RevealerTransitionType.CROSSFADE}
            setup={(self) => {
                self.hook(isShow, (_, isShow) => {
                    const child = self.get_child() as Gtk.Revealer;
                    if (isShow) {
                        self.transitionDuration = 0;
                        self.revealChild = true;
                        child.transitionDuration = duration;
                        child.revealChild = true;
                        return;
                    }
                    self.transitionDuration = duration;
                    self.revealChild = false;

                    if (busy) {
                        busy.set(true);
                        timeout(duration, () => {
                            child.transitionDuration = 0;
                            child.revealChild = false;
                            busy!.set(false);
                        });
                    }
                });
            }}
        >
            <revealer revealChild={false} transitionType={Gtk.RevealerTransitionType.SLIDE_UP}>
                {child}
            </revealer>
        </revealer>
    );
}
