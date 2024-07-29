"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, Plus, Edit, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BankAccount {
  id: string;
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountName: string;
}

const BankAccountSettingsView: React.FC = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    {
      id: "1",
      bankName: "サンプル銀行",
      branchName: "東京支店",
      accountType: "普通",
      accountNumber: "1234567",
      accountName: "ヤマダ タロウ",
    },
  ]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<BankAccount | null>(
    null
  );

  const [newAccount, setNewAccount] = useState<BankAccount>({
    id: "",
    bankName: "",
    branchName: "",
    accountType: "普通",
    accountNumber: "",
    accountName: "",
  });

  const handleAddAccount = () => {
    setBankAccounts([
      ...bankAccounts,
      { ...newAccount, id: Date.now().toString() },
    ]);
    setIsAddDialogOpen(false);
    setNewAccount({
      id: "",
      bankName: "",
      branchName: "",
      accountType: "普通",
      accountNumber: "",
      accountName: "",
    });
  };

  const handleEditAccount = () => {
    if (currentAccount) {
      setBankAccounts(
        bankAccounts.map((account) =>
          account.id === currentAccount.id ? currentAccount : account
        )
      );
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteAccount = () => {
    if (currentAccount) {
      setBankAccounts(
        bankAccounts.filter((account) => account.id !== currentAccount.id)
      );
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">振込先口座設定</h2>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">登録済み口座一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>銀行名</TableHead>
                <TableHead>支店名</TableHead>
                <TableHead>口座種別</TableHead>
                <TableHead>口座番号</TableHead>
                <TableHead>口座名義</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.bankName}</TableCell>
                  <TableCell>{account.branchName}</TableCell>
                  <TableCell>{account.accountType}</TableCell>
                  <TableCell>{account.accountNumber}</TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentAccount(account);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentAccount(account);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={() => setIsAddDialogOpen(true)} className="mt-4">
            <Plus className="mr-2 h-4 w-4" /> 新しい口座を追加
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>注意</AlertTitle>
        <AlertDescription>
          振込先口座情報は正確に入力してください。誤った情報を登録すると、出金が正しく行われない可能性があります。
        </AlertDescription>
      </Alert>

      {/* 口座追加ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しい口座を追加</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bankName" className="text-right">
                銀行名
              </Label>
              <Input
                id="bankName"
                value={newAccount.bankName}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, bankName: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="branchName" className="text-right">
                支店名
              </Label>
              <Input
                id="branchName"
                value={newAccount.branchName}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, branchName: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountType" className="text-right">
                口座種別
              </Label>
              <Select
                value={newAccount.accountType}
                onValueChange={(value) =>
                  setNewAccount({ ...newAccount, accountType: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="口座種別を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="普通">普通</SelectItem>
                  <SelectItem value="当座">当座</SelectItem>
                  <SelectItem value="貯蓄">貯蓄</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountNumber" className="text-right">
                口座番号
              </Label>
              <Input
                id="accountNumber"
                value={newAccount.accountNumber}
                onChange={(e) =>
                  setNewAccount({
                    ...newAccount,
                    accountNumber: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountName" className="text-right">
                口座名義
              </Label>
              <Input
                id="accountName"
                value={newAccount.accountName}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, accountName: e.target.value })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddAccount}>
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 口座編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>口座情報を編集</DialogTitle>
          </DialogHeader>
          {currentAccount && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editBankName" className="text-right">
                  銀行名
                </Label>
                <Input
                  id="editBankName"
                  value={currentAccount.bankName}
                  onChange={(e) =>
                    setCurrentAccount({
                      ...currentAccount,
                      bankName: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              {/* 他のフィールドも同様に編集可能にする */}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleEditAccount}>
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 口座削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>口座を削除</DialogTitle>
            <DialogDescription>
              本当にこの口座を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankAccountSettingsView;
