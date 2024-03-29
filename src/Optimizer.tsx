import { Button, Grid } from '@mui/material';
import GLPKConstructor, { GLPK, Result, LP } from 'glpk.js';
import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography, Line } from 'react-simple-maps';
import { Employee, School } from './types';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import React from 'react';
import { ModelType } from './Settings';


export function Optimizer(props: {
    selectedScenarioId: string | undefined,
    schools: { master: School, children: number }[],
    employees: { master: Employee, minChildren: number, maxChildren: number }[],
    distances: number[][],
    modelType: ModelType
}) {
    const [glpk, setGlpk] = useState<GLPK | undefined>(undefined)

    useEffect(() => {
        (GLPKConstructor() as any).then(setGlpk)
    }, [])


    const [solution, setSolution] = useState<Result | undefined>(undefined)

    const [problem, setProblem] = useState<LP | undefined>(undefined)

    /*
    A school is always visited by an Arzt and an Assistent, and both examine the children together.
    Employees must be assigned to schools in a way that the number of children is between minChildren and maxChildren.
    We want to minimize the distance traveled by the employees.
    Usually, we would have to solve this as a mixed integer program, but we can relax the integer constraints and solve it as a linear program.
    */
    const makeVar = (s: { master: School, children: number }, e: { master: Employee, minChildren: number, maxChildren: number }) => `x_${s.master.id}_${e.master.id}`

    useEffect(() => {
        if (glpk) {
            const seen = new Set();
            const duplicates = new Set();

            props.schools.forEach((s) => {
                props.employees.forEach((e) => {
                    const varName = makeVar(s, e);
                    if (seen.has(varName)) {
                        duplicates.add(varName);
                    } else {
                        seen.add(varName);
                    }
                });
            });

            if (duplicates.size > 0) console.error("Duplicate combinations:", Array.from(duplicates));

            const problem: LP = {
                name: "SEU Planung",
                objective: {
                    direction: glpk.GLP_MIN,
                    name: "distance",
                    vars: props.schools.map((s, id) =>
                        props.employees.map((e, id2) =>
                            ({ name: makeVar(s, e), coef: props.distances[id][id2] })
                        )).flat()
                },
                subjectTo:
                    (
                        //assign enough Arzt to schools
                        props.schools.map((s) => ({
                            name: `sc_arzt_${s.master.id}`,
                            vars: props.employees.filter((e) => e.master.type === 'Arzt').map((e) => ({ name: makeVar(s, e), coef: 1 })),
                            bnds: { type: glpk.GLP_FX, lb: s.children, ub: s.children }
                        }))
                    ).concat(
                        //assign enough Assistent to schools
                        props.schools.map((s) => ({
                            name: `sc_assistent_${s.master.id}`,
                            vars: props.employees.filter((e) => e.master.type === 'Assistent').map((e) => ({ name: makeVar(s, e), coef: 1 })),
                            bnds: { type: glpk.GLP_FX, lb: s.children, ub: s.children }
                        }))
                    ).concat(
                        //assignemnt enough children to employees
                        props.employees.map((e) => ({
                            name: `emp_eq_${e.master.id}`,
                            vars: props.schools.map((s) => ({ name: makeVar(s, e), coef: 1 })),
                            bnds: { type: glpk.GLP_DB, lb: e.minChildren, ub: e.maxChildren }
                        }))
                    )
            }
            console.debug("setting problem", problem)
            setProblem(problem)
        }
    }, [glpk, props.schools, props.employees, props.distances])

    const solve = (glpk: GLPK, problem: LP) => {
        console.log("solving", problem);
        (glpk.solve(problem) as any).then((r: Result) => {
            console.log(r)
            setSolution(r)
        })
    }

    //solution table has one row per variable
    const solutionTable = function (sol: Result, dist: number[][]) {
        // Prepare the rows data
        const rows = props.employees.map((e, id) =>
            props.schools.map((s, id2) => ({
                id: s.master.id + e.master.id, // unique id for each row
                school: s.master.id,
                employee: e.master.id,
                children: sol.result.vars[makeVar(s, e)],
                distance: dist[id2][id].toFixed(1),
            }))
        ).flat().filter((r) => r.children !== 0);

        // Prepare the columns data
        const columns = [
            { field: 'school', headerName: 'Schule', width: 350 },
            { field: 'employee', headerName: 'Mitarbeiter', width: 200 },
            { field: 'children', headerName: 'Kinder', width: 100 },
            { field: 'distance', headerName: 'Entfernung', width: 100 },
        ];

        return <DataGrid rows={rows} columns={columns} slots={{ toolbar: GridToolbar }} rowSelection={false} />
    }

    //employee table has one row per employee, showing total number of children and average distance per child
    const employeeTable = function (sol: Result, dist: number[][]) {
        // Prepare the rows data
        const rows = props.employees.map((e, id) => {
            const children = props.schools.map((s, id2) => sol.result.vars[makeVar(s, e)]).reduce((a, b) => a + b, 0);
            const distance = props.schools.map((s, id2) => sol.result.vars[makeVar(s, e)] * dist[id2][id]).reduce((a, b) => a + b, 0);
            return {
                id: e.master.id, // unique id for each row
                employee: e.master.id,
                minChilren: e.minChildren,
                maxChildren: e.maxChildren,
                children: children,
                avgDistance: (distance / children).toFixed(1),
                status: { min: e.minChildren, max: e.maxChildren, children: children }
            }
        });

        // Prepare the columns data
        const columns: GridColDef[] = [
            { field: 'employee', headerName: 'Mitarbeiter', width: 200 },
            { field: 'minChilren', headerName: 'Min', width: 100 },
            { field: 'maxChildren', headerName: 'Max', width: 100 },
            { field: 'children', headerName: 'Kinder', width: 100 },
            { field: 'avgDistance', headerName: 'Entfernung/Kind', width: 100 },
            //show a slider that illustrates where the assigned number of children is in the range
            {
                field: 'status',
                headerName: 'Status',
                width: 200,
                renderCell: (params) => {
                    const status = params.value as { min: number, max: number, children: number };
                    return <input type="range" min={status.min} max={status.max} value={status.children} disabled={true} />
                }
            }
        ];

        return <DataGrid rows={rows} columns={columns} slots={{ toolbar: GridToolbar }} rowSelection={false} />
    }

    return <Grid container>
        <Grid item xs={12}>
            {<p>{props.selectedScenarioId}</p>}
            <Button disabled={glpk === undefined || problem === undefined} onClick={() => { problem && glpk && solve(glpk, problem) }}>Optimiere</Button>
        </Grid>
        <Grid item xs={12}>
            {solution && <div>
                <h2>Optimierungsergebnis</h2>
                <p>Optimal: {solution.result.status}</p>
                <p>Zeit: {solution.time}</p>
                <h3>Übersicht Personal</h3>
                <Button disabled={true}>Kopieren</Button>
                {employeeTable(solution, props.distances)}
                <h3>Vollständige Zuweisung</h3>
                <Button disabled={true}>Kopieren</Button>
                {solutionTable(solution, props.distances)}
            </div>}
        </Grid>
        {
            solution && <Grid item xs={12}>
                <ComposableMap
                    width={800}
                    height={600}
                    projectionConfig={{
                        center: [9.2, 50.2],
                        scale: 50000
                    }}>
                    <Geographies geography={"res/gemeinden_simplify20.topojson"}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                return < Geography key={geo.rsmKey} geography={geo} fill="#f7f7f7" stroke="#aaa" />
                            })
                        }
                    </Geographies>
                    {
                        props.schools.map((s) =>
                            props.employees.map((e) => ({ s: s, e: e, val: solution.result.vars[`x_${s.master.id}_${e.master.id}`] })))
                            .flat()
                            .filter((r) => r.val > 0)
                            .map((r) => {
                                console.log(r)
                                return <Line strokeWidth={1} color={r.e.master.type === "Arzt" ? "#a559" : "#55a9"} key={`${r.s.master.id}_${r.e.master.id}`} from={[r.e.master.lon, r.e.master.lat]} to={[r.s.master.lon, r.s.master.lat]} />
                            }
                            )
                    }
                </ComposableMap>
            </Grid>
        }
    </Grid>
}