import {
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";

import { PASS_TYPES, ZONES, getPassTypeConfig, isAllAccess } from "../../utils/passTypes";

const zones = ["", ...ZONES];

function statusChip(status) {
  if (status === "active") return <Chip color="warning" size="small" label="Active" />;
  return <Chip color="success" size="small" label="Completed" />;
}

function passTypeChip(passType) {
  const config = getPassTypeConfig(passType);
  return (
    <Chip
      size="small"
      label={`${config.label}${isAllAccess(passType) ? " - ALL ACCESS" : ` - ${config.zone}`}`}
      sx={{ bgcolor: `${config.color}18`, color: config.color, fontWeight: 700 }}
    />
  );
}

export default function PassTable({
  data,
  loading,
  filters,
  onFilterChange,
  onCheckout,
  onPrint,
  onPageChange,
}) {
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Search (Name / NIC / Pass No)"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            fullWidth
          />
          <TextField select label="Zone" value={filters.zone} onChange={(e) => onFilterChange("zone", e.target.value)} sx={{ minWidth: 160 }}>
            {zones.map((zone) => (
              <MenuItem key={zone || "all"} value={zone}>
                {zone || "All Zones"}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Pass Type" value={filters.pass_type} onChange={(e) => onFilterChange("pass_type", e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All Types</MenuItem>
            {PASS_TYPES.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Access Level" value={filters.access_level} onChange={(e) => onFilterChange("access_level", e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All Levels</MenuItem>
            <MenuItem value="single">Single Zone</MenuItem>
            <MenuItem value="all">All Access</MenuItem>
          </TextField>
          <TextField
            label="Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filters.target_date}
            onChange={(e) => onFilterChange("target_date", e.target.value)}
          />
          <TextField select label="Sort" value={filters.sort} onChange={(e) => onFilterChange("sort", e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="desc">Newest</MenuItem>
            <MenuItem value="asc">Oldest</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SR No</TableCell>
              <TableCell>Pass No</TableCell>
              <TableCell>Visitor</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>NIC</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Zone</TableCell>
              <TableCell>Issued</TableCell>
              <TableCell>Received</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12}>Loading...</TableCell>
              </TableRow>
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12}>No records found.</TableCell>
              </TableRow>
            ) : (
              data.items.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    backgroundColor: row.pass_type === "purple" ? "rgba(124,58,237,0.08)" : row.status === "active" ? "rgba(245,158,11,0.08)" : "transparent",
                  }}
                >
                  <TableCell>{row.sr_no}</TableCell>
                  <TableCell>{row.pass_no}</TableCell>
                  <TableCell>{row.visitor_name}</TableCell>
                  <TableCell>{row.company_name}</TableCell>
                  <TableCell>{row.nic_number}</TableCell>
                  <TableCell>{row.contact_number}</TableCell>
                  <TableCell>{passTypeChip(row.pass_type)}</TableCell>
                  <TableCell>{row.pass_type === "purple" ? "ALL ACCESS" : row.zone}</TableCell>
                  <TableCell>{dayjs(row.issued_time).format("YYYY-MM-DD HH:mm")}</TableCell>
                  <TableCell>{row.received_time ? dayjs(row.received_time).format("YYYY-MM-DD HH:mm") : "-"}</TableCell>
                  <TableCell>{statusChip(row.status)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={() => onPrint(row)}>
                        Print
                      </Button>
                      <Button size="small" variant="outlined" disabled={row.status !== "active"} onClick={() => onCheckout(row.id)}>
                        Receive
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2">
          Total records: {data.total}
        </Typography>
        <Pagination
          count={Math.max(1, Math.ceil(data.total / data.page_size))}
          page={data.page}
          onChange={(_, page) => onPageChange(page)}
          color="primary"
        />
      </Stack>
    </Stack>
  );
}
