'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import api from '@/lib/api';
import { MoreHorizontal, Plus, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatHour12, formatPhoneDisplay } from '@/lib/time-utils';
import { toast } from 'sonner';

export default function AppointmentsTablePage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('AppointmentDate');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [newDate, setNewDate] = useState<Date>();
  const [newHour, setNewHour] = useState<number>();
  const [availableHours, setAvailableHours] = useState<number[]>([]);
  const [moveNote, setMoveNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin create appointment state
  const [showAdminCreate, setShowAdminCreate] = useState(false);
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '',
    appointmentDate: '', appointmentHour: -1, appointmentTypeId: '',
    meetingLink: '', adminNote: '', meetingPlatformId: '',
  });
  const [createAvailableHours, setCreateAvailableHours] = useState<number[]>([]);
  const [createDate, setCreateDate] = useState<Date>();

  // Platform assignment state
  const [showPlatform, setShowPlatform] = useState(false);
  const [meetingPlatforms, setMeetingPlatforms] = useState<any[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState('');

  useEffect(() => {
    loadBankAccounts();
    loadAppointments();
    loadAppointmentTypes();
    loadMeetingPlatforms();
  }, []);

  useEffect(() => {
    filterAndSort();
  }, [appointments, statusFilter, searchTerm, sortField, sortDir]);

  useEffect(() => {
    if (showReceipt && selectedAppointment) {
      loadReceiptImage();
    }
  }, [showReceipt, selectedAppointment]);

  const loadReceiptImage = async () => {
    if (!selectedAppointment) return;
    try {
      const response = await api.get(`/admin/appointments/${selectedAppointment.ID}/receipt`, {
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

  const loadAppointments = async () => {
    try {
      const res = await api.get('/admin/appointments');
      setAppointments(res.data.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadAppointmentTypes = async () => {
    try {
      const res = await api.get('/admin/appointment-types');
      setAppointmentTypes(res.data.appointmentTypes || []);
    } catch (error) {
      console.error('Error loading appointment types:', error);
    }
  };

  const loadMeetingPlatforms = async () => {
    try {
      const res = await api.get('/admin/meeting-platforms');
      setMeetingPlatforms((res.data.meetingPlatforms || []).filter((p: any) => p.IsActive));
    } catch (error) {
      console.error('Error loading meeting platforms:', error);
    }
  };

  const filterAndSort = () => {
    let filtered = [...appointments];

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.Status === statusFilter);
    }

    // Búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.FirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.LastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.ShortID?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'AppointmentDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (sortDir === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredAppointments(filtered);
  };

  const formatPhone = (phone: string) => formatPhoneDisplay(phone);

  const handleWhatsApp = (phone: string, name: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${name}, te contactamos desde KTravel...`);
    window.open(`https://wa.me/1${cleaned}?text=${message}`, '_blank');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  const handleCall = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    window.open(`tel:+1${cleaned}`);
  };

  const handleApprove = async () => {
    if (!selectedAppointment) return;
    setLoading(true);
    try {
      await api.post(`/admin/appointments/${selectedAppointment.ID}/approve`, {
        meetingLink,
        adminNote,
      });
      setShowApprove(false);
      setMeetingLink('');
      setAdminNote('');
      loadAppointments();
      toast.success('Cita aprobada exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al aprobar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAppointment || !rejectionReason) return;
    setLoading(true);
    try {
      await api.post(`/admin/appointments/${selectedAppointment.ID}/reject`, {
        reason: rejectionReason,
        adminNote,
      });
      setShowReject(false);
      setRejectionReason('');
      setAdminNote('');
      loadAppointments();
      toast.success('Cita rechazada');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al rechazar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async () => {
    if (!appointmentToComplete) return;
    setLoading(true);
    try {
      await api.post(`/admin/appointments/${appointmentToComplete.ID}/done`);
      setShowDone(false);
      setAppointmentToComplete(null);
      loadAppointments();
      toast.success('Cita marcada como completada');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al completar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;

    // Normalizar la fecha para evitar problemas de timezone
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setNewDate(normalizedDate);
    setNewHour(undefined);

    try {
      const year = normalizedDate.getFullYear();
      const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
      const day = String(normalizedDate.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;

      const res = await api.get(`/appointments/available-hours?date=${formatted}`);
      setAvailableHours(res.data.availableHours || []);
    } catch (error) {
      console.error('Error loading available hours:', error);
      toast.error('Error al cargar horas disponibles');
    }
  };

  const handleMove = async () => {
    if (!selectedAppointment || !newDate || newHour === undefined) {
      toast.error('Por favor selecciona fecha y hora');
      return;
    }

    setLoading(true);
    try {
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      await api.patch(`/admin/appointments/${selectedAppointment.ID}/move`, {
        newDate: formattedDate,
        newHour: newHour,
        adminNote: moveNote || undefined,
      });
      setShowMove(false);
      setNewDate(undefined);
      setNewHour(undefined);
      setMoveNote('');
      loadAppointments();
      toast.success('Cita movida exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al mover la cita');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: { text: 'Pendiente', class: 'bg-amber-100 text-amber-800 border border-amber-200' },
      approved: { text: 'Aprobada', class: 'bg-green-50 text-green-700 border border-green-200' },
      rejected: { text: 'Rechazada', class: 'bg-red-50 text-red-700 border border-red-200' },
      done: { text: 'Completada', class: 'bg-blue-50 text-blue-700 border border-blue-200' },
    };
    const badge = badges[status] || { text: status, class: 'bg-gray-100 text-gray-600' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>{badge.text}</span>;
  };

  const handleAdminCreate = async () => {
    if (!createForm.firstName || !createForm.lastName || !createForm.appointmentDate || createForm.appointmentHour < 0 || !createForm.appointmentTypeId || !createForm.meetingPlatformId) {
      toast.error('Completa los campos requeridos: nombre, apellido, fecha, hora, tipo y plataforma');
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/appointments', {
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        email: createForm.email || undefined,
        phoneNumber: createForm.phoneNumber || undefined,
        appointmentDate: createForm.appointmentDate,
        appointmentHour: createForm.appointmentHour,
        appointmentTypeId: parseInt(createForm.appointmentTypeId),
        meetingPlatformId: createForm.meetingPlatformId,
        meetingLink: createForm.meetingLink || undefined,
        adminNote: createForm.adminNote || undefined,
      });
      setShowAdminCreate(false);
      setCreateForm({ firstName: '', lastName: '', email: '', phoneNumber: '', appointmentDate: '', appointmentHour: -1, appointmentTypeId: '', meetingLink: '', adminNote: '', meetingPlatformId: '' });
      setCreateDate(undefined);
      setCreateAvailableHours([]);
      loadAppointments();
      toast.success('Cita creada exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setCreateDate(normalizedDate);
    setCreateForm(prev => ({
      ...prev,
      appointmentDate: `${normalizedDate.getFullYear()}-${String(normalizedDate.getMonth() + 1).padStart(2, '0')}-${String(normalizedDate.getDate()).padStart(2, '0')}`,
      appointmentHour: -1,
    }));
    try {
      const formatted = `${normalizedDate.getFullYear()}-${String(normalizedDate.getMonth() + 1).padStart(2, '0')}-${String(normalizedDate.getDate()).padStart(2, '0')}`;
      const res = await api.get(`/appointments/available-hours?date=${formatted}`);
      setCreateAvailableHours(res.data.availableHours || []);
    } catch { setCreateAvailableHours([]); }
  };

  const handleAssignPlatform = async () => {
    if (!selectedAppointment || !selectedPlatformId) return;
    setLoading(true);
    try {
      await api.patch(`/admin/appointments/${selectedAppointment.ID}/platform`, {
        meetingPlatformId: selectedPlatformId,
      });
      setShowPlatform(false);
      setSelectedPlatformId('');
      loadAppointments();
      toast.success('Plataforma asignada');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al asignar plataforma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tabla de Citas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona todas las reservas</p>
        </div>
        <Button onClick={() => setShowAdminCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />Nueva Cita
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="approved">Aprobada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                  <SelectItem value="done">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="Nombre, email, código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ordenar por</Label>
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AppointmentDate">Fecha</SelectItem>
                  <SelectItem value="FirstName">Nombre</SelectItem>
                  <SelectItem value="Status">Estado</SelectItem>
                  <SelectItem value="CreatedAt">Creación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Select value={sortDir} onValueChange={setSortDir}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascendente</SelectItem>
                  <SelectItem value="desc">Descendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((apt) => (
                <TableRow key={apt.ID}>
                  <TableCell className="font-mono">{apt.ShortID}</TableCell>
                  <TableCell>
                    {apt.FirstName} {apt.LastName}
                  </TableCell>
                  <TableCell>{new Date(apt.AppointmentDate).toLocaleDateString()}</TableCell>
                  <TableCell>{apt.AppointmentHour}:00</TableCell>
                  <TableCell>{apt.AppointmentType?.Name}</TableCell>
                  <TableCell>{getStatusBadge(apt.Status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => {
                          setSelectedAppointment(apt);
                          setShowReceipt(true);
                        }}>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver comprobante
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleWhatsApp(apt.PhoneNumber, apt.FirstName)}>
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCall(apt.PhoneNumber)}>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Llamar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEmail(apt.Email)}>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {apt.Status === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => {
                              setSelectedAppointment(apt);
                              setShowApprove(true);
                            }}>
                              Aprobar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedAppointment(apt);
                              setShowReject(true);
                            }}>
                              <span className="text-red-600">Rechazar</span>
                            </DropdownMenuItem>
                          </>
                        )}
                        {apt.Status === 'approved' && (
                          <DropdownMenuItem onClick={() => {
                            setAppointmentToComplete(apt);
                            setShowDone(true);
                          }} disabled={loading}>
                            Completar
                          </DropdownMenuItem>
                        )}
                        {apt.Status !== 'done' && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedAppointment(apt);
                            setShowMove(true);
                          }}>
                            Mover fecha
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          setSelectedAppointment(apt);
                          setSelectedPlatformId(apt.MeetingPlatformID || '');
                          setShowPlatform(true);
                        }}>
                          Asignar plataforma
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedAppointment(apt);
                          setShowDetails(true);
                        }}>
                          Ver detalles
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                      Reserva #{selectedAppointment.ShortID}
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
                        <p className="text-base font-semibold">{selectedAppointment.FirstName} {selectedAppointment.LastName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Tipo de Servicio</p>
                        <p className="text-base font-semibold">{selectedAppointment.AppointmentType?.Name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Banco de Transferencia</p>
                        <p className="text-base font-semibold capitalize">{getBankName(selectedAppointment)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Cita</p>
                        <p className="text-base font-semibold capitalize">
                          {format(new Date(selectedAppointment.AppointmentDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })} - {formatHour12(selectedAppointment.AppointmentHour)}
                        </p>
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

      {/* Modal detalles */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles de la Cita</DialogTitle>
            <DialogDescription>Información completa de la reserva</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-mono font-medium">{selectedAppointment.ShortID}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <div>{getStatusBadge(selectedAppointment.Status)}</div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedAppointment.FirstName} {selectedAppointment.LastName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{selectedAppointment.AppointmentType?.Name}</p>
                </div>
                {selectedAppointment.Email && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedAppointment.Email}</p>
                  </div>
                )}
                {selectedAppointment.PhoneNumber && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="text-sm">{formatPhone(selectedAppointment.PhoneNumber)}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Banco</p>
                  <p className="text-sm capitalize">{getBankName(selectedAppointment)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Fecha y Hora</p>
                  <p className="text-sm capitalize">
                    {format(new Date(selectedAppointment.AppointmentDate + 'T12:00:00'), "dd MMM yyyy", { locale: es })} - {formatHour12(selectedAppointment.AppointmentHour)}
                  </p>
                </div>
              </div>

              {/* Plataforma */}
              {selectedAppointment.MeetingPlatform && (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Plataforma</p>
                  <p className="font-medium">{selectedAppointment.MeetingPlatform.Name}</p>
                </div>
              )}

              {/* Meeting Link */}
              {selectedAppointment.MeetingLink && (
                <div className="rounded-lg border p-3 bg-blue-50">
                  <p className="text-sm text-muted-foreground mb-1">Enlace de Reunión</p>
                  <a
                    href={selectedAppointment.MeetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    {selectedAppointment.MeetingLink}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Admin Note */}
              {selectedAppointment.AdminNote && (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Nota del Admin</p>
                  <p className="text-sm">{selectedAppointment.AdminNote}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedAppointment.RejectionReason && (
                <div className="rounded-lg border p-3 bg-red-50">
                  <p className="text-sm text-muted-foreground mb-1">Razón de Rechazo</p>
                  <p className="text-sm">{selectedAppointment.RejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Modal rechazo */}
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
                placeholder="Razón..."
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

      {/* Modal mover */}
      <Dialog open={showMove} onOpenChange={(open) => {
        setShowMove(open);
        if (!open) {
          setNewDate(undefined);
          setNewHour(undefined);
          setMoveNote('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mover Cita</DialogTitle>
            <DialogDescription>
              Selecciona una nueva fecha y hora disponible para la cita
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Calendario */}
            <div>
              <Label>Selecciona la Nueva Fecha</Label>
              <div className="flex justify-center mt-2">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const checkDate = new Date(date);
                    checkDate.setHours(0, 0, 0, 0);
                    return checkDate < today;
                  }}
                  locale={es}
                  className="rounded-md border"
                />
              </div>
            </div>

            {/* Mostrar fecha seleccionada */}
            {newDate && (
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900">
                  {format(newDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            )}

            {/* Horas disponibles */}
            {newDate && (
              <div>
                <Label>Selecciona la Nueva Hora</Label>
                {availableHours.length === 0 ? (
                  <p className="text-sm text-gray-500 mt-2">No hay horas disponibles para esta fecha</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {availableHours.map((hour) => (
                      <Button
                        key={hour}
                        variant={newHour === hour ? 'default' : 'outline'}
                        onClick={() => setNewHour(hour)}
                        className="h-12"
                      >
                        {formatHour12(hour)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Nota administrativa (solo si ya está aprobada) */}
            {selectedAppointment?.Status === 'approved' && (
              <div>
                <Label htmlFor="moveNote">Nota (Opcional)</Label>
                <Textarea
                  id="moveNote"
                  placeholder="Agrega una nota sobre el cambio de cita..."
                  value={moveNote}
                  onChange={(e) => setMoveNote(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2">
              <Button
                onClick={handleMove}
                disabled={!newDate || newHour === undefined || loading}
                className="flex-1"
              >
                {loading ? 'Moviendo...' : 'Mover Cita'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowMove(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación - Completar Cita */}
      <Dialog open={showDone} onOpenChange={setShowDone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Completar Cita</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas marcar esta cita como completada?
            </DialogDescription>
          </DialogHeader>
          {appointmentToComplete && (
            <div className="space-y-2">
              <p><strong>Cliente:</strong> {appointmentToComplete.FirstName} {appointmentToComplete.LastName}</p>
              <p><strong>Tipo:</strong> {appointmentToComplete.AppointmentType?.Name}</p>
              <p><strong>Fecha:</strong> {format(new Date(appointmentToComplete.AppointmentDate), "dd 'de' MMMM 'de' yyyy", { locale: es })} a las {appointmentToComplete.AppointmentHour}:00</p>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleMarkDone} disabled={loading} className="flex-1">
              {loading ? 'Completando...' : 'Confirmar'}
            </Button>
            <Button variant="outline" onClick={() => setShowDone(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal Admin Create Appointment */}
      <Dialog open={showAdminCreate} onOpenChange={(open) => {
        setShowAdminCreate(open);
        if (!open) {
          setCreateForm({ firstName: '', lastName: '', email: '', phoneNumber: '', appointmentDate: '', appointmentHour: -1, appointmentTypeId: '', meetingLink: '', adminNote: '', meetingPlatformId: '' });
          setCreateDate(undefined);
          setCreateAvailableHours([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Cita (Admin)</DialogTitle>
            <DialogDescription>
              Crea una cita directamente. Se creará con estado aprobado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido *</Label>
                <Input
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Apellido"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  value={createForm.phoneNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    let formatted = digits;
                    if (digits.length > 3 && digits.length <= 6) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                    else if (digits.length > 6) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
                    setCreateForm(prev => ({ ...prev, phoneNumber: formatted }));
                  }}
                  placeholder="809-555-1234"
                  maxLength={12}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Cita *</Label>
              <Select
                value={createForm.appointmentTypeId}
                onValueChange={(val) => setCreateForm(prev => ({ ...prev, appointmentTypeId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.filter((t: any) => t.Visible).map((type: any) => (
                    <SelectItem key={type.ID} value={String(type.ID)}>
                      {type.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Calendar */}
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={createDate}
                  onSelect={handleCreateDateSelect}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  locale={es}
                  className="rounded-md border"
                />
              </div>
            </div>

            {createDate && (
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-900 text-sm">
                  {format(createDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            )}

            {createDate && (
              <div className="space-y-2">
                <Label>Hora *</Label>
                {createAvailableHours.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay horas disponibles</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {createAvailableHours.map((hour) => (
                      <Button
                        key={hour}
                        variant={createForm.appointmentHour === hour ? 'default' : 'outline'}
                        onClick={() => setCreateForm(prev => ({ ...prev, appointmentHour: hour }))}
                        size="sm"
                      >
                        {formatHour12(hour)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Plataforma *</Label>
              <Select
                value={createForm.meetingPlatformId}
                onValueChange={(val) => setCreateForm(prev => ({ ...prev, meetingPlatformId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {meetingPlatforms.map((platform: any) => (
                    <SelectItem key={platform.ID} value={platform.ID}>
                      {platform.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Enlace de Reunión <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                value={createForm.meetingLink}
                onChange={(e) => setCreateForm(prev => ({ ...prev, meetingLink: e.target.value }))}
                placeholder="https://zoom.us/j/..."
                type="url"
              />
            </div>

            <div className="space-y-2">
              <Label>Nota <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea
                value={createForm.adminNote}
                onChange={(e) => setCreateForm(prev => ({ ...prev, adminNote: e.target.value }))}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdminCreate} disabled={loading} className="flex-1">
                {loading ? 'Creando...' : 'Crear Cita'}
              </Button>
              <Button variant="outline" onClick={() => setShowAdminCreate(false)} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Asignar Plataforma */}
      <Dialog open={showPlatform} onOpenChange={setShowPlatform}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Plataforma</DialogTitle>
            <DialogDescription>
              Selecciona la plataforma donde se realizará la reunión
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select value={selectedPlatformId} onValueChange={setSelectedPlatformId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {meetingPlatforms.map((platform: any) => (
                    <SelectItem key={platform.ID} value={platform.ID}>
                      {platform.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAssignPlatform} disabled={!selectedPlatformId || loading} className="flex-1">
                {loading ? 'Asignando...' : 'Asignar'}
              </Button>
              <Button variant="outline" onClick={() => setShowPlatform(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
