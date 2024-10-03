import React, { Suspense } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-layout">
      <Suspense fallback={<div>ロード中</div>}>
        {children}
      </Suspense>
    </div>
  );
}