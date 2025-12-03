'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import api from '@/lib/api';
import { formatHour12, generateAll24Hours } from '@/lib/time-utils';
import { Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const daysOfWeek = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

interface AvailabilityRule {
  ID: number;
  DayOfWeek?: number;
  SpecificDate?: string;
  UnavailableHours: number[];
  AllDay: boolean;
}

export default function AvailabilityPage() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [weekdayRules, setWeekdayRules] = useState<Map<number, AvailabilityRule>>(new Map());
  const [specificDateRules, setSpecificDateRules] = useState<AvailabilityRule[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const all24Hours = generateAll24Hours();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const res = await api.get('/admin/availability-rules');
      const allRules = res.data.rules || [];
      setRules(allRules);

      // Separar reglas por tipo
      const weekdayMap = new Map<number, AvailabilityRule>();
      const specificDates: AvailabilityRule[] = [];

      allRules.forEach((rule: AvailabilityRule) => {
        if (rule.DayOfWeek !== undefined && rule.DayOfWeek !== null) {
          weekdayMap.set(rule.DayOfWeek, rule);
        } else if (rule.SpecificDate) {
          specificDates.push(rule);
        }
      });

      setWeekdayRules(weekdayMap);
      setSpecificDateRules(specificDates);
    } catch (error) {
      console.error('Error loading rules:', error);
    }
  };

  const saveWeekdayRule = async (dayOfWeek: number, unavailableHours: number[], allDay: boolean) => {
    setLoading(true);
    try {
      await api.post('/admin/availability-rules/weekday', {
        dayOfWeek,
        unavailableHours,
        allDay,
      });
      await loadRules();
      toast.success('Regla guardada exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error guardando regla');
    } finally {
      setLoading(false);
    }
  };

  const saveSpecificDateRule = async (date: Date, unavailableHours: number[], allDay: boolean) => {
    setLoading(true);
    try {
      await api.post('/admin/availability-rules/specific-date', {
        specificDate: format(date, 'yyyy-MM-dd'),
        unavailableHours,
        allDay,
      });
      await loadRules();
      setSelectedDate(undefined);
      toast.success('Bloqueo de fecha guardado exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error guardando regla');
    } finally {
      setLoading(false);
    }
  };

  const deleteSpecificDateRule = async (date: string) => {
    setLoading(true);
    try {
      await api.delete(`/admin/availability-rules/specific-date/${date}`);
      await loadRules();
      toast.success('Bloqueo de fecha eliminado');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error eliminando regla');
    } finally {
      setLoading(false);
    }
  };

  const toggleWeekdayHour = (dayOfWeek: number, hour: number) => {
    const currentRule = weekdayRules.get(dayOfWeek);
    const currentHours = currentRule?.UnavailableHours || [];
    const allDay = currentRule?.AllDay || false;

    let newHours: number[];
    if (currentHours.includes(hour)) {
      newHours = currentHours.filter((h) => h !== hour);
    } else {
      newHours = [...currentHours, hour].sort((a, b) => a - b);
    }

    saveWeekdayRule(dayOfWeek, newHours, allDay);
  };

  const toggleWeekdayAllDay = (dayOfWeek: number) => {
    const currentRule = weekdayRules.get(dayOfWeek);
    const newAllDay = !currentRule?.AllDay;

    saveWeekdayRule(dayOfWeek, currentRule?.UnavailableHours || [], newAllDay);
  };

  const WeekdayTab = ({ day }: { day: typeof daysOfWeek[0] }) => {
    const rule = weekdayRules.get(day.value);
    const unavailableHours = rule?.UnavailableHours || [];
    const allDay = rule?.AllDay || false;

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={allDay}
            onCheckedChange={() => toggleWeekdayAllDay(day.value)}
            id={`allday-${day.value}`}
          />
          <Label htmlFor={`allday-${day.value}`} className="font-semibold">
            Todo el día bloqueado
          </Label>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {all24Hours.map(({ hour, label }) => (
            <Button
              key={hour}
              variant={unavailableHours.includes(hour) || allDay ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => toggleWeekdayHour(day.value, hour)}
              disabled={loading || allDay}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {allDay
            ? 'Este día está completamente bloqueado'
            : unavailableHours.length > 0
            ? `${unavailableHours.length} hora(s) no disponible(s)`
            : 'Todas las horas disponibles'}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestión de Disponibilidad</h1>
        <p className="text-muted-foreground">
          Configura los horarios no disponibles por día de la semana o fechas específicas
        </p>
      </div>

      <Tabs defaultValue="weekdays" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekdays">Días de la Semana</TabsTrigger>
          <TabsTrigger value="specific">Fechas Específicas</TabsTrigger>
        </TabsList>

        <TabsContent value="weekdays" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Horarios por Día de la Semana</CardTitle>
              <CardDescription>
                Selecciona las horas que NO estarán disponibles para cada día. Los botones rojos indican horas bloqueadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="0" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  {daysOfWeek.map((day) => (
                    <TabsTrigger key={day.value} value={day.value.toString()}>
                      {day.short}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {daysOfWeek.map((day) => (
                  <TabsContent key={day.value} value={day.value.toString()}>
                    <div className="pt-4">
                      <h3 className="text-lg font-semibold mb-4">{day.label}</h3>
                      <WeekdayTab day={day} />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specific" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bloquear Fechas Específicas</CardTitle>
              <CardDescription>
                Selecciona una fecha del calendario para configurar horarios no disponibles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>

              {selectedDate && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">
                    {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </h3>

                  <SpecificDateConfig
                    date={selectedDate}
                    existingRule={specificDateRules.find(
                      rule => rule.SpecificDate && 
                      format(new Date(rule.SpecificDate.includes('T') ? rule.SpecificDate : rule.SpecificDate + 'T00:00:00'), 'yyyy-MM-dd') === 
                      format(selectedDate, 'yyyy-MM-dd')
                    )}
                    onSave={(hours, allDay) => saveSpecificDateRule(selectedDate, hours, allDay)}
                    loading={loading}
                  />
                </div>
              )}

              {specificDateRules.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Fechas Bloqueadas</h3>
                  <div className="space-y-2">
                    {specificDateRules
                      .filter(rule => rule.SpecificDate && rule.SpecificDate.trim() !== '')
                      .map((rule) => {
                        const dateStr = rule.SpecificDate!;
                        let displayDate = dateStr;
                        let parsedDate: Date | null = null;
                        
                        try {
                          // El backend puede devolver "2025-12-24" o "2025-12-24T00:00:00Z"
                          parsedDate = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
                          displayDate = format(
                            parsedDate, 
                            "dd 'de' MMMM 'de' yyyy", 
                            { locale: es }
                          );
                        } catch (error) {
                          console.error('Error formatting date:', dateStr, error);
                        }
                        
                        return (
                          <div
                            key={rule.ID}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div 
                              className="flex items-center gap-3 cursor-pointer flex-1"
                              onClick={() => {
                                if (parsedDate) {
                                  setSelectedDate(parsedDate);
                                  // Scroll al tab de fechas específicas
                                  const tab = document.querySelector('[value="specific"]') as HTMLButtonElement;
                                  tab?.click();
                                }
                              }}
                            >
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{displayDate}</p>
                                <p className="text-sm text-muted-foreground">
                                  {rule.AllDay
                                    ? 'Todo el día bloqueado'
                                    : `${rule.UnavailableHours.length} hora(s) no disponible(s)`}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                // Extraer solo la fecha en formato yyyy-MM-dd
                                const dateStr = rule.SpecificDate!;
                                const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
                                deleteSpecificDateRule(dateOnly);
                              }}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SpecificDateConfig({
  date,
  existingRule,
  onSave,
  loading,
}: {
  date: Date;
  existingRule?: AvailabilityRule;
  onSave: (hours: number[], allDay: boolean) => void;
  loading: boolean;
}) {
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [allDay, setAllDay] = useState(false);
  const all24Hours = generateAll24Hours();

  // Cargar datos de la regla existente cuando cambia
  useEffect(() => {
    if (existingRule) {
      setSelectedHours(existingRule.UnavailableHours || []);
      setAllDay(existingRule.AllDay || false);
    } else {
      setSelectedHours([]);
      setAllDay(false);
    }
  }, [existingRule, date]);

  const toggleHour = (hour: number) => {
    if (selectedHours.includes(hour)) {
      setSelectedHours(selectedHours.filter((h) => h !== hour));
    } else {
      setSelectedHours([...selectedHours, hour].sort((a, b) => a - b));
    }
  };

  const handleAllDayToggle = (checked: boolean) => {
    setAllDay(checked);
    if (checked) {
      setSelectedHours([]);
    }
  };

  const handleSave = () => {
    onSave(selectedHours, allDay);
    setSelectedHours([]);
    setAllDay(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox checked={allDay} onCheckedChange={handleAllDayToggle} id="specific-allday" />
        <Label htmlFor="specific-allday" className="font-semibold">
          Todo el día bloqueado
        </Label>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {all24Hours.map(({ hour, label }) => (
          <Button
            key={hour}
            variant={selectedHours.includes(hour) || allDay ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => toggleHour(hour)}
            disabled={allDay}
            className="text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      <Button onClick={handleSave} disabled={loading || (!allDay && selectedHours.length === 0)}>
        Guardar Bloqueo
      </Button>
    </div>
  );
}
