import { Button } from "@mui/material";

function getDistanceFromLatLonInKm(lon1: number, lat1: number, lon2: number, lat2: number) {
    var R = 6371 * 1000; // Radius of the earth in m
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in m
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

//the distance array is indexed by coordinates in rows (dim1) and columns (dim2)
export type Distances = {
  dim1: [number,number][],
  dim2: [number,number][],
  data: number[][]
}


export function DistanceComp(props: {
    d1: [string,[number,number]][], 
    d2: [string,[number,number]][], 
    data: Distances, 
    setDistances: (distances: Distances) => void,
    orsApiKey: string | undefined}) {

    const calculateWithORS = function() {
        const makeRange = function(from: number, to: number) {
            let result = [];
            for (let i = from; i < to; i++) {
                result.push(i);
            }
            return result;
        }
        
        //destinations and sources are indices into the locations array
        const body = {
            locations: props.d1.map(s => s[1]).concat(props.d2.map(s => s[1])),
            sources: makeRange(0, props.d1.length),
            destinations: makeRange(props.d1.length, props.d1.length + props.d2.length),
            metrics: ["distance"],
            units: "m",
            resolve_locations: false
        };

        //result is in response.distances; outer array is sources, inner arrays are destinations
        fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json; charset=utf-8',
                'Content-Type': 'application/json',
                'Authorization': props.orsApiKey ?? ''
            },
            body: JSON.stringify(body)
        }).then(response => response.json()).then(response => {
            const newDistances: Distances = {
                dim1: props.d1.map(s => s[1]),
                dim2: props.d2.map(s => s[1]),
                data: response.distances
            };
            props.setDistances(newDistances);
        });
    }

    const calcDirect = function() {
            const newDistances: Distances = {
                dim1: props.d1.map(s => s[1]),
                dim2: props.d2.map(s => s[1]),
                data: props.d1.map(s => props.d2.map(p => getDistanceFromLatLonInKm(s[1][0], s[1][1], p[1][0], p[1][1])))
            };
            props.setDistances(newDistances);
    }

    return <div className='tab-distances'>
        <Button variant="contained" onClick={calcDirect}>Berechne Luftlinie</Button>
        <Button variant="contained" onClick={calculateWithORS} disabled={props.orsApiKey === undefined}>OpenRoute Service</Button>
        <table>
            <thead>
                <tr>
                    <th></th>
                    {props.d2.map((s, id) => <th key={id}>{s[0]}</th>)}
                </tr>
            </thead>
            <tbody>
                {props.d1.map((p, id1) => <tr key={id1}>
                    <th>{p[0]}</th>
                    {props.d2.map((s, id2) => <td key={id2}>{Math.round((props.data.data.at(id1)?.at(id2) ?? 0)/100)/10}</td>)}
                </tr>)} 
            </tbody>
        </table>
    </div>
}