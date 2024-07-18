"use client";

import React, { useState } from "react";
import { CreditCard, Smartphone, DollarSign } from "lucide-react";

interface PaymentSettings {
  acceptCreditCard: boolean;
  acceptQRPayment: boolean;
  acceptCash: boolean;
  stripeApiKey: string;
  paypayApiKey: string;
  taxRate: number;
}

const initialPaymentSettings: PaymentSettings = {
  acceptCreditCard: true,
  acceptQRPayment: true,
  acceptCash: true,
  stripeApiKey: "",
  paypayApiKey: "",
  taxRate: 10,
};

const PaymentSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PaymentSettings>(
    initialPaymentSettings
  );

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ここでAPIを呼び出して設定を保存する
    console.log("保存された決済設定:", settings);
    alert("決済設定が保存されました");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">決済設定</h1>
      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">決済方法</h2>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="acceptCreditCard"
                checked={settings.acceptCreditCard}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <CreditCard className="mr-2" />
              クレジットカード決済を受け付ける
            </label>
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="acceptQRPayment"
                checked={settings.acceptQRPayment}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <Smartphone className="mr-2" />
              QR決済を受け付ける
            </label>
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="acceptCash"
                checked={settings.acceptCash}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <DollarSign className="mr-2" />
              現金決済を受け付ける
            </label>
          </div>
        </div>

        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">API設定</h2>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="stripeApiKey"
            >
              Stripe APIキー
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="stripeApiKey"
              type="text"
              name="stripeApiKey"
              value={settings.stripeApiKey}
              onChange={handleInputChange}
              placeholder="sk_live_xxxxxxxxxxxxxxxx"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="paypayApiKey"
            >
              PayPay APIキー
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="paypayApiKey"
              type="text"
              name="paypayApiKey"
              value={settings.paypayApiKey}
              onChange={handleInputChange}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
        </div>

        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">税率設定</h2>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="taxRate"
            >
              消費税率 (%)
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="taxRate"
              type="number"
              name="taxRate"
              value={settings.taxRate}
              onChange={handleInputChange}
              min="0"
              max="100"
              step="0.1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            設定を保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentSettingsPage;
