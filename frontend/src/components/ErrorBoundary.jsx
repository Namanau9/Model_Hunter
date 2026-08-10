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
        <Box sx={{ textAlign: "center", py: 10 }}>
          <Typography variant="h5" sx={{ color: "#FF1744", mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {this.state.message}
          </Typography>
          <Button variant="outlined" color="secondary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
