// app/test-capture/page.tsx

'use client'; // クライアントコンポーネントとしてマーク

import React, { useState } from 'react';

const TestCapture = () => {
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    setIsCapturing(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/capture-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          stripeAccountId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">PaymentIntent Capture Test</h1>
      <div className="mb-4">
        <label className="block mb-1">PaymentIntent ID</label>
        <input
          type="text"
          value={paymentIntentId}
          onChange={(e) => setPaymentIntentId(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="pi_..."
        />
      </div>
      <div className="mb-4">
        <label className="block mb-1">Stripe Account ID</label>
        <input
          type="text"
          value={stripeAccountId}
          onChange={(e) => setStripeAccountId(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="acct_..."
        />
      </div>
      <button
        onClick={handleCapture}
        disabled={isCapturing || !paymentIntentId || !stripeAccountId}
        className="w-full bg-blue-500 text-white p-2 rounded disabled:opacity-50"
      >
        {isCapturing ? 'Capturing...' : 'Capture PaymentIntent'}
      </button>
      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
          <h2 className="font-bold">Capture Successful</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
          <h2 className="font-bold">Error</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default TestCapture;
