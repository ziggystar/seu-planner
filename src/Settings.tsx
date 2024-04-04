import { FormHelperText, Grid, MenuItem, Select, TextField } from "@mui/material";

export type ModelType = "AssignChildren" | "AssignSchools";
export type Settings = {
    openRoutServiceKey: string | undefined,
    modelType: ModelType,
    csvSeparator: ";" | "\t",
    csvDecimalSeparator: "," | "."
}

export function getDefaultSettings(): Settings {
    return {
        openRoutServiceKey: undefined,
        modelType: "AssignChildren",
        csvSeparator: ";",
        csvDecimalSeparator: ","
    };
}

//react component to edit settings
interface SettingsProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
}

export function SettingsEditor({ settings, setSettings }: SettingsProps) {
    return (
        <Grid container>
            <Grid item xs={12} spacing={2} rowSpacing={2}>
                <FormHelperText id="my-helper-text">Die Berechnung der Wegstrecken gemäß echtem Fahrtweg benötigt einen Zugangs-Schlüssel für <a href="https://openrouteservice.org">OpenRouteService.org</a></FormHelperText>
            </Grid>
            <Grid container item xs={12}>
                <TextField
                    label="OpenRouteService API Key"
                    value={settings.openRoutServiceKey}
                    onChange={(e) => setSettings({ ...settings, openRoutServiceKey: e.target.value })}
                />
            </Grid>
            <Grid container item xs={12}>
                <Select disabled={true} label="Modell" value={settings.modelType} onChange={(e) => setSettings({ ...settings, modelType: e.target.value as ModelType })}>
                    <MenuItem value="AssignChildren">Kinder zuweisen</MenuItem>
                    <MenuItem value="AssignSchools">Schulen zuweisen</MenuItem>
                </Select>
            </Grid>
            <Grid container item xs={12}>
                <Select label="CSV-Separator" value={settings.csvSeparator} onChange={(e) => setSettings({ ...settings, csvSeparator: e.target.value as ";" | "\t" })}>
                    <MenuItem value=";">Semikolon</MenuItem>
                    <MenuItem value="\t">Tabulator</MenuItem>
                </Select>
            </Grid>
            <Grid container item xs={12}>
                <Select label="CSV-Dezimaltrennzeichen" value={settings.csvDecimalSeparator} onChange={(e) => setSettings({ ...settings, csvDecimalSeparator: e.target.value as "," | "." })}>
                    <MenuItem value=",">Komma</MenuItem>
                    <MenuItem value=".">Punkt</MenuItem>
                </Select>
            </Grid>
        </Grid>
    );
}