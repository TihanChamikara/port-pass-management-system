import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import { useEffect, useState } from "react";

const PASS_TYPES = [
  { value: "blue", label: "Blue", color: "#2563EB" },
  { value: "red", label: "Red", color: "#DC2626" },
  { value: "orange", label: "Orange", color: "#EA580C" },
  { value: "green", label: "Green", color: "#16A34A" },
  { value: "purple", label: "Purple", color: "#9333EA" },
];

const ZONE_OPTIONS = ["Zone 1", "Zone 2", "Zone 3", "Zone 4"];

export default function PassFormDialog({ open, onClose, onSubmit, loading, nextSrNo }) {
  const [formData, setFormData] = useState({
    pass_type: "blue",
    sr_no: "",
    pass_no: "",
    zone: "Zone 1",
    visitor_name: "",
    company_name: "",
    nic_number: "",
    contact_number: "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        pass_type: "blue",
        sr_no: nextSrNo || "",
        pass_no: "",
        zone: "Zone 1",
        visitor_name: "",
        company_name: "",
        nic_number: "",
        contact_number: "",
      });
    }
  }, [open, nextSrNo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeSelect = (typeValue) => {
    setFormData((prev) => ({ ...prev, pass_type: typeValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: "bold" }}>Issue New Visitor Pass</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack spacing={3}>
            {/* Pass Type Selection */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                Pass Type
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {PASS_TYPES.map((type) => {
                  const isSelected = formData.pass_type === type.value;
                  return (
                    <Button
                      key={type.value}
                      onClick={() => handleTypeSelect(type.value)}
                      variant={isSelected ? "contained" : "outlined"}
                      sx={{
                        backgroundColor: isSelected ? type.color : "transparent",
                        borderColor: type.color,
                        color: isSelected ? "#fff" : type.color,
                        "&:hover": {
                          backgroundColor: isSelected ? type.color : `${type.color}15`,
                          borderColor: type.color,
                        },
                        textTransform: "capitalize",
                        borderRadius: 2,
                        minWidth: 100,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: isSelected ? "#fff" : type.color,
                          mr: 1,
                        }}
                      />
                      {type.label}
                    </Button>
                  );
                })}
              </Stack>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="SR No"
                  name="sr_no"
                  value={formData.sr_no}
                  onChange={handleChange}
                  type="number"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Pass Sequence"
                  name="pass_no"
                  value={formData.pass_no}
                  onChange={handleChange}
                  helperText="Numeric only (e.g., 1 -> 001)"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel shrink>Visitor Area</InputLabel>
                  <Select
                    name="zone"
                    value={formData.zone}
                    onChange={handleChange}
                    label="Visitor Area"
                    displayEmpty
                    notched
                  >
                    {ZONE_OPTIONS.map((z) => (
                      <MenuItem key={z} value={z}>{z}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Issued Time"
                  value={new Date().toLocaleString()}
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                  disabled
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Visitor Name"
                  name="visitor_name"
                  value={formData.visitor_name}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="NIC Number"
                  name="nic_number"
                  value={formData.nic_number}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Number"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Access Scope"
                  value={formData.pass_type === "purple" ? "All Zones" : "Single Zone"}
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                  disabled
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Issuing..." : "Issue Pass"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
