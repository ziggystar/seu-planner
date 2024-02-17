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


function parseSchoolCsvRow(row: string[]): School {
  const [id, name, lon, lat] = row;
  return { id, name, lon: parseFloat(lon), lat: parseFloat(lat) };
}


function parseEmployeeCsvRow(row: string[]): Employee {
  const [id, name, lon, lat, type] = row;
  return { id, name, lon: parseFloat(lon), lat: parseFloat(lat), type: type as EmployeeType };
}

function jsonEq(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function App() {
  //state for displayed tab
  const [tab, setTab] = React.useState(0);

  //master data for schools
  const [schools, setSchools] = useLocalStorage<School[]>("school.master.data", []);
  //master data for personnel
  const [personnel, setPersonnel] = useLocalStorage<Employee[]>("personnel.master.data", []);

  const [_distances, setDistances] = useLocalStorage<Distances>("distances", { dim1: [], dim2: [], data: [] });

  const distancesCalculated = jsonEq(_distances.dim1, schools.map(s => [s.lon, s.lat])) && jsonEq(_distances.dim2, personnel.map(p => [p.lon, p.lat]));

  const distances = distancesCalculated
    ? _distances
    : { dim1: schools.map(s => [s.lon, s.lat] as [number, number]), dim2: personnel.map(p => [p.lon, p.lat] as [number, number]), data: schools.map(s => personnel.map(p => 0))};

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
              d1={schools.map(s => [s.id, s.lat, s.lon])}
              d2={personnel.map(p => [p.id, p.lat, p.lon])}
              data={distances}
              setDistances={setDistances} />) ||
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
                schools={kidsPerSchool.map((s) => ({master: schools.find((sm) => sm.id === s[0])!, children: s[1]}))}
                employees={kidsPerEmployee.map((e) => ({master: personnel.find((em) => em.id === e[0])!, minChildren: e[1].min, maxChildren: e[1].max}))}
                distances={distances.data} />)
          }
        </Container>
      </main>
    </div>
  );
}

export default App;