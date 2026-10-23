import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { OptionType } from "@utils/types";

import { Player } from "./Player";

export const settings = definePluginSettings({
    controls: {
        type: OptionType.SELECT,
        description: "When to show the playback controls",
        options: [
            { label: "Always", value: "always", default: true },
            { label: "Only while hovering the player", value: "hover" }
        ]
    },
    showAlbum: {
        type: OptionType.BOOLEAN,
        description: "Show the album name",
        default: true
    },
    glow: {
        type: OptionType.BOOLEAN,
        description: "Tint the player background with the album cover",
        default: true
    },
    showSource: {
        type: OptionType.BOOLEAN,
        description: "Show the music service icon",
        default: true
    },
    compact: {
        type: OptionType.BOOLEAN,
        description: "Compact layout (smaller cover, tighter spacing)",
        default: false
    },
    hideAfterMinutes: {
        type: OptionType.NUMBER,
        description: "Hide the player after this many minutes of being paused (0 = never hide)",
        default: 5
    },
    previousButtonRestartsTrack: {
        type: OptionType.BOOLEAN,
        description: "Pressing previous restarts the track if more than 3 seconds have played",
        default: true
    },
    useSpotifyUris: {
        type: OptionType.BOOLEAN,
        description: "Open Spotify URIs instead of URLs. Only works if the Spotify app is installed",
        default: false
    }
});

export default definePlugin({
    name: "BetterMediaPlayer",
    description: "A cleaner, responsive now-playing card above the account panel (replaces SpotifyControls)",
    tags: ["Media", "Activity"],
    authors: [{ name: "d3v_c", id: 1140557619208130641n }],
    settings,

    // Same hooks as SpotifyControls, so keep that plugin disabled or you'll get two players
    patches: [
        {
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            replacement: {
                match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,occluded:)/,
                replace: "$self.PanelWrapper,{VencordOriginal:$1,"
            }
        },
        {
            find: ".PLAYER_DEVICES",
            replacement: [{
                // add POST and a marker so the module can be found later
                match: /get:(\i)\.bind\(null,(\i\.\i)\.get\)/,
                replace: "post:$1.bind(null,$2.post),vcSpotifyMarker:1,$&"
            },
            {
                // Spotify Connect answers skips with 202, which Discord treats as an error and retries
                match: /202===\i\.status/,
                replace: "false"
            }]
        },
        {
            find: 'repeat:"off"!==',
            replacement: [
                {
                    // Discord only exposes repeat as a boolean and has no shuffle state
                    match: /repeat:"off"!==(\i),/,
                    replace: "shuffle:arguments[2]?.shuffle_state??false,actual_repeat:$1,$&"
                },
                {
                    match: /(?<=artists.filter\(\i=>).{0,10}\i\.id\)&&/,
                    replace: ""
                }
            ]
        }
    ],

    PanelWrapper({ VencordOriginal, ...props }) {
        return (
            <>
                <ErrorBoundary
                    fallback={() => (
                        <div className="vc-bmp-fallback">
                            <p>Failed to render the media player :(</p>
                            <p>Check the console for errors</p>
                        </div>
                    )}
                >
                    <Player />
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    }
});
