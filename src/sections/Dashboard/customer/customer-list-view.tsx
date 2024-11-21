"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Link from "next/link";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/authcontext";
import { isWithinInterval, parse, addMonths, subMonths } from "date-fns";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewCustomerForm } from "@/app/dashboard/customer/components/NewCustomerForm";

type SortableCustomerKeys =
  | "kana"
  | "name"
  | "phone"
  | "gender"
  | "visits"
  | "lastVisit";

type Customer = {
  id: string;
  name: string;
  kana: string;
  email: string;
  phone: string;
  visits: number;
  gender: string;
  lastVisit: string;
  birthDate?: string;
  weddingAnniversary?: string;
  children?: Array<{
    name: string;
    birthDate: string;
  }>;
};

const CustomerListPage: React.FC = () => {
  const { session, user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: SortableCustomerKeys;
    direction: "ascending" | "descending";
  } | null>({
    key: "lastVisit",
    direction: "descending",
  });
  const [kanaSearchTerm, setKanaSearchTerm] = useState("");
  const [phoneSearchTerm, setPhoneSearchTerm] = useState("");
  const [genderSearchTerm, setGenderSearchTerm] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);

  const isDateWithinOneMonth = (dateStr: string): boolean => {
    if (dateStr === "0-0") return false;

    const [monthStr, dayStr] = dateStr.split("-");
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isNaN(month) || isNaN(day)) {
      console.error(`Invalid date format: ${dateStr}`);
      return false;
    }

    const today = new Date();
    const targetDate = new Date(today.getFullYear(), month - 1, day);

    const start = subMonths(today, 1);
    const end = addMonths(today, 1);

    targetDate.setFullYear(today.getFullYear());

    const result = isWithinInterval(targetDate, { start, end });

    console.log(
      `Checking date: ${dateStr} -> Target Date: ${targetDate.toDateString()}, Within Interval: ${result}`
    );

    return result;
  };

  const hasUpcomingDates = (customer: Customer): boolean => {
    const { birthDate, weddingAnniversary, children } = customer;

    console.log(`Checking customer ID: ${customer.id}`);

    if (birthDate && isDateWithinOneMonth(birthDate)) {
      console.log(`Customer ID ${customer.id}: Birthdate is within one month.`);
      return true;
    }
    if (weddingAnniversary && isDateWithinOneMonth(weddingAnniversary)) {
      console.log(
        `Customer ID ${customer.id}: Wedding anniversary is within one month.`
      );
      return true;
    }

    if (children && children.length > 0) {
      for (const child of children) {
        if (child.birthDate && isDateWithinOneMonth(child.birthDate)) {
          console.log(
            `Customer ID ${customer.id}: Child (${child.name}) birthdate is within one month.`
          );
          return true;
        }
      }
    }

    return false;
  };

  const requestSort = (key: SortableCustomerKeys) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const fetchCustomers = async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append("startDate", dateRange.from.toISOString().split("T")[0]);
      }
      if (dateRange?.to) {
        params.append("endDate", dateRange.to.toISOString().split("T")[0]);
      }
      if (kanaSearchTerm) {
        params.append("kanaSearchTerm", kanaSearchTerm);
      }
      if (phoneSearchTerm) {
        params.append("phoneSearchTerm", phoneSearchTerm);
      }
      if (genderSearchTerm && genderSearchTerm !== "all") {
        params.append("genderSearchTerm", genderSearchTerm);
      }

      const response = await fetch(`/api/customer-data?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      console.log("Fetched Data:", data);

      if (response.ok) {
        const mappedCustomers = data.customers.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          kana: customer.kana || "",
          email: customer.email || "",
          phone: customer.phone || "",
          visits: customer.visits || 0,
          gender: customer.gender || "",
          lastVisit: customer.lastVisit || "",
          birthDate: customer.birthDate || "0-0",
          weddingAnniversary: customer.weddingAnniversary || "0-0",
          children: customer.children || [],
        }));

        console.log("Mapped Customers:", mappedCustomers);

        setCustomers(mappedCustomers);
        setCurrentPage(1);
      } else {
        console.error("Error fetching customers:", data.error);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [session, kanaSearchTerm, phoneSearchTerm, genderSearchTerm, dateRange]);

  const handleSearch = () => {
    fetchCustomers();
  };

  const handleClear = () => {
    setKanaSearchTerm("");
    setPhoneSearchTerm("");
    setGenderSearchTerm("all");
    setDateRange(undefined);
    fetchCustomers();
  };

  const itemsPerPage = 10;

  const sortedCustomers = useMemo(() => {
    let sortableItems = [...customers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === "lastVisit") {
          const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;

          if (dateA < dateB)
            return sortConfig.direction === "ascending" ? -1 : 1;
          if (dateA > dateB)
            return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        } else {
          let aValue: string | number = "";
          let bValue: string | number = "";

          switch (sortConfig.key) {
            case "kana":
            case "name":
            case "phone":
            case "gender":
              aValue = a[sortConfig.key] ?? "";
              bValue = b[sortConfig.key] ?? "";
              break;
            case "visits":
              aValue = a.visits ?? 0;
              bValue = b.visits ?? 0;
              break;
            default:
              aValue = "";
              bValue = "";
          }

          if (aValue < bValue) {
            return sortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableItems;
  }, [customers, sortConfig]);

  const currentCustomers = useMemo(() => {
    return sortedCustomers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedCustomers, currentPage]);

  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);

  const handleNewCustomerSuccess = () => {
    setIsNewCustomerDialogOpen(false);
    fetchCustomers();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>ログインしてください。</div>;
  }

  return (
    <Tooltip.Provider>
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-8">お客様情報一覧</h2>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="space-y-4">
              <DatePickerWithRange
                date={dateRange}
                onDateChange={(newDateRange) => setDateRange(newDateRange)}
              />
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="お客様名(カナ)"
                  value={kanaSearchTerm}
                  onChange={(e) => setKanaSearchTerm(e.target.value)}
                  className="w-full md:w-auto"
                />
                <Input
                  placeholder="電話番号"
                  value={phoneSearchTerm}
                  onChange={(e) => setPhoneSearchTerm(e.target.value)}
                  className="w-full md:w-auto"
                />
                <Select
                  value={genderSearchTerm}
                  onValueChange={setGenderSearchTerm}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="すべての性別" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての性別</SelectItem>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full md:w-auto" onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" /> 検索する
                </Button>
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={handleClear}
                >
                  <X className="mr-2 h-4 w-4" /> 条件をクリア
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mb-4">
          <p>該当するお客様情報が {sortedCustomers.length} 件あります</p>
          <Dialog
            open={isNewCustomerDialogOpen}
            onOpenChange={setIsNewCustomerDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <UserPlus className="mr-2 h-4 w-4" /> 新規お客様を登録
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>新規お客様登録</DialogTitle>
                <DialogDescription>
                  新しいお客様の情報を入力してください。
                </DialogDescription>
              </DialogHeader>
              <NewCustomerForm
                onSuccess={handleNewCustomerSuccess}
                onCancel={() => setIsNewCustomerDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("kana")}
                  >
                    氏名 (カナ){" "}
                    {sortConfig?.key === "kana" &&
                      (sortConfig.direction === "ascending" ? (
                        <ChevronUp className="inline" />
                      ) : (
                        <ChevronDown className="inline" />
                      ))}
                  </TableHead>
                  <TableHead>氏名 (漢字)</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("phone")}
                  >
                    電話番号{" "}
                    {sortConfig?.key === "phone" &&
                      (sortConfig.direction === "ascending" ? (
                        <ChevronUp className="inline" />
                      ) : (
                        <ChevronDown className="inline" />
                      ))}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("gender")}
                  >
                    性別{" "}
                    {sortConfig?.key === "gender" &&
                      (sortConfig.direction === "ascending" ? (
                        <ChevronUp className="inline" />
                      ) : (
                        <ChevronDown className="inline" />
                      ))}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("visits")}
                  >
                    予約回数{" "}
                    {sortConfig?.key === "visits" &&
                      (sortConfig.direction === "ascending" ? (
                        <ChevronUp className="inline" />
                      ) : (
                        <ChevronDown className="inline" />
                      ))}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("lastVisit")}
                  >
                    前回来店日{" "}
                    {sortConfig?.key === "lastVisit" &&
                      (sortConfig.direction === "ascending" ? (
                        <ChevronUp className="inline" />
                      ) : (
                        <ChevronDown className="inline" />
                      ))}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/customer/${customer.id}`}
                        className="text-blue-600 hover:underline flex items-center"
                      >
                        {customer.kana}
                        {hasUpcomingDates(customer) && (
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <AlertCircle
                                className="ml-2 text-yellow-500 cursor-pointer"
                                aria-label="誕生日または結婚記念日、子供の誕生日が近づいています"
                              />
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                className="bg-gray-700 text-white p-2 rounded shadow-lg text-sm"
                                side="top"
                                align="center"
                              >
                                誕生日または結婚記念日、子供の誕生日が近づいています
                                <Tooltip.Arrow className="fill-gray-700" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.gender}</TableCell>
                    <TableCell>{customer.visits}</TableCell>
                    <TableCell>
                      {customer.lastVisit
                        ? new Date(customer.lastVisit).toLocaleDateString()
                        : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className={
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  onClick={() => setCurrentPage(i + 1)}
                  isActive={currentPage === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </Tooltip.Provider>
  );
};

export default CustomerListPage;
