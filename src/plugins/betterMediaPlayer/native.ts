import { execFile } from "child_process";
import type { IpcMainInvokeEvent } from "electron";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SystemMedia {
    source: string;
    title: string;
    artist: string;
    album: string;
    status: string;
}

export type MediaAction = "previous" | "play" | "pause" | "next";

const actionMethods: Record<MediaAction, string> = {
    previous: "TrySkipPreviousAsync",
    play: "TryPlayAsync",
    pause: "TryPauseAsync",
    next: "TrySkipNextAsync"
};

const Manager = "[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]";
const Properties = "[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]";

// Gets the current media session into $session, or exits with no output if there is none
const getSession = `
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]

function Await($operation, $type) {
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -like "IAsyncOperation*" } |
        Select-Object -First 1
    $asTask.MakeGenericMethod($type).Invoke($null, @($operation)).GetAwaiter().GetResult()
}

$session = (Await (${Manager}::RequestAsync()) (${Manager})).GetCurrentSession()
if ($null -eq $session) { exit }
`;

async function powershell(script: string) {
    const { stdout } = await execFileAsync("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        script
    ], { windowsHide: true });

    return stdout.trim();
}

export async function getCurrentMedia(_: IpcMainInvokeEvent): Promise<SystemMedia | null> {
    if (process.platform !== "win32") return null;

    const out = await powershell(getSession + `
$props = Await ($session.TryGetMediaPropertiesAsync()) (${Properties})
[pscustomobject]@{
    source = $session.SourceAppUserModelId
    title = $props.Title
    artist = $props.Artist
    album = $props.AlbumTitle
    status = $session.GetPlaybackInfo().PlaybackStatus.ToString()
} | ConvertTo-Json -Compress
`);

    return out ? JSON.parse(out) : null;
}

export async function controlMedia(_: IpcMainInvokeEvent, action: MediaAction): Promise<boolean> {
    const method = actionMethods[action];
    if (process.platform !== "win32" || !method) return false;

    const out = await powershell(getSession + `Await ($session.${method}()) ([bool])`);
    return out === "True";
}
