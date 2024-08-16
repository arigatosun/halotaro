import React from "react";
import { AppBar, Toolbar, Typography, Container } from "@mui/material";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <div className="text-center mt-5">
        <Typography variant="h6">ハロタロ予約システム</Typography>
      </div>
      <Container maxWidth="md" style={{ marginTop: "2rem" }}>
        {children}
      </Container>
    </>
  );
};

export default Layout;
