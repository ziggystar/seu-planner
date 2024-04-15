import { Alert, Button, Grid, Snackbar } from '@mui/material';
import './Scenario.css';
import { DataGrid } from '@mui/x-data-grid';
import { useLocalStorage } from 'usehooks-ts';
import { useState } from 'react';
import { MyGrid } from './MyGrid';
import { Settings } from './Settings';
import { Employee } from './types';

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
    employees: Employee[],
    scenarios: Scenario[],
    setScenarios: (scenarios: Scenario[]) => void,
    selectedScenarioId: string | undefined,
    setSelectedScenarioId: (scenario: string | undefined) => void,
    settings: Settings
}) {

    const [message, setMessage] = useState<string | undefined>(undefined);

    const [_kidsPerSchool, setKidsPerSchool] = useLocalStorage<[string, number][]>(`scenario.${props.selectedScenarioId}.kidsPerSchool`, [])
    const kidsPerSchool = new Map(_kidsPerSchool)
    const [_kidsPerEmployee, setkidsPerEmployee] = useLocalStorage<[string, { min: number, max: number }][]>(`scenario.${props.selectedScenarioId}.kidsPerEmployee`, []);
    const kidsPerEmployee = new Map(_kidsPerEmployee);

    //set only non-zero rows
    const cbReadSchools = function (rows: string[][]) {
        const imported = rows.filter((row) => row[1] !== "0" && row[0] !== "").map((row) => [row[0], parseInt(row[1])] as [string, number]);
        setKidsPerSchool(imported);
        setMessage(`${imported.length} Schulen aus aktualisiert`)
    }

    //set only non-zero rows
    const cbReadEmpl = function (rows: string[][]) {
        setkidsPerEmployee(rows.filter((row) => row[0] !== "" && row[2] !== "0").map((row) => [row[0], { min: parseInt(row[1]), max: parseInt(row[2]) }]));
        setMessage("Mitarbeiter aktualisiert")
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
            <Grid item xs={12}>
            </Grid>
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
            {props.selectedScenarioId !== undefined && <>
                <Grid item xs={12}>
                    <h2>{props.selectedScenarioId}</h2>
                    <div>Kinder gesamt: {props.schools.map(s => kidsPerSchool.get(s[0]) || 0).reduce((acc, cur) => acc + cur, 0)}</div>
                    <div>Kinder Assistent (min/max): {props.employees.filter((e) => e.type === 'Assistent').map(e => kidsPerEmployee.get(e.id)?.min || 0).reduce((acc, cur) => acc + cur, 0)} / {props.employees.filter((e) => e.type === "Assistent").map(e => kidsPerEmployee.get(e.id)?.max || 0).reduce((acc, cur) => acc + cur, 0)}</div>
                    <div>Kinder Arzt (min/max): {props.employees.filter((e) => e.type === 'Arzt').map(e => kidsPerEmployee.get(e.id)?.min || 0).reduce((acc, cur) => acc + cur, 0)} / {props.employees.filter((e) => e.type === "Arzt").map(e => kidsPerEmployee.get(e.id)?.max || 0).reduce((acc, cur) => acc + cur, 0)}</div>
                </Grid>
                <Grid item xs={6}>
                    <MyGrid<{ id: string, name: string, kids: number }>
                        data={props.schools.map(s => ({ id: s[0], name: s[1], kids: kidsPerSchool.get(s[0]) || 0 }))}
                        getId={(row) => row.id}
                        columns={[
                            { field: 'name', headerName: 'Name', width: 250 },
                            { field: 'kids', headerName: 'Kinder', width: 250 }
                        ]}
                        updateFromCSV={cbReadSchools}
                        asCSV={{data: props.schools.map(s => [s[0], (kidsPerSchool.get(s[0]) || 0).toString()]), name: `schulen-${props.selectedScenarioId}.csv`}}
                        settings={props.settings}
                    />
                </Grid>
                <Grid item xs={6}>
                    <MyGrid<{ id: string, name: string, min: number, max: number }>
                        data={props.employees.map(e => ({ id: e.id, name: e.name, min: kidsPerEmployee.get(e.id)?.min || 0, max: kidsPerEmployee.get(e.id)?.max || 0 }))}
                        getId={(row) => row.id}
                        columns={[
                            { field: 'name', headerName: 'Personal', width: 350 },
                            { field: 'min', headerName: 'Min', width: 150 },
                            { field: 'max', headerName: 'Max', width: 150 }
                        ]}
                        updateFromCSV={cbReadEmpl}
                        asCSV={{data: props.employees.map(e => [e.id, (kidsPerEmployee.get(e.id)?.min || 0).toString(), (kidsPerEmployee.get(e.id)?.max || 0).toString()]), name: `personal-${props.selectedScenarioId}.csv`}}
                        settings={props.settings}
                    />
                </Grid>
            </>
            }
        </Grid>
    </>)
}