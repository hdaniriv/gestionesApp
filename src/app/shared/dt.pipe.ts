import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../environments/environment';

@Pipe({ name: 'dt', standalone: true })
export class DtPipe implements PipeTransform {
  transform(value?: string | Date | null): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    // Soporte básico de tokens dd, MM, yyyy, HH, mm
    const fmt = environment?.DATE_TIME_FORMAT?.display || 'dd/MM/yyyy HH:mm';
    return fmt
      .replace('dd', dd)
      .replace('MM', MM)
      .replace('yyyy', String(yyyy))
      .replace('HH', HH)
      .replace('mm', mm);
  }
}
