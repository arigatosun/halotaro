"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Store,
  UserCircle,
} from "lucide-react";

const Header = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(path) && pathname !== "/dashboard";
  };

  return (
    <div className="flex flex-col">
      <nav className="bg-white w-full p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-red-600">ハロタロ</h1>
          <ul className="flex space-x-4 justify-center flex-grow">
            <NavItem
              href="/dashboard"
              icon={<LayoutDashboard className="w-5 h-5" />}
              isActive={isActive("/dashboard")}
            >
              ダッシュボード
            </NavItem>
            <NavItem
              href="/dashboard/reservations"
              icon={<Calendar className="w-5 h-5" />}
              isActive={isActive("/dashboard/reservations")}
            >
              予約管理
            </NavItem>
            <NavItem
              href="/dashboard/listing/salon"
              icon={<Store className="w-5 h-5" />}
              isActive={isActive("/dashboard/listings")}
            >
              掲載管理
            </NavItem>
            <NavItem
              href="/dashboard/customers"
              icon={<UserCircle className="w-5 h-5" />}
              isActive={isActive("/dashboard/customers")}
            >
              お客様管理
            </NavItem>
            <NavItem
              href="/dashboard/sales"
              icon={<DollarSign className="w-5 h-5" />}
              isActive={isActive("/dashboard/sales")}
            >
              売上管理
            </NavItem>
            <NavItem
              href="/dashboard/settings"
              icon={<Settings className="w-5 h-5" />}
              isActive={isActive("/dashboard/settings")}
            >
              設定
            </NavItem>
          </ul>
          <ul>
            <NavItem
              href="/dashboard/logout"
              icon={<LogOut className="w-5 h-5" />}
              isActive={false}
            >
              ログアウト
            </NavItem>
          </ul>
        </div>
      </nav>
      <SubHeader pathname={pathname} />
    </div>
  );
};

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  href,
  icon,
  children,
  isActive,
}) => (
  <li>
    <Link
      href={href}
      className={`flex items-center py-2 px-4 text-gray-700 hover:bg-red-100 rounded transition duration-300 ${
        isActive ? "bg-red-100" : ""
      }`}
    >
      {icon}
      <span className="ml-2">{children}</span>
    </Link>
  </li>
);

const SubHeader: React.FC<{ pathname: string }> = ({ pathname }) => {
  const subPages = {
    "/dashboard/reservations": [
      { href: "/dashboard/reservations", label: "スケジュール" },
      { href: "/dashboard/reservations/list", label: "予約一覧" },
      {
        href: "/dashboard/reservations/monthly-settings",
        label: "毎月の受付設定",
      },
    ],
    "/dashboard/listing/": [
      { href: "/dashboard/listing/salon", label: "サロン" },
      { href: "/dashboard/listing/staff", label: "スタッフ" },
      { href: "/dashboard/listing/menu", label: "メニュー" },
    ],
    "/dashboard/customers": [
      { href: "/dashboard/customers/list", label: "お客様一覧" },
    ],
    "/dashboard/sales": [
      { href: "/dashboard/sales", label: "売上管理TOP" },
      { href: "/dashboard/sales/closing", label: "レジ締め" },
      { href: "/dashboard/sales/withdrawal", label: "出金申請" },
    ],
    "/dashboard/settings": [
      { href: "/dashboard/settings/salon", label: "サロン設定" },
      { href: "/dashboard/settings/payment", label: "決済設定" },
      { href: "/dashboard/settings/notification", label: "通知設定" },
      { href: "/dashboard/settings/hotpepper", label: "ホットペッパー連携" },
    ],
  };

  const currentSubPages = Object.entries(subPages).find(([key]) =>
    pathname.startsWith(key)
  )?.[1];

  if (!currentSubPages) return null;

  const isSubItemActive = (href: string) => {
    if (href === pathname) return true;
    if (href.endsWith("/") && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="bg-gray-100 w-full p-2">
      <div className="container mx-auto">
        <ul className="flex space-x-4 justify-center">
          {currentSubPages.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className={`py-1 px-3 rounded ${
                  isSubItemActive(page.href)
                    ? "bg-red-100 text-red-600"
                    : "text-gray-600 hover:bg-red-50"
                }`}
              >
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Header;
