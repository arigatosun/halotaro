"use client";

import React, { useEffect, useState } from "react";
import { Scissors, Clock, DollarSign, Edit, Trash2, Plus } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
}

const initialMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "カット",
    description: "シンプルなカットサービス",
    price: 5000,
    duration: 60,
    category: "カット",
  },
  {
    id: "2",
    name: "カラー",
    description: "豊富な色から選べるカラーリング",
    price: 8000,
    duration: 120,
    category: "カラー",
  },
  {
    id: "3",
    name: "パーマ",
    description: "ナチュラルなウェーブをつくるパーマ",
    price: 10000,
    duration: 150,
    category: "パーマ",
  },
  {
    id: "4",
    name: "トリートメント",
    description: "髪質改善トリートメント",
    price: 6000,
    duration: 90,
    category: "トリートメント",
  },
];

const MenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // 初回レンダリング時に最初のメニュー項目を選択
    if (menuItems.length > 0 && !selectedMenuItem) {
      setSelectedMenuItem(menuItems[0]);
    }
  }, [menuItems, selectedMenuItem]);

  const handleMenuItemSelect = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsEditing(false);
  };

  const handleEditMenuItem = () => {
    setIsEditing(true);
  };

  const handleSaveMenuItem = (updatedItem: MenuItem) => {
    setMenuItems(
      menuItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    setSelectedMenuItem(updatedItem);
    setIsEditing(false);
  };

  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems(menuItems.filter((item) => item.id !== itemId));
    setSelectedMenuItem(null);
  };

  const handleAddMenuItem = () => {
    const newItem: MenuItem = {
      id: String(Date.now()),
      name: "新規メニュー",
      description: "",
      price: 0,
      duration: 60,
      category: "",
    };
    setMenuItems([...menuItems, newItem]);
    setSelectedMenuItem(newItem);
    setIsEditing(true);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">メニュー管理</h1>
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 pr-4">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">メニュー一覧</h2>
            <button
              onClick={handleAddMenuItem}
              className="bg-green-500 text-white px-2 py-1 rounded flex items-center"
            >
              <Plus className="mr-1" size={16} /> 新規追加
            </button>
          </div>
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li
                key={item.id}
                className={`p-2 rounded cursor-pointer ${
                  selectedMenuItem?.id === item.id
                    ? "bg-blue-100"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleMenuItemSelect(item)}
              >
                <div className="font-semibold">{item.name}</div>
                <div className="text-sm text-gray-600">{item.category}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full md:w-2/3 mt-4 md:mt-0">
          {selectedMenuItem && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {selectedMenuItem.name}
                </h2>
                <div>
                  <button
                    onClick={handleEditMenuItem}
                    className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteMenuItem(selectedMenuItem.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {isEditing ? (
                <MenuItemEditForm
                  item={selectedMenuItem}
                  onSave={handleSaveMenuItem}
                />
              ) : (
                <MenuItemDetails item={selectedMenuItem} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MenuItemDetails: React.FC<{ item: MenuItem }> = ({ item }) => (
  <div>
    <p className="text-gray-600 mb-2">{item.description}</p>
    <p className="flex items-center mb-2">
      <DollarSign className="mr-2" size={16} /> 価格: ¥
      {item.price.toLocaleString()}
    </p>
    <p className="flex items-center mb-2">
      <Clock className="mr-2" size={16} /> 所要時間: {item.duration}分
    </p>
    <p className="flex items-center">
      <Scissors className="mr-2" size={16} /> カテゴリー: {item.category}
    </p>
  </div>
);

const MenuItemEditForm: React.FC<{
  item: MenuItem;
  onSave: (item: MenuItem) => void;
}> = ({ item, onSave }) => {
  const [editedItem, setEditedItem] = useState(item);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditedItem({
      ...editedItem,
      [name]: name === "price" || name === "duration" ? Number(value) : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedItem);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">
          メニュー名
        </label>
        <input
          type="text"
          name="name"
          value={editedItem.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">説明</label>
        <textarea
          name="description"
          value={editedItem.description}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">
          価格 (円)
        </label>
        <input
          type="number"
          name="price"
          value={editedItem.price}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">
          所要時間 (分)
        </label>
        <input
          type="number"
          name="duration"
          value={editedItem.duration}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">
          カテゴリー
        </label>
        <select
          name="category"
          value={editedItem.category}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        >
          <option value="">選択してください</option>
          <option value="カット">カット</option>
          <option value="カラー">カラー</option>
          <option value="パーマ">パーマ</option>
          <option value="トリートメント">トリートメント</option>
          <option value="その他">その他</option>
        </select>
      </div>
      <button
        type="submit"
        className="bg-green-500 text-white px-4 py-2 rounded mt-4"
      >
        保存
      </button>
    </form>
  );
};

export default MenuManagement;
