// app/test-delayed-payment/page.tsx
'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function TestDelayedPayment() {
  const [stripeCustomerId, setStripeCustomerId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [result, setResult] = useState('');
  const [paymentIntentInfo, setPaymentIntentInfo] = useState<any>(null);
  const [userId, setUserId] = useState(''); // 追加


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/create-delayed-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripeCustomerId,
          paymentMethodId,
          amount: parseInt(amount),
          reservationDate,
          userId, // 追加
        }),
      });
      const data = await response.json();
      
      if (data.error) {
        setResult('Error: ' + data.error);
        return;
      }

      // Payment Intent情報を保存
      setPaymentIntentInfo(data);
      setResult('Payment Intent created successfully!');

      // Stripe.jsをロード
      const stripe = await stripePromise;
      if (!stripe) {
        setResult('Failed to load Stripe');
        return;
      }

      // Payment Intentの確認
      const { error } = await stripe.confirmCardPayment(data.clientSecret);

      if (error) {
        setResult('Error: ' + error.message);
      } else {
        setResult('Payment succeeded! Payment Intent ID: ' + data.paymentIntentId);
      }
    } catch (error) {
      setResult('Error: ' + JSON.stringify(error));
    }
  };

  return (
    <div>
      <h1>Test Delayed Payment Intent</h1>
      <form onSubmit={handleSubmit}>
        <div>
        <label>
            User ID: {/* 追加 */}
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </label>
          <label>
            Stripe Customer ID:
            <input
              type="text"
              value={stripeCustomerId}
              onChange={(e) => setStripeCustomerId(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Payment Method ID:
            <input
              type="text"
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Amount (in cents):
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Reservation Date:
            <input
              type="date"
              value={reservationDate}
              onChange={(e) => setReservationDate(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit">Create and Confirm Delayed Payment Intent</button>
      </form>
      <div>
        <h2>Result:</h2>
        <pre>{result}</pre>
      </div>
      {paymentIntentInfo && (
        <div>
          <h2>Payment Intent Information:</h2>
          <pre>{JSON.stringify(paymentIntentInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}