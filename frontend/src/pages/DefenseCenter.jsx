import React, { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Chip, Box } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import { apiGet } from "../api/client";

export default function DefenseCenter() {
  const [defenses, setDefenses] = useState([]);

  useEffect(() => {
    (async () => {
      try { const r = await apiGet("/defenses"); setDefenses(r.data.defenses || []); }
      catch (e) { /* offline */ }
    })();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ color: "#00E5FF" }}>Defense Center</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Defensive mechanisms to harden models against adversarial attacks.
      </Typography>
      <Grid container spacing={3}>
        {defenses.map((d) => (
          <Grid item xs={12} sm={6} md={4} key={d.name}>
            <Card>
              <CardContent>
                <ShieldIcon sx={{ color: "#00C853" }} />
                <Typography variant="h5" sx={{ mt: 1 }}>{d.name.replace(/_/g, " ")}</Typography>
                <Typography variant="body2" color="text.secondary">{d.description}</Typography>
                {d.methods?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {d.methods.map((m) => <Chip key={m} label={m} size="small" variant="outlined" sx={{ mr: 0.5 }} />)}
                  </Box>
                )}
                <Chip label={d.name} size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
