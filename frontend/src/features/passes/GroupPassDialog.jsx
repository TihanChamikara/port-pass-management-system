import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import GroupVisitorTable from "./GroupVisitorTable";
import { nicRegex, phoneRegex } from "../../utils/validators";

const zones = ["Zone 1", "Zone 2", "Zone 3", "Zone 4"];

function createRow(index) {
  return { id: `${Date.now()}-${index}`, visitor_name: "", nic_number: "", contact_number: "", pass_no: "" };
}

export default function GroupPassDialog({ open, onClose, onSubmit, loading }) {
  const [mode, setMode] = useState("single");
  const [rows, setRows] = useState([createRow(0)]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm({ mode: "onChange", defaultValues: { zone: "Zone 1" } });

  const zone = watch("zone");
  const companyName = watch("company_name");

  useEffect(() => {
    if (!open) return;
    reset({
      visitor_name: "",
      company_name: "",
      nic_number: "",
      contact_number: "",
      zone: "Zone 1",
      requested_by: "",
      num_visitors: 1,
    });
    setMode("single");
    setRows([createRow(0)]);
  }, [open, reset]);

  const addRow = () => setRows((prev) => [...prev, createRow(prev.length)]);
  const removeRow = (id) => setRows((prev) => prev.filter((row) => row.id !== id));
  const updateRow = (id, updates) => setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)));

  const submitSingle = handleSubmit((values) => onSubmit({ mode: "single", ...values }));
  const submitGroup = handleSubmit((values) => {
    const visitors = rows.filter((row) => row.visitor_name && row.nic_number && row.contact_number);
    onSubmit({
      mode: "group",
      requested_by: values.requested_by,
      company_name: values.company_name,
      zone: values.zone,
      num_visitors: visitors.length,
      visitors,
    });
  });

  const canSubmitGroup = rows.some((row) => row.visitor_name && nicRegex.test(row.nic_number) && phoneRegex.test(row.contact_number));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Issue Pass</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Tabs value={mode} onChange={(_, value) => setMode(value)}>
            <Tab value="single" label="Single Pass" />
            <Tab value="group" label="Group Pass" />
          </Tabs>

          {mode === "single" ? (
            <Stack spacing={2} component="form" id="single-pass-form" onSubmit={submitSingle}>
              <Alert severity="info">Pass No and Issued Time are generated automatically when saved.</Alert>
              <TextField label="Visitor Name" fullWidth {...register("visitor_name", { required: "Visitor name is required" })} error={Boolean(errors.visitor_name)} helperText={errors.visitor_name?.message} />
              <TextField label="Company Name" fullWidth {...register("company_name", { required: "Company name is required" })} error={Boolean(errors.company_name)} helperText={errors.company_name?.message} />
              <TextField label="NIC Number" fullWidth {...register("nic_number", { required: "NIC is required", pattern: { value: nicRegex, message: "Use 123456789V or 200012345678" } })} error={Boolean(errors.nic_number)} helperText={errors.nic_number?.message} />
              <TextField label="Contact Number" fullWidth {...register("contact_number", { required: "Contact is required", pattern: { value: phoneRegex, message: "Use 0XXXXXXXXX or +94XXXXXXXXX" } })} error={Boolean(errors.contact_number)} helperText={errors.contact_number?.message} />
              <TextField select label="Zone" fullWidth {...register("zone", { required: true })}>
                {zones.map((item) => (
                  <MenuItem key={item} value={item}>{item}</MenuItem>
                ))}
              </TextField>
              <TextField label="Issued Time" value={new Date().toLocaleString()} fullWidth InputProps={{ readOnly: true }} />
            </Stack>
          ) : (
            <Stack spacing={2} component="form" id="group-pass-form" onSubmit={submitGroup}>
              <Alert severity="info">Bulk paste works by filling rows quickly or pasting from Excel into the table cells.</Alert>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Requested By" fullWidth {...register("requested_by", { required: "Requested by is required" })} error={Boolean(errors.requested_by)} helperText={errors.requested_by?.message} />
                <TextField label="Company Name" fullWidth {...register("company_name", { required: "Company is required" })} error={Boolean(errors.company_name)} helperText={errors.company_name?.message} />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField select label="Zone" fullWidth {...register("zone", { required: true })}>
                  {zones.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </TextField>
                <TextField label="Number of Visitors" fullWidth type="number" value={rows.length} InputProps={{ readOnly: true }} />
              </Stack>
              <GroupVisitorTable rows={rows} onAddRow={addRow} onRemoveRow={removeRow} onChangeRow={updateRow} />
              <Typography variant="body2" color="text.secondary">All visitors inherit {zone} and company {companyName || "-"}.</Typography>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={loading || (mode === "single" ? !isValid : !canSubmitGroup)} type="submit" form={mode === "single" ? "single-pass-form" : "group-pass-form"}>
          {loading ? "Saving..." : mode === "single" ? "Issue Single Pass" : "Create Group Pass"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
