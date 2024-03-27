import React from 'react';
import { DataGrid, GridColDef, GridToolbarContainer, GridToolbarExport, GridValidRowModel } from '@mui/x-data-grid';
import { Button, Dialog, DialogContent, DialogTitle } from '@mui/material';
import TSV from 'tsv';


export type MyGridProps<T extends GridValidRowModel> = {
    data: T[],
    getId: (row: T) => string,
    columns: GridColDef<T>[],
    updateFromCSV?: (rows: string[][]) => void,
    asCSV?: {data: string[][], name: string}
}


export function MyGrid<T extends GridValidRowModel>(props: MyGridProps<T>) {
    const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
    //function to show dialog

    const [fileContent, setFileContent] = React.useState<string | undefined>();

    function parseCsvRow(input: string) {
        const parser = new TSV.Parser("\t", { header: false });
        const data = parser.parse(input.replace(/\r\n/g, "\n"));
        props.updateFromCSV?.(data);
    }

    var csvData = new Blob([(props.asCSV?.data ?? []).map((r) => r.join('\t')).join('\n')], {type: 'text/csv'});
    var csvURL = window.URL.createObjectURL(csvData);

    return <div>
        {props.asCSV !== undefined && 
            <Button href={csvURL} download={props.asCSV.name}>Download</Button>
            }
        <Button onClick={() => setUploadDialogOpen(true)}>Upload</Button>
        <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)}>
            <DialogTitle>Upload CSV</DialogTitle>
            <DialogContent>
                <input type="file" accept=".csv" onChange={event => {
                    if (event.target.files) {
                        const file = event.target.files[0];
                        const reader = new FileReader();
                        reader.onload = event => {
                            if (event.target) {
                                setFileContent(event.target.result as string)
                            }
                        }
                        reader.readAsText(file);
                    }
                }} />
            </DialogContent>
            <Button onClick={() => setUploadDialogOpen(false)}>Abbrechen</Button>
            <Button disabled={fileContent === undefined} onClick={() => {parseCsvRow(fileContent ?? ""); setUploadDialogOpen(false)}}>Ok</Button>
        </Dialog>
        <DataGrid<T>
            rows={props.data}
            columns={props.columns}
        />
    </div>
}