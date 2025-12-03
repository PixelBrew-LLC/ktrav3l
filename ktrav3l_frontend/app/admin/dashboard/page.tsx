'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, done: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/appointments');
        const appointments = res.data.appointments || [];
        
        const stats = {
          pending: appointments.filter((a: any) => a.Status === 'pending').length,
          approved: appointments.filter((a: any) => a.Status === 'approved').length,
          rejected: appointments.filter((a: any) => a.Status === 'rejected').length,
          done: appointments.filter((a: any) => a.Status === 'done').length,
          total: appointments.length,
        };
        
        setStats(stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl text-blue-600">{stats.total}</CardTitle>
            <CardDescription>Total Citas</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-4xl text-yellow-600">{stats.pending}</CardTitle>
            <CardDescription>Pendientes</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-4xl text-green-600">{stats.approved}</CardTitle>
            <CardDescription>Aprobadas</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-4xl text-red-600">{stats.rejected}</CardTitle>
            <CardDescription>Rechazadas</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-4xl text-blue-800">{stats.done}</CardTitle>
            <CardDescription>Completadas</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Bienvenido al Panel de Administración</CardTitle>
          <CardDescription>
            Desde aquí puedes gestionar todas las reservas de tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Ver y gestionar citas en el calendario</li>
            <li>Aprobar o rechazar reservas pendientes</li>
            <li>Gestionar tipos de cita</li>
            <li>Configurar reglas de disponibilidad</li>
            <li>Contactar clientes por WhatsApp, Email o Teléfono</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
