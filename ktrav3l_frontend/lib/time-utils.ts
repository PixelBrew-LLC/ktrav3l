// Convierte hora en formato 24h a 12h con AM/PM
export function formatHour12(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

// Convierte hora en formato 12h AM/PM a 24h
export function parseHour24(hourStr: string): number {
  const match = hourStr.match(/(\d+):00 (AM|PM)/);
  if (!match) return 0;
  
  let hour = parseInt(match[1]);
  const period = match[2];
  
  if (period === 'AM') {
    if (hour === 12) return 0;
    return hour;
  } else {
    if (hour === 12) return 12;
    return hour + 12;
  }
}

// Genera array de todas las 24 horas en formato AM/PM
export function generateAll24Hours(): { hour: number; label: string }[] {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push({
      hour: i,
      label: formatHour12(i),
    });
  }
  return hours;
}
