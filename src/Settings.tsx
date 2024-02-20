import { TextField } from "@mui/material";

export type Settings = {
  openRoutServiceKey: string | undefined
}

//react component to edit settings
interface SettingsProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
}

export function SettingsEditor({ settings, setSettings }: SettingsProps) {
    return (
        <div>
            <h1>Einstellungen</h1>
            <TextField
                label="OpenRouteService API Key"
                value={settings.openRoutServiceKey}
                onChange={(e) => setSettings({ ...settings, openRoutServiceKey: e.target.value })}
            />
        </div>
    );
}