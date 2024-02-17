import TSV from 'tsv';

import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { Grid } from '@mui/material';

export type ColumnDef<T> = {
    name: string,
    get: (row: T) => string
}

export function CrudTab<T>(props: {
    data: T[],
    updateAll: (data: T[]) => void,
    parseCsvRow: (row: string[]) => T,
    columns: GridColDef[],
    getId: (row: T) =>  string,
    coords: (row: T) => [number, number],
    mapColor: string | ((row: T) => string)
}) {

    return <Grid container rowSpacing={1} columnSpacing={1}>
        <Grid item xs={2}>
            <input type="file" accept=".csv" onChange={event => {
                if (event.target.files) {
                    const file = event.target.files[0];
                    const reader = new FileReader();
                    reader.onload = event => {
                        if (event.target) {
                            const parser = new TSV.Parser("\t", { header: false });
                            const data = parser.parse(event.target.result as string);
                            const newData = data.map(props.parseCsvRow);
                            props.updateAll(newData);
                        }
                    }
                    reader.readAsText(file);
                }
            }} />
        </Grid>
        <Grid item xs={10}>
            <DataGrid
                rows={props.data}
                columns={props.columns}
                onRowClick={(row) => console.log(row)}
            />
        </Grid>

        <Grid item xs={12}>
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
                    props.data.map((row, id) =>
                        <Marker key={id} coordinates={props.coords(row)}>
                            <circle r={2} fill={typeof props.mapColor === "string" ? props.mapColor : props.mapColor(row)} />
                            <text textAnchor='left' fontSize={7} dx={3}>
                                {props.getId(row)}
                            </text>
                        </Marker>)
                }
            </ComposableMap>
        </Grid>
    </Grid>
}