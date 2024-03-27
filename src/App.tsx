import React from 'react';
import './App.css';

import { useLocalStorage } from 'usehooks-ts';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { CrudTab } from './CrudTab';
import { DistanceComp, Distances } from './Distances';
import { Scenario, ScenarioManager } from './Scenario';
import { GridColDef } from '@mui/x-data-grid';
import { Container } from '@mui/material';
import { Optimizer } from './Optimizer';
import { School, Employee, EmployeeType } from './types';
import { Settings, SettingsEditor } from './Settings';

function str2float(str: string): number {
  return parseFloat(str.replace(",", "."));
}

function parseSchoolCsvRow(row: string[]): School {
  const [id, name, lon, lat] = row;
  return { id, name, lon:str2float(lon), lat: str2float(lat) };
}

function parseEmployeeCsvRow(row: string[]): Employee {
  const [id, name, lon, lat, type] = row;
  return { id, name, lon: str2float(lon), lat: str2float(lat), type: type as EmployeeType };
}

function jsonEq(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function App() {
  //state for displayed tab
  const [tab, setTab] = React.useState(0);

  //settings
  const [settings, setSettings] = useLocalStorage<Settings>("settings", { openRoutServiceKey: undefined, modelType: "AssignChildren"});

  //master data for schools
  const [schools, setSchools] = useLocalStorage<School[]>("school.master.data", []);
  //master data for personnel
  const [personnel, setPersonnel] = useLocalStorage<Employee[]>("personnel.master.data", []);

  const [_distances, setDistances] = useLocalStorage<Distances>("distances", { dim1: [], dim2: [], data: [] });

  const distancesCalculated = jsonEq(_distances.dim1, schools.map(s => [s.lon, s.lat])) && jsonEq(_distances.dim2, personnel.map(p => [p.lon, p.lat]));

  const distances = distancesCalculated
    ? _distances
    : { dim1: schools.map(s => [s.lon, s.lat] as [number, number]), dim2: personnel.map(p => [p.lon, p.lat] as [number, number]), data: schools.map(s => personnel.map(p => 0)) };

  //column def for school table
  const schoolColumns: GridColDef[] = [
    { field: "id", headerName: "ID", type: "string", width: 200 },
    { field: "name", headerName: "Name", type: "string", width: 400 },
    { field: "lon", headerName: "Länge", type: "number", width: 100 },
    { field: "lat", headerName: "Breite", type: "number", width: 100 }
  ];

  //column def for personnel table
  const personnelColumns: GridColDef[] = [
    { field: "id", headerName: "ID", type: "string", width: 200 },
    { field: "name", headerName: "Name", type: "string", width: 400 },
    { field: "lon", headerName: "Länge", type: "number", width: 100 },
    { field: "lat", headerName: "Breite", type: "number", width: 100 },
    { field: "type", headerName: "Typ", type: "string", width: 150 }
  ];

  //scenarios
  const [scenarios, setScenarios] = useLocalStorage<Scenario[]>("scenarios", []);
  //active scenario
  const [selectedScenarioId, setSelectedScenarioId] = useLocalStorage<string | undefined>("selectedScenario", undefined);

  const [kidsPerSchool] = useLocalStorage<[string, number][]>(`scenario.${selectedScenarioId}.kidsPerSchool`, [])
  const [kidsPerEmployee] = useLocalStorage<[string, { min: number, max: number }][]>(`scenario.${selectedScenarioId}.kidsPerEmployee`, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>SEU Optimierung</h1>
      </header>
      <main>
        <Tabs value={tab} onChange={(_event, newValue) => setTab(newValue)}>
          <Tab label="Schulen" />
          <Tab label="Mitarbeiter" />
          <Tab label={distancesCalculated ? "Entfernungen" : "Entferungen (m)"} />
          <Tab label="Szenarien" />
          <Tab label="Optimierung" disabled={selectedScenarioId === undefined} />
          <Tab label="Einstellungen" />
        </Tabs>
        <Container maxWidth="xl">
          {
            (tab === 0 && <CrudTab<School>
              data={schools}
              columns={schoolColumns}
              updateAll={setSchools}
              parseCsvRow={parseSchoolCsvRow}
              getId={(row) => row.id}
              coords={(row) => [row.lon, row.lat]}
              mapColor="#666" />) ||
            (tab === 1 && <CrudTab<Employee>
              data={personnel}
              columns={personnelColumns}
              updateAll={setPersonnel}
              parseCsvRow={parseEmployeeCsvRow}
              getId={(row) => row.id}
              coords={(row) => [row.lon, row.lat]}
              mapColor={(e) => e.type === "Arzt" ? "#37a" : "#a73"} />) ||
            (tab === 2 && <DistanceComp
              d1={schools.map(s => [s.id, [s.lon, s.lat]])}
              d2={personnel.map(p => [p.id, [p.lon, p.lat]])}
              data={distances}
              setDistances={setDistances} 
              orsApiKey={settings.openRoutServiceKey}/>) ||
            (tab === 3 &&
              <ScenarioManager
                schools={schools.map(s => [s.id, s.name])}
                employees={personnel.map(p => [p.id, p.name])}
                scenarios={scenarios}
                setScenarios={setScenarios}
                selectedScenarioId={selectedScenarioId}
                setSelectedScenarioId={setSelectedScenarioId} />) ||
            (tab === 4 &&
              <Optimizer
                selectedScenarioId={selectedScenarioId}
                /* we need to include all items from the master arrays, because the distance matrix is based on them */
                schools={schools.map((s) => ({ master: s, children: kidsPerSchool.find((sm) => sm[0] === s.id)?.[1] ?? 0 }))}
                employees={personnel.map((e) => ({ master: e, minChildren: kidsPerEmployee.find((em) => em[0] === e.id)?.[1].min ?? 0, maxChildren: kidsPerEmployee.find((em) => em[0] === e.id)?.[1].max ?? 0 }))}
                distances={distances.data} 
                modelType={settings.modelType}/>) ||
            (tab === 5 &&
              <SettingsEditor settings={settings} setSettings={setSettings}/>)
          }
        </Container>
      </main>
    </div>
  );
}

export default App;