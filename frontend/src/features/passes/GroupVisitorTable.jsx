import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";

export default function GroupVisitorTable({ rows, onChangeRow, onAddRow, onRemoveRow }) {
  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "32%" }}>Visitor Name</TableCell>
              <TableCell sx={{ width: "28%" }}>NIC Number</TableCell>
              <TableCell sx={{ width: "28%" }}>Contact Number</TableCell>
              <TableCell sx={{ width: "12%" }}>Pass No</TableCell>
              <TableCell sx={{ width: 56 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell>
                  <TextField size="small" fullWidth value={row.visitor_name} onChange={(e) => onChangeRow(row.id, { visitor_name: e.target.value })} placeholder={`Visitor ${index + 1}`} />
                </TableCell>
                <TableCell>
                  <TextField size="small" fullWidth value={row.nic_number} onChange={(e) => onChangeRow(row.id, { nic_number: e.target.value.toUpperCase() })} placeholder="NIC" />
                </TableCell>
                <TableCell>
                  <TextField size="small" fullWidth value={row.contact_number} onChange={(e) => onChangeRow(row.id, { contact_number: e.target.value })} placeholder="Contact" />
                </TableCell>
                <TableCell>
                  <TextField size="small" fullWidth value={row.pass_no || `AUTO-${String(index + 1).padStart(3, "0")}`} InputProps={{ readOnly: true }} />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => onRemoveRow(row.id)} disabled={rows.length === 1} aria-label="remove visitor">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Stack direction="row" spacing={1}>
        <Button startIcon={<AddIcon />} onClick={onAddRow} variant="outlined">Add Row</Button>
      </Stack>
    </Stack>
  );
}
