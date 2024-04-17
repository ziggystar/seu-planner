import { Button, Card, CardContent, CardHeader, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import GLPKConstructor, { GLPK, Result, LP } from 'glpk.js';
import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography, Line } from 'react-simple-maps';
import { Employee, School } from './types';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { Settings } from './Settings';


export function Optimizer(props: {
    selectedScenarioId: string | undefined,
    schools: { master: School, children: number }[],
    employees: { master: Employee, minChildren: number, maxChildren: number }[],
    preAssigned: [School, Employee][],
    distances: number[][],
    settings: Settings
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
    const makeVar = (s: School, e: Employee) => `x_${s.id}_${e.id}`

    function result(r: Result, s: School, e: Employee): number {
        switch (props.settings.modelType) {
            case 'AssignChildren':
                return r.result.vars[makeVar(s, e)];
            case 'AssignSchools':
                return r.result.vars[makeVar(s, e)] * props.schools.find((ss) => ss.master.id === s.id)!.children;
        }
    }


    useEffect(() => {
        if (glpk) {
            const seen = new Set();
            const duplicates = new Set();

            props.schools.forEach((s) => {
                props.employees.forEach((e) => {
                    const varName = makeVar(s.master, e.master);
                    if (seen.has(varName)) {
                        duplicates.add(varName);
                    } else {
                        seen.add(varName);
                    }
                });
            });

            if (duplicates.size > 0) console.error("Duplicate combinations:", Array.from(duplicates));

            console.log("constructing problem with mode " + props.settings.modelType)
            const problem: LP = props.settings.modelType === 'AssignChildren'
                ? {
                    name: "SEU Planung assign children",
                    objective: {
                        direction: glpk.GLP_MIN,
                        name: "distance",
                        vars: props.schools.map((s, id) =>
                            props.employees.map((e, id2) =>
                                ({ name: makeVar(s.master, e.master), coef: props.distances[id][id2] })
                            )).flat()
                    },
                    subjectTo:
                        (
                            //assign enough Arzt to schools
                            props.schools.map((s) => ({
                                name: `sc_arzt_${s.master.id}`,
                                vars: props.employees.filter((e) => e.master.type === 'Arzt').map((e) => ({ name: makeVar(s.master, e.master), coef: 1 })),
                                bnds: { type: glpk.GLP_FX, lb: s.children, ub: s.children }
                            }))
                        ).concat(
                            //assign enough Assistent to schools
                            props.schools.map((s) => ({
                                name: `sc_assistent_${s.master.id}`,
                                vars: props.employees.filter((e) => e.master.type === 'Assistent').map((e) => ({ name: makeVar(s.master, e.master), coef: 1 })),
                                bnds: { type: glpk.GLP_FX, lb: s.children, ub: s.children }
                            }))
                        ).concat(
                            //assignemnt enough children to employees
                            props.employees.map((e) => ({
                                name: `emp_eq_${e.master.id}`,
                                vars: props.schools.map((s) => ({ name: makeVar(s.master, e.master), coef: 1 })),
                                bnds: e.minChildren < e.maxChildren ? { type: glpk.GLP_DB, lb: e.minChildren, ub: e.maxChildren } : { type: glpk.GLP_FX, lb: e.minChildren, ub: e.minChildren }
                            }))
                        ).concat(
                            //preassignments are treated as lower bounds
                            props.preAssigned.map(([s, e]) => ({
                                name: `preassign_${s.id}_${e.id}`,
                                vars: [{ name: makeVar(props.schools.find((xs) => xs.master.id === s.id)!.master, props.employees.find((xe) => xe.master.id === e.id)!.master), coef: 1 }],
                                bnds: { type: glpk.GLP_LO, lb: props.schools.find((xs) => xs.master.id === s.id)!.children, ub: 1000000 }
                            }))
                        )
                }
                : {
                    name: "SEU Planung assign schools",
                    objective: {
                        direction: glpk.GLP_MIN,
                        name: "distance",
                        vars: props.schools.map((s, id) =>
                            props.employees.map((e, id2) =>
                                ({ name: makeVar(s.master, e.master), coef: props.distances[id][id2] * s.children })
                            )).flat()
                    },
                    subjectTo:
                        (
                            //assign enough Arzt to schools
                            props.schools.map((s) => ({
                                name: `sc_arzt_${s.master.id}`,
                                vars: props.employees.filter((e) => e.master.type === 'Arzt').map((e) => ({ name: makeVar(s.master, e.master), coef: s.children })),
                                bnds: { type: glpk.GLP_FX, lb: s.children, ub: s.children }
                            }))
                        ).concat(
                            //assign enough Assistent to schools
                            props.schools.map((s) => ({
                                name: `sc_assistent_${s.master.id}`,
                                vars: props.employees.filter((e) => e.master.type === 'Assistent').map((e) => ({ name: makeVar(s.master, e.master), coef: s.children })),
                                bnds: { type: glpk.GLP_FX, lb: s.children, ub: s.children }
                            }))
                        ).concat(
                            //assign enough children to employees
                            props.employees.map((e) => ({
                                name: `emp_eq_${e.master.id}`,
                                vars: props.schools.map((s) => ({ name: makeVar(s.master, e.master), coef: s.children })),
                                bnds: e.minChildren < e.maxChildren ? { type: glpk.GLP_DB, lb: e.minChildren, ub: e.maxChildren } : { type: glpk.GLP_FX, lb: e.minChildren, ub: e.minChildren }
                            }))
                        ).concat(
                            //preassignments are treated as lower bounds
                            props.preAssigned.map(([s, e]) => ({
                                name: `preassign_${s.id}_${e.id}`,
                                vars: [{ name: makeVar(props.schools.find((xs) => xs.master.id === s.id)!.master, props.employees.find((xe) => xe.master.id === e.id)!.master), coef: 1 }],
                                bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
                            }))
                        ),
                    binaries: props.schools.flatMap((s) => props.employees.map((e) => makeVar(s.master, e.master)))

                }
            console.debug("setting problem", problem)
            setProblem(problem)
        }
    }, [glpk, props.schools, props.employees, props.distances, props.preAssigned, props.settings])

    const solve = (glpk: GLPK, problem: LP) => {
        console.log("solving", problem);
        (glpk.solve(problem) as any).then((r: Result) => {
            console.log("solved: " + r.result.toString())
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
                children: result(sol, s.master, e.master),
                distance: (dist[id2][id] / 1000).toFixed(1),
            }))
        ).flat().filter((r) => r.children !== 0);

        // Prepare the columns data
        const columns = [
            { field: 'school', headerName: 'Schule', width: 350 },
            { field: 'employee', headerName: 'Mitarbeiter', width: 200 },
            { field: 'children', headerName: 'Kinder', width: 100 },
            { field: 'distance', headerName: 'km', width: 100, description: 'Einfache Entfernung in km' },
        ];

        return <DataGrid rows={rows} columns={columns} slots={{ toolbar: GridToolbar }} rowSelection={false} />
    }

    //employee table has one row per employee, showing total number of children and average distance per child
    const employeeTable = function (sol: Result, dist: number[][]) {
        // Prepare the rows data
        const rows = props.employees.map((e, id) => {
            const children = props.schools.map((s, id2) => result(sol, s.master, e.master)).reduce((a, b) => a + b, 0);
            const distance = props.schools.map((s, id2) => result(sol, s.master, e.master) * dist[id2][id]).reduce((a, b) => a + b, 0);
            return {
                id: e.master.id, // unique id for each row
                employee: e.master.id,
                minChilren: e.minChildren,
                maxChildren: e.maxChildren,
                children: children,
                avgDistance: (distance / children / 1000).toFixed(1),
                status: { min: e.minChildren, max: e.maxChildren, children: children }
            }
        }).filter((x) => x.children > 0);

        // Prepare the columns data
        const columns: GridColDef[] = [
            { field: 'employee', headerName: 'Mitarbeiter', width: 200 },
            { field: 'minChilren', headerName: 'Min', width: 100 },
            { field: 'maxChildren', headerName: 'Max', width: 100 },
            { field: 'children', headerName: 'Kinder', width: 100 },
            { field: 'avgDistance', headerName: 'Ø km', width: 100, description: 'Durschnittliche Entfernung (einfach) gewichtet nach Anzahl Kinder in km' },
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
                <Card>
                    <CardHeader title="Optimierungsergebnis" />
                    <CardContent>
                        <Typography variant="body1">
                            Optimal: {
                                (solution.result.status === glpk?.GLP_NOFEAS && "unlösbar") ||
                                (solution.result.status === glpk?.GLP_FEAS && "lösbar") ||
                                (solution.result.status === glpk?.GLP_UNDEF && "undefiniert") ||
                                (solution.result.status === glpk?.GLP_OPT && "optimal") ||
                                (solution.result.status === glpk?.GLP_UNBND && "nicht begrenzt")
                            }
                        </Typography>
                        <Typography>Zeit: {solution.time}</Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader title="Übersicht Personal" />
                    <CardContent>
                        {employeeTable(solution, props.distances)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader title="Lösung" />
                    <CardContent>
                        {solutionTable(solution, props.distances)}
                    </CardContent>
                </Card>
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
        {
            //output all variable assignments of the LP in a table
            solution && <Grid item xs={12}>
                <h3>Variable Assignments</h3>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>School</TableCell>
                                <TableCell>Employee</TableCell>
                                <TableCell>Assignment</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {props.schools.map((s) =>
                                props.employees.map((e) => {
                                    const assignment = solution.result.vars[`x_${s.master.id}_${e.master.id}`];
                                    if (assignment > 0) {
                                        return (
                                            <TableRow key={`${s.master.id}_${e.master.id}`}>
                                                <TableCell>{s.master.id}</TableCell>
                                                <TableCell>{e.master.id}</TableCell>
                                                <TableCell>{assignment}</TableCell>
                                            </TableRow>
                                        );
                                    }
                                    return null;
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>
        }
    </Grid>
}