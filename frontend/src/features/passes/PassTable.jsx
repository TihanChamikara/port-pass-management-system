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

const VISITOR_CATEGORY_OPTIONS = [
  "Internal Visitor (CWIT Staff)",
  "Port User Visitor (Port Agents, Port-related Organizations)",
  "Contractor/Vendor (Project/Maintenance Workers)",
  "Government Official (Customs/Navy/Police/MEPA/CEA/Health Services/Labour Department/SLPA)",
  "VIP/Official Visitor",
  "Business Visitor",
  "Department Visitor",
  "Educational Visit",
  "General External Visitor",
  "Other",
];
const VISIT_AREA_OPTIONS = [
  "Onboard Vessel",
  "Wharf Area / Quay Side",
  "Yard Area",
  "Gate Complex",
  "Container Inspection Area",
  "Empty Container Yard",
  "Reefer Monitoring Area",
  "POB",
  "Pass Office & Security Building",
  "Wharf Building",
  "OHS Building",
  "DG Station",
  "Workshop / Maintenance Facility",
];
const ACCESS_OPTIONS = ["Single Zone", "Multiple Zones", "All Zones"];

const getStatusColor = (status) => {
  switch (status) {
    case "completed": return "success";
    case "active": return "warning";
    case "expired": return "error";
    default: return "default";
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
          <FormControl size="small" sx={{ minWidth: 180, maxWidth: 240 }}>
            <InputLabel>Visitor Category</InputLabel>
            <Select
              value={filters.visitor_category || ""}
              label="Visitor Category"
              onChange={(e) => onFilterChange("visitor_category", e.target.value)}
            >
              <MenuItem value=""><em>All</em></MenuItem>
              {VISITOR_CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160, maxWidth: 220 }}>
            <InputLabel>Visit Area</InputLabel>
            <Select
              value={filters.visit_area || ""}
              label="Visit Area"
              onChange={(e) => onFilterChange("visit_area", e.target.value)}
            >
              <MenuItem value=""><em>All</em></MenuItem>
              {VISIT_AREA_OPTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Visitor Type</InputLabel>
            <Select
              value={filters.visitor_type || ""}
              label="Visitor Type"
              onChange={(e) => onFilterChange("visitor_type", e.target.value)}
            >
              <MenuItem value=""><em>All</em></MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="vip">VIP</MenuItem>
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
                <TableCell>Visitor Category</TableCell>
                <TableCell>Visit Area</TableCell>
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
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.sr_no}</TableCell>
                      <TableCell>{row.pass_no}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <span>{row.visitor_name}</span>
                          {row.visitor_type === 'vip' && (
                            <Chip label="VIP" size="small" color="secondary" sx={{ height: 20, fontSize: '0.7rem' }} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{row.company_name}</TableCell>
                      <TableCell>{row.nic_number}</TableCell>
                      <TableCell>{row.contact_number}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        {row.visitor_category ? (
                          <Typography variant="body2" title={row.visitor_category} noWrap>
                            {row.visitor_category}
                          </Typography>
                        ) : "-"}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        {row.visit_area?.length ? (
                          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                            {row.visit_area.map((area) => (
                              <Chip key={area} label={area} size="small" variant="outlined" color="primary" />
                            ))}
                          </Stack>
                        ) : "-"}
                      </TableCell>
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
