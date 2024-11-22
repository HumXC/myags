import { setHoverClassName } from "../utils";
import BrightnessIcon from "./BrightnessIcon";
import NetworkIcon from "./NetworkIcon";
import FloatMenu from "./FloatMenu";
export default function DevicesIcon({ size }: { size: number }) {
    return (
        <eventbox
            setup={(self) => setHoverClassName("DevicesIcon", self)}
            onClick={(self, e) => {
                FloatMenu({});
            }}
        >
            <box
                css={`
                    padding: 0 ${size / 6}px;
                `}
            >
                <BrightnessIcon size={size - size / 6} />
                <NetworkIcon size={size} padding1={size / 6} padding2={0} />
            </box>
        </eventbox>
    );
}