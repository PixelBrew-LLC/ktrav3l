'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { Plus, Eye, EyeOff } from 'lucide-react';

export default function AppointmentTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const res = await api.get('/admin/appointment-types');
      setTypes(res.data.appointmentTypes || []);
    } catch (error) {
      console.error('Error loading types:', error);
    }
  };

  const handleCreate = async () => {
    if (!newTypeName.trim()) return;
    setLoading(true);
    try {
      await api.post('/admin/appointment-types', { name: newTypeName });
      setNewTypeName('');
      setShowCreate(false);
      loadTypes();
      alert('Tipo de cita creado');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creando tipo');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (id: number, visible: boolean) => {
    setLoading(true);
    try {
      await api.patch(`/admin/appointment-types/${id}/visibility`, { visible: !visible });
      loadTypes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error actualizando visibilidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tipos de Cita</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Tipo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {types.map((type) => (
              <div key={type.ID} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  {type.Visible ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">{type.Name}</p>
                    <p className="text-sm text-muted-foreground">
                      {type.Visible ? 'Visible para clientes' : 'Oculto'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={type.Visible}
                    onCheckedChange={() => handleToggleVisibility(type.ID, type.Visible)}
                    disabled={loading}
                  />
                </div>
              </div>
            ))}
            {types.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No hay tipos de cita. Crea uno para comenzar.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal crear */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Tipo de Cita</DialogTitle>
            <DialogDescription>Crea un nuevo tipo de cita para tus clientes</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Tipo</Label>
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Ej: Residencia de Italia"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!newTypeName.trim() || loading}>
                Crear
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
