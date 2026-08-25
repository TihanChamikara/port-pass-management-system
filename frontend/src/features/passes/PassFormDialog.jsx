import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  Grid2,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { nicRegex, phoneRegex } from "../../utils/validators";
import { PASS_TYPES, ZONES, getPassTypeConfig, getZoneValueForPassType, isAllAccess } from "../../utils/passTypes";

export default function PassFormDialog({ open, onClose, onSubmit, loading, nextSrNo }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm({ mode: "onChange" });

  const selectedPassType = watch("pass_type", "blue");
  const selectedZone = watch("zone");

  useEffect(() => {
    if (open) {
      const defaultType = "blue";
      reset({
        pass_no: "",
        visitor_name: "",
        company_name: "",
        nic_number: "",
        contact_number: "",
        pass_type: defaultType,
        zone: getZoneValueForPassType(defaultType),
      });
    }
  }, [open, reset]);

  useEffect(() => {
    const zone = getZoneValueForPassType(selectedPassType);
    if (isAllAccess(selectedPassType)) {
      setValue("zone", null, { shouldValidate: true });
      return;
    }
    setValue("zone", zone, { shouldValidate: true });
  }, [selectedPassType, setValue]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Issue New Visitor Pass</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} id="pass-form">
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Pass Type
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {PASS_TYPES.map((item) => {
                const active = selectedPassType === item.value;
                return (
                  <Button
                    key={item.value}
                    type="button"
                    variant={active ? "contained" : "outlined"}
                    onClick={() => {
                      setValue("pass_type", item.value, { shouldValidate: true });
                      setValue("zone", item.zone, { shouldValidate: true });
                    }}
                    sx={{
                      borderColor: item.color,
                      color: active ? "#fff" : item.color,
                      bgcolor: active ? item.color : "transparent",
                      "&:hover": { borderColor: item.color, bgcolor: active ? item.color : `${item.color}14` },
                    }}
                    startIcon={<Chip size="small" label={`● ${item.label}`} sx={{ color: active ? "#fff" : item.color, bgcolor: "transparent" }} />}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>
          </Box>
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: 3 }}>
              <TextField label="SR No" value={nextSrNo} fullWidth InputProps={{ readOnly: true }} />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 3 }}>
              <TextField
                label="Pass Sequence"
                fullWidth
                autoFocus
                type="number"
                placeholder="e.g., 123"
                helperText="Numeric only (e.g., 1 → 001, 23 → 023, 123 → 123)"
                inputProps={{ min: "0" }}
                {...register("pass_no", { required: "Pass sequence is required" })}
                error={Boolean(errors.pass_no)}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 3 }}>
              <TextField
                select
                label="Visitor Area"
                fullWidth
                disabled={isAllAccess(selectedPassType)}
                value={selectedZone || ""}
                {...register("zone", { required: !isAllAccess(selectedPassType) })}
              >
                {ZONES.map((zone) => (
                  <MenuItem key={zone} value={zone}>
                    {zone}
                  </MenuItem>
                ))}
                {isAllAccess(selectedPassType) && <MenuItem value="">All Zones</MenuItem>}
              </TextField>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 3 }}>
              <TextField label="Issued Time" value={new Date().toLocaleString()} fullWidth InputProps={{ readOnly: true }} />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Visitor Name"
                fullWidth
                {...register("visitor_name", { required: "Visitor name is required" })}
                error={Boolean(errors.visitor_name)}
                helperText={errors.visitor_name?.message}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Company Name"
                fullWidth
                {...register("company_name", { required: "Company name is required" })}
                error={Boolean(errors.company_name)}
                helperText={errors.company_name?.message}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="NIC Number"
                fullWidth
                {...register("nic_number", {
                  required: "NIC is required",
                  pattern: {
                    value: nicRegex,
                    message: "Use 123456789V or 200012345678 format",
                  },
                })}
                error={Boolean(errors.nic_number)}
                helperText={errors.nic_number?.message}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Contact Number"
                fullWidth
                {...register("contact_number", {
                  required: "Contact number is required",
                  pattern: {
                    value: phoneRegex,
                    message: "Use 0XXXXXXXXX or +94XXXXXXXXX",
                  },
                })}
                error={Boolean(errors.contact_number)}
                helperText={errors.contact_number?.message}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField label="Access Scope" value={isAllAccess(selectedPassType) ? "ALL ACCESS" : "Single Zone"} fullWidth InputProps={{ readOnly: true }} />
            </Grid2>
          </Grid2>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form="pass-form" variant="contained" disabled={loading || !isValid}>
          {loading ? "Issuing..." : "Issue Pass"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
