"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  Settings,
  LogOut,
  Store,
  UserCircle,
  Menu,
  X,
  List,
} from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(path) && pathname !== "/dashboard";
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/auth/login");
    } catch (error) {
      if (error instanceof Error) {
        console.error("ログアウトエラー:", error.message);
      } else {
        console.error("不明なログアウトエラーが発生しました");
      }
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const mobileNavItems = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: "ダッシュボード",
    },
    {
      href: "/dashboard/reservations",
      icon: <Calendar className="w-5 h-5" />,
      label: "スケジュール",
    },
    {
      href: "/dashboard/reservations/list",
      icon: <List className="w-5 h-5" />,
      label: "予約一覧",
    },
  ];

  const desktopNavItems = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: "ダッシュボード",
    },
    {
      href: "/dashboard/reservations",
      icon: <Calendar className="w-5 h-5" />,
      label: "予約管理",
    },
    {
      href: "/dashboard/listing/salon",
      icon: <Store className="w-5 h-5" />,
      label: "掲載管理",
    },
    {
      href: "/dashboard/customer",
      icon: <UserCircle className="w-5 h-5" />,
      label: "お客様管理",
    },
    {
      href: "/dashboard/sales",
      icon: <DollarSign className="w-5 h-5" />,
      label: "売上管理",
    },
    {
      href: "/dashboard/settings",
      icon: <Settings className="w-5 h-5" />,
      label: "設定",
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-white">
        <nav className="w-full p-4 shadow-lg header-main">
          <div className="container mx-auto flex items-center justify-between">
            <Image
              src="/images/logo-tag.png"
              alt="ハロタロ"
              width={isMobile ? 100 : 200}
              height={isMobile ? 50 : 100}
              priority
              className="object-contain"
              sizes="(max-width: 768px) 100px, 150px"
            />
            {isMobile ? (
              <button className="focus:outline-none" onClick={toggleMenu}>
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            ) : (
              <>
                <ul className="flex space-x-4 justify-center flex-grow">
                  {desktopNavItems.map((item) => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      isActive={isActive(item.href)}
                    >
                      {item.label}
                    </NavItem>
                  ))}
                </ul>
                <ul>
                  <NavItem
                    onClick={handleLogout}
                    icon={<LogOut className="w-5 h-5" />}
                    isActive={false}
                  >
                    ログアウト
                  </NavItem>
                </ul>
              </>
            )}
          </div>
        </nav>
      </div>
      {isMobile && isMenuOpen && (
        <div className="bg-white shadow-md">
          <nav className="container mx-auto py-2">
            <ul className="space-y-2">
              {mobileNavItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  isActive={isActive(item.href)}
                  onClick={toggleMenu}
                >
                  {item.label}
                </NavItem>
              ))}
              <NavItem
                onClick={() => {
                  handleLogout();
                  toggleMenu();
                }}
                icon={<LogOut className="w-5 h-5" />}
                isActive={false}
              >
                ログアウト
              </NavItem>
            </ul>
          </nav>
        </div>
      )}
      {!isMobile && <SubHeader pathname={pathname} />}
    </header>
  );
};

interface NavItemProps {
  href?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, children, isActive, onClick }) => {
  const content = (
    <>
      {icon}
      <span className="ml-2">{children}</span>
    </>
  );

  const className = `flex items-center py-2 px-4 text-gray-700 hover:bg-orange-100 rounded transition duration-300 ${
    isActive ? "bg-orange-100 text-orange-600" : ""
  }`;

  if (href) {
    return (
      <li>
        <Link href={href} className={className} onClick={onClick}>
          {content}
        </Link>
      </li>
    );
  } else if (onClick) {
    return (
      <li>
        <button onClick={onClick} className={className}>
          {content}
        </button>
      </li>
    );
  } else {
    return (
      <li>
        <span className={className}>{content}</span>
      </li>
    );
  }
};

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
      { href: "/dashboard/listing/coupon", label: "クーポン" },
    ],
    "/dashboard/customer": [{ href: "/dashboard/customer", label: "お客様一覧" }],
    "/dashboard/sales": [
      { href: "/dashboard/sales", label: "売上管理TOP" },
      { href: "/dashboard/sales/sales-details", label: "売上明細" },
      { href: "/dashboard/sales/closing", label: "レジ締め" },
      { href: "/dashboard/sales/closing-list", label: "レジ締め一覧" },
      {
        href: "https://dashboard.stripe.com/login",
        label: "Stripeダッシュボード",
      },
    ],
    "/dashboard/settings": [
      { href: "/dashboard/settings", label: "基本設定" },
      { href: "/dashboard/settings/notification", label: "通知設定" },
      { href: "/dashboard/settings/salonboard", label: "サロンボード連携" },
    ],
  };

  const currentSubPages = Object.entries(subPages).find(([key]) => pathname.startsWith(key))?.[1];

  if (!currentSubPages) return null;

  const isSubItemActive = (href: string) => {
    if (href === pathname) return true;
    if (href.endsWith("/") && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="bg-gray-100 w-full p-2 shadow-md header-sub">
      <div className="container mx-auto">
        <ul className="flex space-x-4 justify-center">
          {currentSubPages.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className={`py-1 px-3 rounded ${
                  isSubItemActive(page.href)
                    ? "bg-orange-100 text-orange-600"
                    : "text-gray-600 hover:bg-orange-50"
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
