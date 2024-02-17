import { Alert, Button, Grid, Snackbar, TextField } from '@mui/material';
import './Scenario.css';
import { DataGrid } from '@mui/x-data-grid';
import { useLocalStorage } from 'usehooks-ts';
import { useState } from 'react';

export type Assignment = {
    employeeId: string,
    schoolId: string,
    distance: number,
    kids: number
}

export type Scenario = {
    id: string,
    description: string,
    created: Date,
    updated: Date,
    kidsPerSchool: [string, number][],
    minKidsPerEmployee: [string, number][],
    maxKidsPerEmployee: [string, number][],
    optimzationResult: Assignment[] | undefined
}

export function ScenarioManager(props: {
    schools: [string, string][],
    employees: [string, string][],
    scenarios: Scenario[],
    setScenarios: (scenarios: Scenario[]) => void,
    selectedScenarioId: string | undefined,
    setSelectedScenarioId: (scenario: string | undefined) => void
}) {

    const [message, setMessage] = useState<string | undefined>(undefined);

    const [_kidsPerSchool, setKidsPerSchool] = useLocalStorage<[string, number][]>(`scenario.${props.selectedScenarioId}.kidsPerSchool`, [])
    const kidsPerSchool = new Map(_kidsPerSchool)
    const [_kidsPerEmployee, setkidsPerEmployee] = useLocalStorage<[string, { min: number, max: number }][]>(`scenario.${props.selectedScenarioId}.kidsPerEmployee`, []);
    const kidsPerEmployee = new Map(_kidsPerEmployee);

    const cbWriteSchools = function () {
        navigator.clipboard.writeText(
            props.schools.map((s) =>
                `${s[0]}\t${kidsPerSchool.get(s[0]) || 0}`).join("\n"))
        setMessage("Schulen in Zwischenablage kopiert")
    }
    //set only non-zero rows
    const cbReadSchools = function (text: string) {
        const rows = text.split("\n").map((row) => row.split("\t"));
        const imported = rows.filter((row) => row[1] !== "0" && row[0] !== "").map((row) => [row[0], parseInt(row[1])] as [string, number]);
        const discarded = rows.filter((row) => row[0] === "");
        setKidsPerSchool(imported);
        setMessage(`${imported.length} Schulen aus Zwischenablage eingefügt`)
    }

    const cbWriteEmpl = function () {
        navigator.clipboard.writeText(
            props.employees.map((e) =>
                `${e[0]}\t${kidsPerEmployee.get(e[0])?.min || 0}\t${kidsPerEmployee.get(e[0])?.max || 0}`).join("\n"))
        setMessage("Mitarbeiter in Zwischenablage kopiert")
    }
    //set only non-zero rows
    const cbReadEmpl = function (text: string) {
        const rows = text.split("\n").map((row) => row.split("\t"));
        setkidsPerEmployee(rows.filter((row) => row[0] !== "" && row[2] !== "0").map((row) => [row[0], { min: parseInt(row[1]), max: parseInt(row[2]) }]));
        setMessage("Mitarbeiter aus Zwischenablage eingefügt")
    }

    return (<>
        <Snackbar
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={message !== undefined}
            autoHideDuration={5000}
            onClose={() => setMessage(undefined)}
            message={message}>
            <Alert
            severity='info'
            onClose={() => setMessage(undefined)}
            variant='filled'>
                {message}
            </Alert>
        </Snackbar>
        <Grid container rowSpacing={5} columnSpacing={5} margin={1}>
            <Grid item xs={2}>
                <Button onClick={() => {
                    const newScenario: Scenario = {
                        id: prompt("ID eingeben") || "new",
                        description: prompt("Beschreibung eingeben") || "new",
                        created: new Date(),
                        updated: new Date(),
                        kidsPerSchool: [],
                        minKidsPerEmployee: [],
                        maxKidsPerEmployee: [],
                        optimzationResult: undefined
                    }
                    props.setScenarios([...props.scenarios, newScenario]);
                    props.setSelectedScenarioId(newScenario.id);
                }}>Szenario anlegen</Button>
                <p>Selektiert: '{props.selectedScenarioId || 'keins'}'</p>
            </Grid>
            <Grid item xs={10}>
                <DataGrid
                    rows={props.scenarios}
                    columns={[
                        { field: 'id', headerName: 'ID', width: 100 },
                        { field: 'description', headerName: 'Beschreibung', width: 250 },
                        { field: 'created', headerName: 'Erstellt', width: 150 },
                        { field: 'updated', headerName: 'Geändert', width: 150 },
                        { field: 'kidsPerSchool', headerName: 'Kinder', width: 100 },
                        { field: 'optimzationResult', headerName: 'Optimierung', width: 150 }
                    ]}
                    onRowClick={(row) => props.setSelectedScenarioId(row.row.id as string)}
                />
            </Grid>
            {/* data grid to edit the kids per school */}
            {props.selectedScenarioId !== undefined && <>
                <Grid item xs={6}>
                    <Button onClick={cbWriteSchools}>Schulen nach Zwischenablage</Button>
                    <TextField label="Schulen Einfügen" multiline rows={1} onChangeCapture={(e: React.ChangeEvent<HTMLInputElement>) => {
                        cbReadSchools(e.target.value)
                        //clear input field
                        e.target.value = "";
                        }} />
                </Grid>
                <Grid item xs={6}>
                    <Button onClick={cbWriteEmpl}>Mitarbeiter kopieren</Button>
                    <TextField label="Mitarbeiter einfügen" multiline rows={1} onChangeCapture={(e: React.ChangeEvent<HTMLInputElement>) => {
                        cbReadEmpl(e.target.value)
                        //clear input field
                        e.target.value = "";
                        }} />
                </Grid>
                <Grid item xs={6}>
                    <DataGrid
                        rows={props.schools.map(s => ({ id: s[0], name: s[1], kids: kidsPerSchool.get(s[0]) || 0 }))}
                        columns={[
                            { field: 'name', headerName: 'Schule', width: 350 },
                            { field: 'kids', headerName: 'Kinder', width: 150, editable: true }
                        ]}
                        processRowUpdate={(updatedRow) => {
                            setKidsPerSchool(Array.from(kidsPerSchool.set(updatedRow.id as string, updatedRow.kids as number).entries()));

                            return updatedRow;
                        }}
                    />
                </Grid>
                <Grid item xs={6}>
                    <DataGrid
                        rows={props.employees.map(e => ({ id: e[0], name: e[1], min: kidsPerEmployee.get(e[0])?.min || 0, max: kidsPerEmployee.get(e[0])?.max || 0 }))}
                        columns={[
                            { field: 'name', headerName: 'Personal', width: 350 },
                            { field: 'min', headerName: 'Min', width: 150, editable: true },
                            { field: 'max', headerName: 'Max', width: 150, editable: true }
                        ]}
                        processRowUpdate={(updatedRow) => {
                            setkidsPerEmployee(Array.from(kidsPerEmployee.set(updatedRow.id as string, { min: updatedRow.min as number, max: updatedRow.max as number }).entries()));
                            return updatedRow;
                        }}
                    />
                </Grid>
            </>
            }
        </Grid>
    </>)
}