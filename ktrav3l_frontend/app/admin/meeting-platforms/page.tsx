'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { toast } from 'sonner';

interface MeetingPlatform {
    ID: string;
    Name: string;
    IsActive: boolean;
}

export default function MeetingPlatformsPage() {
    const [platforms, setPlatforms] = useState<MeetingPlatform[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<MeetingPlatform | null>(null);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadPlatforms();
    }, []);

    const loadPlatforms = async () => {
        try {
            const res = await api.get('/admin/meeting-platforms');
            setPlatforms(res.data.meetingPlatforms || []);
        } catch (error) {
            console.error('Error loading platforms:', error);
        }
    };

    const handleCreate = async () => {
        if (!name) return;
        setLoading(true);
        try {
            await api.post('/admin/meeting-platforms', { name });
            setShowCreate(false);
            setName('');
            loadPlatforms();
            toast.success('Plataforma creada exitosamente');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al crear plataforma');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedPlatform || !name) return;
        setLoading(true);
        try {
            await api.patch(`/admin/meeting-platforms/${selectedPlatform.ID}`, { name });
            setShowEdit(false);
            setSelectedPlatform(null);
            setName('');
            loadPlatforms();
            toast.success('Plataforma actualizada');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al actualizar plataforma');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (platform: MeetingPlatform) => {
        try {
            await api.patch(`/admin/meeting-platforms/${platform.ID}`, {
                isActive: !platform.IsActive,
            });
            loadPlatforms();
            toast.success(platform.IsActive ? 'Plataforma desactivada' : 'Plataforma activada');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al actualizar plataforma');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta plataforma?')) return;
        try {
            await api.delete(`/admin/meeting-platforms/${id}`);
            loadPlatforms();
            toast.success('Plataforma eliminada');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al eliminar plataforma');
        }
    };

    const openEdit = (platform: MeetingPlatform) => {
        setSelectedPlatform(platform);
        setName(platform.Name);
        setShowEdit(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Plataformas de Reunión</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Gestiona las plataformas donde se realizarán las citas
                    </p>
                </div>
                <Button onClick={() => { setName(''); setShowCreate(true); }}>
                    Agregar plataforma
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {platforms.map((platform) => (
                                <TableRow key={platform.ID}>
                                    <TableCell className="font-medium">{platform.Name}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${platform.IsActive
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-gray-50 text-gray-500 border border-gray-200'
                                            }`}>
                                            {platform.IsActive ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="outline" onClick={() => openEdit(platform)}>
                                                Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleToggleActive(platform)}
                                            >
                                                {platform.IsActive ? 'Desactivar' : 'Activar'}
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(platform.ID)}>
                                                Eliminar
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {platforms.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                        No hay plataformas registradas. Agrega una para empezar.
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
                        <DialogTitle>Agregar Plataforma</DialogTitle>
                        <DialogDescription>Ingresa el nombre de la nueva plataforma de reunión</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Zoom, Google Meet, WhatsApp..."
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleCreate} disabled={!name || loading} className="flex-1">
                                {loading ? 'Creando...' : 'Crear'}
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
                        <DialogTitle>Editar Plataforma</DialogTitle>
                        <DialogDescription>Modifica el nombre de la plataforma</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Zoom, Google Meet, WhatsApp..."
                                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleEdit} disabled={!name || loading} className="flex-1">
                                {loading ? 'Guardando...' : 'Guardar'}
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
