"use client";

import React, { useState, useEffect } from "react";
import { Clock, DollarSign, ShoppingBag, Plus, X } from "lucide-react";

interface Reservation {
  id: string;
  customerName: string;
  date: string;
  time: string;
  service: string;
  servicePrice: number;
  productSales: ProductSale[];
  totalAmount: number;
}

interface ProductSale {
  id: string;
  name: string;
  price: number;
}

const initialReservations: Reservation[] = [
  {
    id: "1",
    customerName: "山田太郎",
    date: "2023-07-15",
    time: "14:00",
    service: "カット",
    servicePrice: 5000,
    productSales: [],
    totalAmount: 5000,
  },
  {
    id: "2",
    customerName: "佐藤花子",
    date: "2023-07-15",
    time: "15:30",
    service: "カラー",
    servicePrice: 8000,
    productSales: [{ id: "p1", name: "シャンプー", price: 2000 }],
    totalAmount: 10000,
  },
  // 他の予約データ...
];

const UnaccountedSales: React.FC = () => {
  const [reservations, setReservations] =
    useState<Reservation[]>(initialReservations);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");

  useEffect(() => {
    // ここで未計上予約データを取得するAPIを呼び出す
    // setReservations(fetchedReservations);
  }, []);

  const handleAddProduct = (reservationId: string) => {
    if (!newProductName || !newProductPrice) return;

    const updatedReservations = reservations.map((reservation) => {
      if (reservation.id === reservationId) {
        const newProduct: ProductSale = {
          id: Date.now().toString(),
          name: newProductName,
          price: Number(newProductPrice),
        };
        const updatedProductSales = [...reservation.productSales, newProduct];
        const newTotalAmount =
          reservation.servicePrice +
          updatedProductSales.reduce((sum, product) => sum + product.price, 0);
        return {
          ...reservation,
          productSales: updatedProductSales,
          totalAmount: newTotalAmount,
        };
      }
      return reservation;
    });

    setReservations(updatedReservations);
    setNewProductName("");
    setNewProductPrice("");
    // ここで更新をサーバーに送信するAPIを呼び出す
  };

  const handleRemoveProduct = (reservationId: string, productId: string) => {
    const updatedReservations = reservations.map((reservation) => {
      if (reservation.id === reservationId) {
        const updatedProductSales = reservation.productSales.filter(
          (product) => product.id !== productId
        );
        const newTotalAmount =
          reservation.servicePrice +
          updatedProductSales.reduce((sum, product) => sum + product.price, 0);
        return {
          ...reservation,
          productSales: updatedProductSales,
          totalAmount: newTotalAmount,
        };
      }
      return reservation;
    });

    setReservations(updatedReservations);
    // ここで更新をサーバーに送信するAPIを呼び出す
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">未計上予約管理</h1>
      <p className="mb-4 text-gray-600">
        ※ 未計上の予約は翌日AM1:00に自動的に計上されます。
      </p>
      <div className="space-y-4">
        {reservations.map((reservation) => (
          <div key={reservation.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">
                {reservation.customerName}
              </h2>
              <div className="text-sm text-gray-500">
                <Clock className="inline-block w-4 h-4 mr-1" />
                {reservation.date} {reservation.time}
              </div>
            </div>
            <div className="mb-2">
              <span className="font-medium">サービス:</span>{" "}
              {reservation.service}
              <span className="ml-2 text-gray-600">
                (¥{reservation.servicePrice.toLocaleString()})
              </span>
            </div>
            <div className="mb-2">
              <h3 className="font-medium">商品販売:</h3>
              <ul className="list-disc list-inside">
                {reservation.productSales.map((product) => (
                  <li
                    key={product.id}
                    className="flex justify-between items-center"
                  >
                    <span>
                      {product.name} (¥{product.price.toLocaleString()})
                    </span>
                    <button
                      onClick={() =>
                        handleRemoveProduct(reservation.id, product.id)
                      }
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-2">
              <span className="font-medium">合計金額:</span> ¥
              {reservation.totalAmount.toLocaleString()}
            </div>
            <div className="mt-4">
              <h3 className="font-medium mb-2">商品販売を追加:</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="商品名"
                  className="flex-grow px-2 py-1 border rounded"
                />
                <input
                  type="number"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  placeholder="価格"
                  className="w-24 px-2 py-1 border rounded"
                />
                <button
                  onClick={() => handleAddProduct(reservation.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" /> 追加
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnaccountedSales;
