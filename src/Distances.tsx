import { Button } from "@mui/material";

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
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

export function DistanceComp(props: {d1: [string,number,number][], d2: [string,number,number][], data: Distances, setDistances: (distances: Distances) => void}) {
    return <div className='tab-distances'>
        <Button variant="contained" onClick={() => {
            const newDistances: Distances = {
                dim1: props.d1.map(s => [s[2], s[1]]),
                dim2: props.d2.map(s => [s[2], s[1]]),
                data: props.d1.map(s => props.d2.map(p => getDistanceFromLatLonInKm(s[1], s[2], p[1], p[2])))
            };
            props.setDistances(newDistances);
        }}>Berechne Luftlinie</Button>
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
                    {props.d2.map((s, id2) => <td key={id2}>{Math.round(props.data.data[id1][id2]*10)/10}</td>)}
                </tr>)} 
            </tbody>
        </table>
    </div>
}