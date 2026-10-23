import { classNameFactory } from "@utils/css";
import { formatDuration } from "@utils/text";
import { React, useStateFromStores } from "@webpack/common";

import { MediaStore } from "./Store";

const cl = classNameFactory("vc-bmp-");

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function SeekBar({ duration }: { duration: number; }) {
    const isPlaying = useStateFromStores([MediaStore], () => MediaStore.isPlaying);
    const storePosition = useStateFromStores([MediaStore], () => MediaStore.mPosition);

    const [position, setPosition] = React.useState(() => MediaStore.position);
    const [dragPosition, setDragPosition] = React.useState<number | null>(null);
    const [hover, setHover] = React.useState<{ x: number; ms: number; } | null>(null);

    React.useEffect(() => {
        setPosition(MediaStore.position);
        if (!isPlaying) return;

        const interval = setInterval(() => setPosition(MediaStore.position), 1000);
        return () => clearInterval(interval);
    }, [storePosition, isPlaying]);

    const current = clamp(dragPosition ?? position, 0, duration);
    const seconds = Math.floor(current / 1000);

    const valueAt = (e: React.PointerEvent<HTMLDivElement>) => {
        const { left, width } = e.currentTarget.getBoundingClientRect();
        const x = clamp(e.clientX - left, 0, width);
        return { x, ms: width ? (x / width) * duration : 0 };
    };

    const seek = (ms: number) => {
        // update right away so the bar doesn't jump back before Discord replies
        MediaStore.position = ms;
        MediaStore.emitChange();
        MediaStore.seek(ms);
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 || duration <= 0) return;

        e.currentTarget.setPointerCapture(e.pointerId);
        const value = valueAt(e);
        setDragPosition(value.ms);
        setHover(value);
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (duration <= 0) return;

        const value = valueAt(e);
        setHover(value);
        if (dragPosition != null) setDragPosition(value.ms);
    };

    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragPosition == null) return;

        seek(valueAt(e).ms);
        setDragPosition(null);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        const direction = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!direction) return;

        e.preventDefault();
        seek(clamp(MediaStore.position + direction * (e.shiftKey ? 15000 : 5000), 0, duration));
    };

    return (
        <div
            className={cl("seek")}
            data-dragging={dragPosition != null}
            style={{ "--vc-bmp-progress": duration > 0 ? current / duration : 0 } as React.CSSProperties}
        >
            <div
                className={cl("seek-hit")}
                role="slider"
                tabIndex={0}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration / 1000)}
                aria-valuenow={seconds}
                aria-valuetext={formatDuration(seconds * 1000)}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => setDragPosition(null)}
                onPointerLeave={() => setHover(null)}
                onKeyDown={onKeyDown}
            >
                <div className={cl("seek-rail")}>
                    <div className={cl("seek-fill")} />
                </div>
                <div className={cl("seek-thumb")} />
                {hover && (
                    <div className={cl("seek-tip")} style={{ left: hover.x }}>
                        {formatDuration(hover.ms)}
                    </div>
                )}
            </div>

            <div className={cl("times")}>
                <span aria-label="Progress">{formatDuration(seconds * 1000)}</span>
                <span aria-label="Total duration">{formatDuration(duration)}</span>
            </div>
        </div>
    );
}
