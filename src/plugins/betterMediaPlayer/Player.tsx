import "./styles.css";

import { CopyIcon, ImageIcon, LinkIcon, OpenExternalIcon } from "@components/Icons";
import { debounce } from "@shared/debounce";
import { classNameFactory } from "@utils/css";
import { copyWithToast, openImageModal } from "@utils/discord";
import { classes } from "@utils/misc";
import { ContextMenuApi, Menu, React, useStateFromStores } from "@webpack/common";

import { settings } from ".";
import { SeekBar } from "./SeekBar";
import { MediaStore, Track } from "./Store";
import type { MediaAction, SystemMedia } from "./native";

const cl = classNameFactory("vc-bmp-");
const Native = VencordNative.pluginHelpers.BetterMediaPlayer as PluginNative<typeof import("./native")>;

// Order matters: "operagx" has to be checked before "opera"
const sourceNames = [
    ["spotify", "Spotify"],
    ["youtube music", "YouTube Music"],
    ["youtubemusic", "YouTube Music"],
    ["youtube_music", "YouTube Music"],
    ["applemusic", "Apple Music"],
    ["apple music", "Apple Music"],
    ["amazon music", "Amazon Music"],
    ["amazonmusic", "Amazon Music"],
    ["tidal", "Tidal"],
    ["deezer", "Deezer"]
];

function isSupportedMusicPlayer(source: string) {
    const name = source.toLowerCase();
    return sourceNames.some(([key]) => name.includes(key));
}

const sourceIcons = [
    ["spotify", "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.59 14.47a.62.62 0 0 1-.85.21 9.17 9.17 0 0 0-8.85-.5.62.62 0 1 1-.29-1.17 10.42 10.42 0 0 1 10.01.57c.3.17.4.55.21.89zm1.22-2.72a.77.77 0 0 1-1.06.25 11.25 11.25 0 0 0-10.23-.58.77.77 0 1 1-.36-1.46 12.8 12.8 0 0 1 11.69.66c.36.22.47.7.25 1.13zm.1-2.84C14.43 8.84 9.3 8.65 5.9 9.68a.92.92 0 0 1-.53-1.76c3.9-1.18 9.59-.96 13.42 1.31a.92.92 0 1 1-.88 1.68z"],
    ["youtube", "M21.58 7.19a2.99 2.99 0 0 0-2.1-2.12C17.63 4.57 12 4.57 12 4.57s-5.63 0-7.48.5a3 3 0 0 0-2.1 2.12A31.2 31.2 0 0 0 1.92 12a31.2 31.2 0 0 0 .5 4.81 2.99 2.99 0 0 0 2.1 2.12c1.85.5 7.48.5 7.48.5s5.63 0 7.48-.5a2.99 2.99 0 0 0 2.1-2.12 31.2 31.2 0 0 0 .5-4.81 31.2 31.2 0 0 0-.5-4.81zM9.75 15.04V8.96L15.1 12l-5.35 3.04z"],
    ["tidal", "m12 3 3 3-3 3-3-3 3-3zm-6 6 3 3-3 3-3-3 3-3zm12 0 3 3-3 3-3-3 3-3zm-6 6 3 3-3 3-3-3 3-3z"]
];

const musicNoteIcon = "M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z";

function getSourceName(source: string) {
    const name = source.toLowerCase();
    const known = sourceNames.find(([key]) => name.includes(key));

    return known?.[1] ?? (source.split("!")[0].replace(/[_.]+/g, " ").trim() || "Music player");
}

function useSystemMedia() {
    const [media, setMedia] = React.useState<SystemMedia | null>(null);

    React.useEffect(() => {
        let active = true;
        const update = () => Native.getCurrentMedia()
            .then(m => active && setMedia(m))
            .catch(() => active && setMedia(null));

        update();
        const interval = setInterval(update, 2000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    return media?.title && isSupportedMusicPlayer(media.source) ? media : null;
}

function makeIcon(path: string) {
    return () => (
        <svg className={cl("icon")} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable={false}>
            <path d={path} />
        </svg>
    );
}

const PlayIcon = makeIcon("M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z");
const PauseIcon = makeIcon("M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z");
const PrevIcon = makeIcon("M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z");
const NextIcon = makeIcon("M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82zM16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1z");
const RepeatIcon = makeIcon("M7 7h10v1.79c0 .45.54.67.85.35l2.79-2.79c.2-.2.2-.51 0-.71l-2.79-2.79c-.31-.31-.85-.09-.85.36V5H6c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1V7zm10 10H7v-1.79c0-.45-.54-.67-.85-.35l-2.79 2.79c-.2.2-.2.51 0 .71l2.79 2.79c.31.31.85.09.85-.36V19h11c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1s-1 .45-1 1v3z");
const ShuffleIcon = makeIcon("M10.59 9.17L6.12 4.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.46 4.46 1.42-1.4zm4.76-4.32l1.19 1.19L4.7 17.88c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L17.96 7.46l1.19 1.19c.31.31.85.09.85-.36V4.5c0-.28-.22-.5-.5-.5h-3.79c-.45 0-.67.54-.36.85zm-.52 8.56l-1.41 1.41 3.13 3.13-1.2 1.2c-.31.31-.09.85.36.85h3.79c.28 0 .5-.22.5-.5v-3.79c0-.45-.54-.67-.85-.35l-1.19 1.19-3.13-3.14z");

function CopyContextMenu({ type, name, path }: { type: string; name: string; path: string; }) {
    return (
        <Menu.Menu
            navId="vc-bmp-menu"
            onClose={ContextMenuApi.closeContextMenu}
            aria-label={`${type} menu`}
        >
            <Menu.MenuItem
                id="vc-bmp-copy-name"
                label={`Copy ${type} Name`}
                action={() => copyWithToast(name)}
                icon={CopyIcon}
                leadingAccessory={{ type: "icon", icon: CopyIcon }}
            />
            <Menu.MenuItem
                id="vc-bmp-copy-link"
                label={`Copy ${type} Link`}
                action={() => copyWithToast("https://open.spotify.com" + path)}
                icon={LinkIcon}
                leadingAccessory={{ type: "icon", icon: LinkIcon }}
            />
            <Menu.MenuItem
                id="vc-bmp-open"
                label={`Open ${type} in Spotify`}
                action={() => MediaStore.openExternal(path)}
                icon={OpenExternalIcon}
                leadingAccessory={{ type: "icon", icon: OpenExternalIcon }}
            />
        </Menu.Menu>
    );
}

function CoverContextMenu({ track }: { track: Track; }) {
    const volume = useStateFromStores([MediaStore], () => MediaStore.volume);

    return (
        <Menu.Menu
            navId="vc-bmp-cover-menu"
            onClose={ContextMenuApi.closeContextMenu}
            aria-label="Album menu"
        >
            <Menu.MenuItem
                id="vc-bmp-open-album"
                label="Open Album"
                action={() => MediaStore.openExternal(`/album/${track.album.id}`)}
                icon={OpenExternalIcon}
                leadingAccessory={{ type: "icon", icon: OpenExternalIcon }}
            />
            <Menu.MenuItem
                id="vc-bmp-view-cover"
                label="View Album Cover"
                action={() => openImageModal(track.album.image)}
                icon={ImageIcon}
                leadingAccessory={{ type: "icon", icon: ImageIcon }}
            />
            <Menu.MenuControlItem
                id="vc-bmp-volume"
                label="Volume"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        {...props}
                        ref={ref}
                        value={volume}
                        minValue={0}
                        maxValue={100}
                        onChange={debounce((v: number) => MediaStore.setVolume(v))}
                    />
                )}
            />
        </Menu.Menu>
    );
}

function linkProps(type: "Song" | "Artist" | "Album", id: string | undefined, name: string, path: string) {
    if (!id) return {};

    return {
        role: "link",
        tabIndex: 0,
        onClick: () => MediaStore.openExternal(path),
        onKeyDown: e => e.key === "Enter" && MediaStore.openExternal(path),
        onContextMenu: e =>
            ContextMenuApi.openContextMenu(e, () => <CopyContextMenu type={type} name={name} path={path} />)
    } satisfies React.HTMLAttributes<HTMLElement>;
}

function Marquee({ watch, className, children }: { watch: string; className?: string; children: React.ReactNode; }) {
    const container = React.useRef<HTMLDivElement>(null);
    const content = React.useRef<HTMLDivElement>(null);
    const [shift, setShift] = React.useState(0);

    React.useLayoutEffect(() => {
        const outer = container.current;
        const inner = content.current;
        if (!outer || !inner) return;

        const measure = () => setShift(Math.max(0, Math.ceil(inner.scrollWidth - outer.clientWidth)));
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(outer);
        return () => observer.disconnect();
    }, [watch]);

    return (
        <div
            ref={container}
            className={classes(cl("marquee"), className)}
            data-overflow={shift > 0}
            style={{ "--vc-bmp-shift": `-${shift}px`, "--vc-bmp-dur": `${Math.max(3, shift / 28)}s` } as React.CSSProperties}
        >
            <div ref={content} className={cl("marquee-inner")}>{children}</div>
        </div>
    );
}

function SourceBadge({ source }: { source: string; }) {
    const name = source.toLowerCase();
    const path = sourceIcons.find(([key]) => name.includes(key))?.[1] ?? musicNoteIcon;

    return (
        <span className={cl("source")} data-source={name} title={`Playing from ${source}`}>
            <svg className={cl("source-icon")} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={path} />
            </svg>
            <span className={cl("source-name")}>{source}</span>
        </span>
    );
}

function Info({ track, showAlbum, source }: { track: Track; showAlbum: boolean; source?: string; }) {
    const image = track.album?.image;
    const artists = track.artists.filter(a => a.name);

    return (
        <div className={cl("header", "enter")}>
            {image?.url && (
                <button
                    className={cl("cover")}
                    aria-label="View album cover (right-click for more)"
                    onClick={() => openImageModal(image)}
                    onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <CoverContextMenu track={track} />)}
                >
                    <img src={image.url} alt="" draggable={false} />
                </button>
            )}

            <div className={cl("titles")}>
                <div className={cl("title-row")}>
                    <Marquee watch={track.name} className={cl("title")}>
                        <span title={track.name} {...linkProps("Song", track.id, track.name, `/track/${track.id}`)}>
                            {track.name}
                        </span>
                    </Marquee>
                    {source && <SourceBadge source={source} />}
                </div>

                {artists.length > 0 && (
                    <Marquee watch={artists.map(a => a.name).join(", ")} className={cl("artists")}>
                        {artists.map((a, i) => (
                            <React.Fragment key={a.id || a.name}>
                                <span
                                    className={cl("artist")}
                                    title={a.name}
                                    {...linkProps("Artist", a.id, a.name, `/artist/${a.id}`)}
                                >
                                    {a.name}
                                </span>
                                {i < artists.length - 1 && <span className={cl("comma")}>, </span>}
                            </React.Fragment>
                        ))}
                    </Marquee>
                )}

                {showAlbum && track.album?.name && (
                    <Marquee watch={track.album.name} className={cl("album")}>
                        <span
                            title={track.album.name}
                            {...linkProps("Album", track.album.id, track.album.name, `/album/${track.album.id}`)}
                        >
                            {track.album.name}
                        </span>
                    </Marquee>
                )}
            </div>
        </div>
    );
}

function IconButton({ label, active, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; }) {
    return (
        <button
            type="button"
            className={classes(cl("btn"), className)}
            aria-label={label}
            title={label}
            data-active={active}
            {...props}
        />
    );
}

function Controls() {
    const isPlaying = useStateFromStores([MediaStore], () => MediaStore.isPlaying);
    const shuffle = useStateFromStores([MediaStore], () => MediaStore.shuffle);
    const repeat = useStateFromStores([MediaStore], () => MediaStore.repeat);
    const { previousButtonRestartsTrack } = settings.use(["previousButtonRestartsTrack"]);

    const nextRepeat = repeat === "off" ? "context" : repeat === "context" ? "track" : "off";
    const repeatLabel = repeat === "off" ? "Enable repeat" : repeat === "context" ? "Repeat track" : "Disable repeat";

    return (
        <div className={cl("controls")}>
            <IconButton
                label={shuffle ? "Disable shuffle" : "Enable shuffle"}
                className={cl("shuffle")}
                active={shuffle}
                onClick={() => MediaStore.setShuffle(!shuffle)}
            >
                <ShuffleIcon />
            </IconButton>

            <IconButton
                label="Previous"
                onClick={() => {
                    if (previousButtonRestartsTrack && MediaStore.position > 3000) MediaStore.seek(0);
                    else MediaStore.prev();
                }}
            >
                <PrevIcon />
            </IconButton>

            <IconButton
                label={isPlaying ? "Pause" : "Play"}
                className={cl("play")}
                onClick={() => MediaStore.setPlaying(!isPlaying)}
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>

            <IconButton label="Next" onClick={() => MediaStore.next()}>
                <NextIcon />
            </IconButton>

            <IconButton
                label={repeatLabel}
                className={cl("repeat")}
                active={repeat !== "off"}
                onClick={() => MediaStore.setRepeat(nextRepeat)}
            >
                <RepeatIcon />
                {repeat === "track" && <span className={cl("repeat-one")}>1</span>}
            </IconButton>
        </div>
    );
}

function SystemControls({ media }: { media: SystemMedia; }) {
    const [busy, setBusy] = React.useState(false);
    const isPlaying = media.status === "Playing";

    const control = (action: MediaAction) => {
        setBusy(true);
        Native.controlMedia(action).finally(() => setBusy(false));
    };

    return (
        <div className={cl("controls")}>
            <IconButton label="Previous" disabled={busy} onClick={() => control("previous")}>
                <PrevIcon />
            </IconButton>
            <IconButton
                label={isPlaying ? "Pause" : "Play"}
                className={cl("play")}
                disabled={busy}
                onClick={() => control(isPlaying ? "pause" : "play")}
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            <IconButton label="Next" disabled={busy} onClick={() => control("next")}>
                <NextIcon />
            </IconButton>
        </div>
    );
}

function Glow({ url }: { url: string; }) {
    return (
        <div className={cl("glow")} aria-hidden="true">
            <img key={url} className={cl("glow-img")} src={url} alt="" draggable={false} />
        </div>
    );
}

function fallbackTrack(name: string, artist: string, album: string): Track {
    return {
        id: "",
        name,
        duration: 0,
        isLocal: false,
        album: { id: "", name: album, image: { height: 0, width: 0, url: "" } },
        artists: artist ? [{ id: "", href: "", name: artist, type: "", uri: "" }] : []
    };
}

export function Player() {
    const track = useStateFromStores(
        [MediaStore],
        () => MediaStore.track,
        null,
        (prev, next) => prev?.id ? prev.id === next?.id : prev?.name === next?.name
    );

    const device = useStateFromStores(
        [MediaStore],
        () => MediaStore.device,
        null,
        (prev, next) => prev?.id === next?.id
    );

    const isPlaying = useStateFromStores([MediaStore], () => MediaStore.isPlaying);
    const systemMedia = useSystemMedia();
    const { controls, showAlbum, glow, compact, hideAfterMinutes, showSource } = settings.use([
        "controls", "showAlbum", "glow", "compact", "hideAfterMinutes", "showSource"
    ]);

    // Spotify can be connected without playing, in which case another media session wins
    const isSpotifySession = systemMedia?.source.toLowerCase().includes("spotify");
    const spotifyTrack = device?.is_active && (isPlaying || !systemMedia || isSpotifySession) ? track : null;
    const isSpotifyActive = spotifyTrack != null;

    const [hidden, setHidden] = React.useState(false);

    React.useEffect(() => {
        setHidden(false);
        if (!isSpotifyActive || isPlaying || hideAfterMinutes <= 0) return;

        const timeout = setTimeout(() => setHidden(true), hideAfterMinutes * 60_000);
        return () => clearTimeout(timeout);
    }, [isSpotifyActive, isPlaying, hideAfterMinutes]);

    if ((!isSpotifyActive && !systemMedia) || hidden) return null;

    const displayed = spotifyTrack ?? fallbackTrack(
        systemMedia!.title,
        systemMedia!.artist,
        systemMedia!.album
    );
    const source = isSpotifyActive ? "Spotify" : getSourceName(systemMedia!.source);
    const coverUrl = displayed.album?.image?.url;

    return (
        <div
            className={cl("player")}
            data-controls={isSpotifyActive ? controls : "always"}
            data-compact={compact}
            data-playing={isSpotifyActive ? isPlaying : true}
            aria-label="Now playing"
        >
            {glow && coverUrl && <Glow url={coverUrl} />}
            <Info
                key={displayed.id || displayed.name}
                track={displayed}
                showAlbum={showAlbum && !compact}
                source={showSource ? source : undefined}
            />
            {isSpotifyActive ? (
                <>
                    <SeekBar duration={displayed.duration} />
                    <div className={cl("controls-wrap")}>
                        <Controls />
                    </div>
                </>
            ) : systemMedia && (
                <div className={cl("controls-wrap")}>
                    <SystemControls media={systemMedia} />
                </div>
            )}
        </div>
    );
}
