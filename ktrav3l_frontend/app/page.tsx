'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Info } from 'lucide-react';
import { formatHour12 } from '@/lib/time-utils';

const formSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phoneNumber: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Formato: ###-###-####'),
  appointmentTypeID: z.string().min(1, 'Selecciona un tipo de cita'),
  bankTransfer: z.string().min(1, 'Selecciona un banco'),
  receipt: typeof window !== 'undefined' 
    ? z.instanceof(FileList)
        .refine((files) => files.length > 0, 'Debes subir el comprobante')
        .refine((files) => files[0]?.size <= 5 * 1024 * 1024, 'El archivo debe ser menor a 5 MB')
    : z.any(),
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState<number>();
  const [availableHours, setAvailableHours] = useState<number[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  const [shortID, setShortID] = useState('');
  const [fileName, setFileName] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  // Cargar tipos de cita y cuentas bancarias al montar
  useEffect(() => {
    api.get('/appointments/types').then((res) => {
      setAppointmentTypes(res.data.appointmentTypes || []);
    });
    api.get('/bank-accounts').then((res) => {
      setBankAccounts(res.data.accounts || []);
    });
  }, []);

  // Cargar horas disponibles cuando se selecciona una fecha
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedHour(undefined);

    try {
      const formatted = format(date, 'yyyy-MM-dd');
      const res = await api.get(`/appointments/available-hours?date=${formatted}`);
      setAvailableHours(res.data.availableHours || []);
    } catch (error) {
      console.error('Error loading available hours:', error);
    }
  };

  // Formatear el número de teléfono automáticamente
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('phoneNumber', formatted);
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedDate || selectedHour === undefined) {
      alert('Por favor selecciona fecha y hora');
      return;
    }

    // Guardar datos y mostrar modal de confirmación
    setPendingData(data);
    setShowConfirmation(true);
  };

  const confirmAndCreateAppointment = async () => {
    if (!pendingData || !selectedDate || selectedHour === undefined) return;

    setLoading(true);
    setShowConfirmation(false);

    try {
      const formData = new FormData();
      formData.append('firstName', pendingData.firstName);
      formData.append('lastName', pendingData.lastName);
      formData.append('email', pendingData.email);
      formData.append('phoneNumber', pendingData.phoneNumber);
      formData.append('appointmentDate', format(selectedDate, 'yyyy-MM-dd'));
      formData.append('appointmentHour', selectedHour.toString());
      formData.append('appointmentTypeID', pendingData.appointmentTypeID);
      formData.append('bankTransfer', pendingData.bankTransfer);
      formData.append('receipt', pendingData.receipt[0]);

      const res = await api.post('/appointments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShortID(res.data.shortID);
      setSuccess(true);
      setPendingData(null);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creando la reserva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-3 md:gap-6 w-full md:w-auto">
            <img src="/logo.png" alt="KTravel" className="h-16 md:h-20 w-auto" />
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Crear Reserva</h1>
              <p className="text-sm md:text-base text-gray-600">Agenda tu cita en pocos pasos</p>
            </div>
          </div>
          <Button variant="outline" asChild className="w-full md:w-auto">
            <a href="/status">Consultar Reserva</a>
          </Button>
        </div>

        <div className="grid md:grid-cols-[320px_1fr] gap-6">
          {/* Calendario - orden 2 en mobile, 1 en desktop */}
          <Card className="order-2 md:order-1">
            <CardHeader>
              <CardTitle>Selecciona Fecha y Hora</CardTitle>
              <CardDescription>Elige una fecha disponible</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const checkDate = new Date(date);
                  checkDate.setHours(0, 0, 0, 0);
                  return checkDate < today;
                }}
                className="rounded-md border"
              />

              {selectedDate && availableHours.length > 0 && (
                <div className="mt-4 w-full">
                  <Label>Horas Disponibles</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {availableHours.map((hour) => (
                      <Button
                        key={hour}
                        variant={selectedHour === hour ? 'default' : 'outline'}
                        onClick={() => setSelectedHour(hour)}
                        size="sm"
                      >
                        {formatHour12(hour)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDate && availableHours.length === 0 && (
                <p className="text-sm text-muted-foreground mt-4">No hay horas disponibles para esta fecha</p>
              )}

              {/* Botón solo visible en mobile, dentro del contenedor del calendario */}
              <div className="md:hidden mt-6 w-full">
                <Button 
                  onClick={() => {
                    const form = document.querySelector('form') as HTMLFormElement;
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  className="w-full" 
                  disabled={loading || !selectedDate || selectedHour === undefined}
                >
                  {loading ? 'Creando...' : 'Crear Reserva'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Formulario - orden 1 en mobile, 2 en desktop */}
          <Card className="order-1 md:order-2">
            <CardHeader>
              <CardTitle>Datos de la Reserva</CardTitle>
              <CardDescription>Completa tus datos para reservar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input id="firstName" {...register('firstName')} placeholder="Ej: Juan" />
                    {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input id="lastName" {...register('lastName')} placeholder="Ej: Pérez" />
                    {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} placeholder="Ej: juan.perez@email.com" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Teléfono</Label>
                  <Input
                    id="phoneNumber"
                    {...register('phoneNumber')}
                    onChange={handlePhoneChange}
                    placeholder="Ej: 809-555-1234"
                    maxLength={12}
                  />
                  {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber.message}</p>}
                </div>

                <div>
                  <Label htmlFor="appointmentTypeID">Tipo de Cita</Label>
                  <Select onValueChange={(value) => setValue('appointmentTypeID', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointmentTypes.map((type) => (
                        <SelectItem key={type.ID} value={type.ID.toString()}>
                          {type.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.appointmentTypeID && (
                    <p className="text-xs text-red-500 mt-1">{errors.appointmentTypeID.message}</p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <p className="font-semibold text-blue-900">Costo de la Reserva</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-900 mb-2">RD$ 2,000.00</p>
                    <p className="text-sm text-blue-800">
                      Para crear una reserva, debes realizar el pago de RD$ 2,000.00 y subir el comprobante de
                      transferencia. Selecciona un banco para ver el número de cuenta.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bankTransfer">Banco para Transferencia</Label>
                  <Select
                    onValueChange={(value) => {
                      setValue('bankTransfer', value);
                      const account = bankAccounts.find((acc) => acc.ID === value);
                      setSelectedBankAccount(account);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.ID} value={account.ID}>
                          {account.BankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.bankTransfer && <p className="text-xs text-red-500 mt-1">{errors.bankTransfer.message}</p>}
                  
                  {selectedBankAccount ? (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                      <p className="text-sm font-medium text-gray-700">Número de Cuenta</p>
                      <p className="text-lg font-bold text-gray-900 font-mono">{selectedBankAccount.AccountNumber}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">Selecciona un banco para ver el número de cuenta</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="receipt">Comprobante de Pago (JPG, PNG, PDF)</Label>
                  <Input id="receipt" type="file" accept=".jpg,.jpeg,.png,.pdf" {...register('receipt')} />
                  {errors.receipt && <p className="text-xs text-red-500 mt-1">{errors.receipt.message?.toString()}</p>}
                </div>

                {/* Botón solo visible en desktop */}
                <Button type="submit" className="w-full hidden md:block" disabled={loading || !selectedDate || selectedHour === undefined}>
                  {loading ? 'Creando...' : 'Crear Reserva'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de confirmación */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Confirmar Reserva?</DialogTitle>
            <DialogDescription>
              Verifica que los datos sean correctos antes de crear tu reserva.
            </DialogDescription>
          </DialogHeader>
          {pendingData && selectedDate && selectedHour !== undefined && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Nombre</p>
                  <p className="font-medium">{pendingData.firstName} {pendingData.lastName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo de servicio</p>
                  <p className="font-medium">{appointmentTypes.find(t => t.ID.toString() === pendingData.appointmentTypeID)?.Name || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{pendingData.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{pendingData.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha y hora</p>
                  <p className="font-medium">{format(selectedDate, 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: es })} a las {formatHour12(selectedHour)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Banco de transferencia</p>
                  <p className="font-medium">{selectedBankAccount?.BankName || 'No seleccionado'}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={confirmAndCreateAppointment} disabled={loading} className="flex-1">
                  {loading ? 'Creando...' : 'Confirmar'}
                </Button>
                <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de éxito */}
      <Dialog open={success} onOpenChange={(open) => {
        setSuccess(open);
        if (!open) {
          window.location.reload();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¡Reserva Creada Exitosamente!</DialogTitle>
            <DialogDescription>
              Tu código de reserva es: <span className="font-bold text-lg text-primary">{shortID}</span>
              <br />
              <br />
              Recibirás un email de confirmación. Tu reserva está pendiente de aprobación.
              <br />
              <br />
              Puedes consultar el estado en cualquier momento con tu código de reserva.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => {
            setSuccess(false);
            window.location.reload();
          }}>Cerrar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
