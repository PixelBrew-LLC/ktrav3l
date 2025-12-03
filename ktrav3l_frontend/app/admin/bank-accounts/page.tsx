'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';

interface BankAccount {
  ID: string;
  BankName: string;
  AccountNumber: string;
  IsActive: boolean;
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.get('/admin/bank-accounts');
      setAccounts(res.data.accounts || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleCreate = async () => {
    if (!bankName || !accountNumber) return;
    setLoading(true);
    try {
      await api.post('/admin/bank-accounts', {
        bankName,
        accountNumber,
      });
      setShowCreate(false);
      setBankName('');
      setAccountNumber('');
      loadAccounts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedAccount || !bankName || !accountNumber) return;
    setLoading(true);
    try {
      await api.patch(`/admin/bank-accounts/${selectedAccount.ID}`, {
        bankName,
        accountNumber,
      });
      setShowEdit(false);
      setSelectedAccount(null);
      setBankName('');
      setAccountNumber('');
      loadAccounts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al actualizar cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar esta cuenta?')) return;
    try {
      await api.delete(`/admin/bank-accounts/${id}`);
      loadAccounts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al desactivar cuenta');
    }
  };

  const openEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setBankName(account.BankName);
    setAccountNumber(account.AccountNumber);
    setShowEdit(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Cuentas Bancarias</h1>
        <Button onClick={() => setShowCreate(true)}>Crear Cuenta</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Número de Cuenta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.ID}>
                  <TableCell className="font-medium">{account.BankName}</TableCell>
                  <TableCell>{account.AccountNumber}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${account.IsActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                      {account.IsActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEdit(account)}>
                        Editar
                      </Button>
                      {account.IsActive && (
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(account.ID)}>
                          Desactivar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay cuentas bancarias registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Crear */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Cuenta Bancaria</DialogTitle>
            <DialogDescription>Ingresa los datos de la nueva cuenta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Banco</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ej: Banco Popular"
              />
            </div>
            <div>
              <Label>Número de Cuenta</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Ej: 123456789"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!bankName || !accountNumber || loading}>
                Crear
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cuenta Bancaria</DialogTitle>
            <DialogDescription>Modifica los datos de la cuenta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Banco</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ej: Banco Popular"
              />
            </div>
            <div>
              <Label>Número de Cuenta</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Ej: 123456789"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEdit} disabled={!bankName || !accountNumber || loading}>
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setShowEdit(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
