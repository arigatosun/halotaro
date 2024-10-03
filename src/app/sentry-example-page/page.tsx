// app/sentry-debug-test/page.tsx
"use client";

import { useState } from "react";

export default function SentryDebugTestPage() {
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const testSentryDebug = async () => {
    try {
      const response = await fetch("/api/sentry-debug", { method: "GET" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      setError("");
    } catch (e) {
      setError(`Error: ${e instanceof Error ? e.message : String(e)}`);
      setResult("");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Sentry Debug Test Page</h1>
      <button
        onClick={testSentryDebug}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Test Sentry Debug
      </button>
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Result:</h2>
          <pre className="bg-gray-100 p-2 rounded mt-2">{result}</pre>
        </div>
      )}
      {error && (
        <div className="mt-4 text-red-500">
          <h2 className="text-xl font-semibold">Error:</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
