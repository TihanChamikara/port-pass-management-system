import {
  Box,
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

const ZONE_OPTIONS = ["Zone 1", "Zone 2", "Zone 3", "Zone 4"];
const TYPE_OPTIONS = ["blue", "red", "orange", "green", "purple"];
const ACCESS_OPTIONS = ["Single Zone", "Multiple Zones", "All Zones"];

const getStatusColor = (status) => {
  switch (status) {
    case "completed": return "success";
    case "active": return "warning";
    case "expired": return "error";
    default: return "default";
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case "green": return { color: "#16A34A", bg: "rgba(22, 163, 74, 0.1)" };
    case "blue": return { color: "#2563EB", bg: "rgba(37, 99, 235, 0.1)" };
    case "red": return { color: "#DC2626", bg: "rgba(220, 38, 38, 0.1)" };
    case "orange": return { color: "#EA580C", bg: "rgba(234, 88, 12, 0.1)" };
    case "purple": return { color: "#9333EA", bg: "rgba(147, 51, 234, 0.1)" };
    default: return { color: "#6B7280", bg: "rgba(107, 114, 128, 0.1)" };
  }
};

export default function PassTable({ data, loading, filters, onFilterChange, onCheckout, onPrint, onPageChange }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={3}>
        {/* Filters */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Search (Name / NIC / Pass No)"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Zone</InputLabel>
            <Select
              value={filters.zone}
              label="Zone"
              onChange={(e) => onFilterChange("zone", e.target.value)}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {ZONE_OPTIONS.map((z) => <MenuItem key={z} value={z}>{z}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Pass Type</InputLabel>
            <Select
              value={filters.pass_type}
              label="Pass Type"
              onChange={(e) => onFilterChange("pass_type", e.target.value)}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {TYPE_OPTIONS.map((t) => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Access Level</InputLabel>
            <Select
              value={filters.access_level}
              label="Access Level"
              onChange={(e) => onFilterChange("access_level", e.target.value)}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {ACCESS_OPTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            size="small"
            value={filters.target_date}
            onChange={(e) => onFilterChange("target_date", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              value={filters.sort}
              label="Sort"
              onChange={(e) => onFilterChange("sort", e.target.value)}
            >
              <MenuItem value="desc">Newest</MenuItem>
              <MenuItem value="asc">Oldest</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Table */}
        <TableContainer>
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
                  <TableCell colSpan={12} align="center">Loading...</TableCell>
                </TableRow>
              ) : data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">No passes found</TableCell>
                </TableRow>
              ) : (
                data.items.map((row) => {
                  const typeTheme = getTypeColor(row.pass_type);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.sr_no}</TableCell>
                      <TableCell>{row.pass_no}</TableCell>
                      <TableCell>{row.visitor_name}</TableCell>
                      <TableCell>{row.company_name}</TableCell>
                      <TableCell>{row.nic_number}</TableCell>
                      <TableCell>{row.contact_number}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${row.pass_type} - ${row.zone}`}
                          size="small"
                          sx={{ 
                            color: typeTheme.color, 
                            backgroundColor: typeTheme.bg,
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }} 
                        />
                      </TableCell>
                      <TableCell>{row.zone}</TableCell>
                      <TableCell>{new Date(row.issued_time).toLocaleString()}</TableCell>
                      <TableCell>{row.checkout_time ? new Date(row.checkout_time).toLocaleString() : "-"}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.status} 
                          size="small" 
                          color={getStatusColor(row.status)}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button 
                            size="small" 
                            variant="outlined" 
                            disabled={row.status === "completed" || !!row.checkout_time}
                            onClick={() => onCheckout(row.id)}
                            sx={{ minWidth: 'auto', textTransform: 'none' }}
                          >
                            Receive
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="body2" color="text.secondary">
            Total records: {data.total}
          </Typography>
          <Pagination 
            count={Math.ceil(data.total / filters.page_size) || 1} 
            page={filters.page} 
            onChange={(_, p) => onPageChange(p)} 
            color="primary"
          />
        </Box>
      </Stack>
    </Paper>
  );
}
