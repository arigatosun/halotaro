import React from "react";
import { AppBar, Toolbar, Typography, Container } from "@mui/material";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">ハロタロ予約システム</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" style={{ marginTop: "2rem" }}>
        {children}
      </Container>
    </>
  );
};

export default Layout;
