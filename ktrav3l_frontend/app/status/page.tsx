'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

export default function StatusPage() {
  const [shortID, setShortID] = useState('');
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!shortID) {
      setError('Ingresa el código de reserva');
      return;
    }

    setLoading(true);
    setError('');
    setAppointment(null);

    try {
      const res = await api.get(`/appointments/short/${shortID}`);
      setAppointment(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se encontró la reserva');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { text: 'Pendiente', class: 'bg-yellow-100 text-yellow-800' },
      approved: { text: 'Aprobada', class: 'bg-green-100 text-green-800' },
      rejected: { text: 'Rechazada', class: 'bg-red-100 text-red-800' },
      done: { text: 'Completada', class: 'bg-blue-100 text-blue-800' },
    };
    const badge = badges[status as keyof typeof badges] || { text: status, class: 'bg-gray-100 text-gray-800' };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="KTravel" className="h-12 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Consultar Reserva</h1>
          <p className="text-gray-600">Ingresa tu código de reserva para ver el estado</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Reserva</CardTitle>
            <CardDescription>Ingresa el código de 8 caracteres que recibiste por email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="shortID">Código de Reserva</Label>
                <Input
                  id="shortID"
                  value={shortID}
                  onChange={(e) => setShortID(e.target.value.trim())}
                  placeholder="Ej. 28bb1fb7"
                  maxLength={8}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} className="self-end">
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </CardContent>
        </Card>

        {appointment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Detalles de la Reserva
                {getStatusBadge(appointment.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Código</p>
                  <p className="text-lg font-semibold">{appointment.shortID}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <p className="text-lg">{getStatusBadge(appointment.status)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                  <p className="text-lg">{appointment.firstName} {appointment.lastName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-lg">{appointment.email}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                <p className="text-lg">{appointment.phoneNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                  <p className="text-lg">{new Date(appointment.appointmentDate).toLocaleDateString('es', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hora</p>
                  <p className="text-lg">{appointment.appointmentHour}:00</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo de Cita</p>
                <p className="text-lg">{appointment.appointmentType}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Banco de Transferencia</p>
                <p className="text-lg capitalize">{appointment.bankTransfer}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Comprobante de Pago</p>
                <Button
                  variant="outline"
                  onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/appointments/receipt/${appointment.shortID}`, '_blank')}
                >
                  Ver Comprobante
                </Button>
              </div>

              {appointment.status === 'rejected' && appointment.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-900 mb-1">Razón de Rechazo</p>
                  <p className="text-red-800">{appointment.rejectionReason}</p>
                </div>
              )}

              {appointment.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-900 font-medium">
                    ✓ Tu reserva ha sido aprobada. Por favor asiste con puntualidad.
                  </p>
                </div>
              )}

              {appointment.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-900 font-medium">
                    Tu reserva está pendiente de aprobación. Recibirás un email cuando sea procesada.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6">
          <Button variant="link" asChild>
            <a href="/">Hacer una nueva reserva</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
