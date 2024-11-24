import { bind, Variable } from "astal";
import { setHoverClassName } from "../utils";
import { EventIcon } from "./base";
import Notifd from "gi://AstalNotifd";
import { Astal, Gdk, Gtk } from "astal/gtk3";
import { EventIconProps } from "./base/event-icon";

export default function NotificationsIcon({ size }: { size: number }) {
    const notifd = Notifd.get_default();
    const menu = new Gtk.Menu();
    const menuDontDisturb = new Gtk.MenuItem({ label: "Don't disturb" });
    const menuDoDisturb = new Gtk.MenuItem({ label: "Do disturb" });
    menuDontDisturb.connect("activate", () => {
        notifd.dontDisturb = true;
        menu.popdown();
        menuDontDisturb.hide();
        menuDoDisturb.show();
    });
    menuDoDisturb.connect("activate", () => {
        notifd.dontDisturb = false;
        menu.popdown();
        menuDoDisturb.hide();
        menuDontDisturb.show();
    });
    menu.add(menuDontDisturb);
    menu.add(menuDoDisturb);
    if (notifd.dontDisturb) menuDoDisturb.show();
    else menuDontDisturb.show();
    const iconName = Variable("notifications-symbolic");
    const setIcon = () => {
        if (notifd.dontDisturb) {
            iconName.set("notifications-disabled-symbolic");
            return;
        }
        let urgency = -1;
        notifd.notifications.forEach((n) => {
            if (n.urgency > urgency) urgency = n.urgency;
        });
        switch (urgency) {
            case Notifd.Urgency.LOW:
                iconName.set("low-notif-symbolic");
                break;
            case Notifd.Urgency.NORMAL:
                iconName.set("normal-notif-symbolic");
                break;
            case Notifd.Urgency.CRITICAL:
                iconName.set("critical-notif-symbolic");
                break;
            default:
                iconName.set("notifications-symbolic");
        }
    };

    return (
        <EventIcon
            onButtonPressEvent={(self, e) => {
                if (e.get_button()[1] === Gdk.BUTTON_SECONDARY) {
                    let location = self.get_allocation();
                    let rect = new Gdk.Rectangle({
                        x: location.x,
                        y: location.y,
                        height: location.height,
                    });
                    menu?.popup_at_rect(
                        self.get_window()!,
                        rect,
                        Gdk.Gravity.SOUTH,
                        Gdk.Gravity.CENTER,
                        null
                    );
                }
                if (e.get_button()[1] === Gdk.BUTTON_MIDDLE) {
                    notifd.dontDisturb = !notifd.dontDisturb;
                    if (notifd.dontDisturb) {
                        menuDoDisturb.show();
                        menuDontDisturb.hide();
                    } else {
                        menuDoDisturb.hide();
                        menuDontDisturb.show();
                    }
                }
            }}
            onDestroy={() => menu.destroy()}
            setup={(self) => {
                setHoverClassName(self, "NotificationIcon");
                self.hook(bind(notifd, "notifications"), (self, _) => setIcon());
                self.hook(bind(notifd, "dontDisturb"), (self, _) => setIcon());
            }}
            iconName={iconName()}
            size={size}
            className={"NotificationIcon"}
        />
    );
}
