import React from "react";
import { AppBar, Toolbar, Typography, Container } from "@mui/material";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <div className="text-center mt-5">
        <img
          src="/images/logo-tag.png"
          alt="ハロタロ予約システムロゴ"
          className="mx-auto h-12"
        />
      </div>
      <Container maxWidth="lg" style={{ marginTop: "2rem" }}>
        {children}
      </Container>
    </>
  );
};

export default Layout;
