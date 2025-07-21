import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lineBreakToBr',
  standalone: true
})
export class LineBreakToBrPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value.replace(/\n/g, '<br>');
  }
}
