import React from "react";
import { Box, Typography, Button } from "@mui/material";

/** Catches render errors so a single faulty page doesn't blank the whole app. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: String(error?.message || error) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 3 }}>
          <Box className="mh-card" sx={{ p: 4, maxWidth: 520, textAlign: "center" }}>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              Something went wrong
            </Typography>
            <Typography className="mh-mono" sx={{ mb: 3, fontSize: "0.82rem", color: "var(--ink-2)", wordBreak: "break-word" }}>
              {this.state.message}
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </Box>
        </Box>
      );
    }
    return this.props.children;
  }
}
