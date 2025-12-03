'use client';

import { useEffect, useState } from 'react';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayButton } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { formatHour12 } from '@/lib/time-utils';
import { toast } from 'sonner';

export default function CalendarAdminPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState<any>({});
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newHour, setNewHour] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBankAccounts();
  }, []);

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth]);

  useEffect(() => {
    if (showReceipt && selectedAppointment) {
      loadReceiptImage();
    }
  }, [showReceipt, selectedAppointment]);

  const loadReceiptImage = async () => {
    if (!selectedAppointment) return;
    try {
      const response = await api.get(`/admin/appointments/${selectedAppointment.id}/receipt`, {
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'];
      const url = URL.createObjectURL(response.data);
      
      // Si es PDF, agregar .pdf al final para que la lógica de detección funcione
      if (contentType === 'application/pdf') {
        setReceiptUrl(url + '#.pdf');
      } else {
        setReceiptUrl(url);
      }
    } catch (error) {
      console.error('Error loading receipt:', error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const res = await api.get('/admin/bank-accounts');
      setBankAccounts(res.data.bankAccounts || []);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const getBankName = (appointment: any) => {
    // Intentar con ambas variantes de mayúsculas/minúsculas
    const bankAccount = appointment.BankAccount || appointment.bankAccount;
    if (bankAccount?.BankName) {
      return bankAccount.BankName;
    }
    // Si no tiene BankAccount pero tiene bankTransfer con UUID, buscar en bankAccounts
    const bankTransfer = appointment.BankTransfer || appointment.bankTransfer;
    if (bankTransfer) {
      const bank = bankAccounts.find(b => b.ID === bankTransfer);
      return bank?.BankName || bankTransfer;
    }
    return 'No especificado';
  };

  const loadCalendarData = async () => {
    try {
      const month = format(currentMonth, 'yyyy-MM');
      const res = await api.get(`/admin/calendar?month=${month}`);
      setCalendarData(res.data.calendarData || {});
    } catch (error) {
      console.error('Error loading calendar:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
      done: 'bg-blue-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      done: 'Completada',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateKey = format(date, 'yyyy-MM-dd');
    const appointments = calendarData[dateKey] || [];
    if (appointments.length > 0) {
      // Mostrar lista de citas del día
    }
  };

  const handleApprove = async () => {
    if (!selectedAppointment) return;
    setLoading(true);
    try {
      await api.post(`/admin/appointments/${selectedAppointment.id}/approve`, {
        meetingLink,
        adminNote,
      });
      setShowApprove(false);
      setShowDetails(false);
      setMeetingLink('');
      setAdminNote('');
      loadCalendarData();
      toast.success('Cita aprobada exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error aprobando cita');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAppointment || !rejectionReason) return;
    setLoading(true);
    try {
      await api.post(`/admin/appointments/${selectedAppointment.id}/reject`, {
        reason: rejectionReason,
        adminNote,
      });
      setShowReject(false);
      setShowDetails(false);
      setRejectionReason('');
      setAdminNote('');
      loadCalendarData();
      toast.success('Cita rechazada');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error rechazando cita');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async () => {
    if (!selectedAppointment) return;
    setLoading(true);
    try {
      await api.post(`/admin/appointments/${selectedAppointment.id}/done`);
      setShowDetails(false);
      loadCalendarData();
      toast.success('Cita marcada como completada');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error actualizando cita');
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (!selectedAppointment || !newDate || !newHour) return;
    setLoading(true);
    try {
      await api.patch(`/admin/appointments/${selectedAppointment.id}/move`, {
        newDate,
        newHour: parseInt(newHour),
      });
      setShowMove(false);
      setShowDetails(false);
      loadCalendarData();
      toast.success('Cita movida exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error moviendo cita');
    } finally {
      setLoading(false);
    }
  };

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const appointmentsForDay = calendarData[dateKey] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-6 p-6">
      {/* Panel Izquierdo - Calendario */}
      <div className="space-y-4 overflow-auto max-h-[calc(100vh-6rem)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Calendario de Citas</h1>
          <p className="text-sm text-muted-foreground mb-3">
            Los días con puntos tienen citas programadas
          </p>
          <div className="flex gap-3 text-xs justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Pendiente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Aprobada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Rechazada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Completada</span>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                onSelect={(date) => date && handleDateClick(date)}
                className="rounded-md border"
                components={{
                  DayButton: ({ day, ...buttonProps }: React.ComponentProps<typeof DayButton>) => {
                    const dayAppointments = calendarData[format(day.date, 'yyyy-MM-dd')] || [];
                    
                    return (
                      <CalendarDayButton
                        day={day}
                        {...buttonProps}
                      >
                        {day.date.getDate()}
                        {dayAppointments.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayAppointments.slice(0, 4).map((apt: any, idx: number) => (
                              <div
                                key={idx}
                                className={cn(
                                  "w-1 h-1 rounded-full",
                                  getStatusColor(apt.status)
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </CalendarDayButton>
                    );
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Fecha seleccionada:
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </CardHeader>
          <CardContent>
            {appointmentsForDay.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay citas programadas para este día</p>
            ) : (
              <div>
                <p className="text-sm font-medium mb-3">Citas:</p>
                <div className="space-y-2">
                  {appointmentsForDay.map((apt: any) => (
                    <div
                      key={apt.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors",
                        selectedAppointment?.id === apt.id && "bg-blue-50 border-blue-300"
                      )}
                      onClick={() => setSelectedAppointment(apt)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(apt.status)}`}></div>
                        <div>
                          <p className="font-medium text-sm">{apt.firstName} {apt.lastName}</p>
                          <p className="text-xs text-muted-foreground">{apt.type} • {apt.hour}:00</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(apt.status)} text-white`}>
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panel Derecho - Detalles de la Cita */}
      {selectedAppointment ? (
        <Card className="overflow-auto max-h-[calc(100vh-6rem)]">
          <CardHeader className="border-b sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detalles de la Cita</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Código: {selectedAppointment.shortID}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedAppointment(null)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Información del cliente */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-4">Información del Cliente</h3>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground mb-1">Nombre</p>
                    <p className="font-medium">{selectedAppointment.firstName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Apellido</p>
                    <p className="font-medium">{selectedAppointment.lastName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <p className="font-medium break-all">{selectedAppointment.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Teléfono</p>
                  <p className="font-medium">{selectedAppointment.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Estado</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(selectedAppointment.status)} text-white`}>
                    {getStatusLabel(selectedAppointment.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones de contacto */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">Contactar Cliente</h3>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://wa.me/${selectedAppointment.phoneNumber.replace(/\D/g, '')}`, '_blank')}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${selectedAppointment.phoneNumber}`, '_self')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Llamar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${selectedAppointment.email}`, '_self')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </Button>
              </div>
            </div>

            {/* Detalles de la cita */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-4">Detalles de la Cita</h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Tipo de servicio</p>
                  <p className="font-medium">{selectedAppointment.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Fecha y hora</p>
                  <p className="font-medium suppressHydrationWarning">
                    {selectedAppointment.date} a las {selectedAppointment.hour}:00
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Banco de transferencia</p>
                  <p className="font-medium capitalize">{getBankName(selectedAppointment)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Comprobante de pago</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReceipt(true)}
                    className="inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver comprobante
                  </Button>
                </div>
                {selectedAppointment.notes && (
                  <div>
                    <p className="text-muted-foreground mb-1">Notas adicionales</p>
                    <p className="font-medium">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones de gestión */}
            <div>
              <h3 className="font-semibold mb-3">Gestionar Cita</h3>
              <div className="flex gap-2 flex-wrap">
                {selectedAppointment.status === 'pending' && (
                  <>
                    <Button onClick={() => setShowApprove(true)}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Aprobar
                    </Button>
                    <Button variant="destructive" onClick={() => setShowReject(true)}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Rechazar
                    </Button>
                  </>
                )}
                {selectedAppointment.status === 'approved' && (
                  <Button onClick={handleMarkDone} disabled={loading}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Marcar como Completada
                  </Button>
                )}
                {selectedAppointment.status !== 'done' && (
                  <Button variant="outline" onClick={() => setShowMove(true)}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Mover Cita
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="h-full flex items-center justify-center">
          <CardContent className="text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Selecciona una cita</h3>
            <p className="text-sm text-muted-foreground">
              Haz clic en una cita para ver sus detalles y opciones de gestión
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sheet de Comprobante */}
      <Sheet open={showReceipt} onOpenChange={setShowReceipt}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedAppointment && (
            <>
              <SheetHeader className="space-y-3 pb-6 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <SheetTitle className="text-2xl">Comprobante de Pago</SheetTitle>
                    <SheetDescription className="text-base">
                      Reserva #{selectedAppointment.shortID}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Información de la reserva */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detalles de la Reserva</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                        <p className="text-base font-semibold">{selectedAppointment.firstName} {selectedAppointment.lastName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Cita</p>
                        <p className="text-base font-semibold">{selectedAppointment.date} - {formatHour12(selectedAppointment.hour)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Banco de Transferencia</p>
                        <p className="text-base font-semibold capitalize">{getBankName(selectedAppointment)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Cita</p>
                        <p className="text-base font-semibold">{selectedAppointment.date} - {formatHour12(selectedAppointment.hour)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Imagen del comprobante */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Comprobante de Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      {receiptUrl ? (
                        receiptUrl.toLowerCase().endsWith('.pdf') ? (
                          <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <svg className="h-16 w-16 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm font-medium">Comprobante en formato PDF</p>
                            <Button asChild>
                              <a href={receiptUrl} target="_blank" rel="noopener noreferrer" download>
                                Descargar PDF
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <img 
                            src={receiptUrl}
                            alt="Comprobante de pago"
                            className="w-full h-auto rounded-md shadow-sm"
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 space-y-3">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <svg className="h-6 w-6 text-muted-foreground animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">Cargando comprobante...</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <SheetFooter className="mt-6 pt-6 border-t">
                <Button 
                  onClick={() => setShowReceipt(false)} 
                  className="w-full"
                  size="lg"
                >
                  Cerrar
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de aprobación */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Cita</DialogTitle>
            <DialogDescription>Ingresa el enlace de la reunión y una nota para el cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Enlace de Reunión (Zoom/Google Meet)</Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                type="url"
              />
            </div>
            <div>
              <Label>Nota para el Cliente (Opcional)</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Ej: Clave de acceso: 123456"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={loading}>
                Aprobar
              </Button>
              <Button variant="outline" onClick={() => setShowApprove(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de rechazo */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Cita</DialogTitle>
            <DialogDescription>Ingresa la razón del rechazo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Razón de rechazo</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: Comprobante de pago no válido"
                rows={4}
              />
            </div>
            <div>
              <Label>Nota para el Cliente (Opcional)</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Ej: Puedes volver a enviar el comprobante correcto"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReject} disabled={!rejectionReason || loading}>
                Rechazar
              </Button>
              <Button variant="outline" onClick={() => setShowReject(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de mover */}
      <Dialog open={showMove} onOpenChange={setShowMove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Cita</DialogTitle>
            <DialogDescription>Selecciona la nueva fecha y hora</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nueva Fecha</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div>
              <Label>Nueva Hora</Label>
              <Input type="number" min="9" max="17" value={newHour} onChange={(e) => setNewHour(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleMove} disabled={!newDate || !newHour || loading}>
                Mover
              </Button>
              <Button variant="outline" onClick={() => setShowMove(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
