import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DtPipe } from './dt.pipe';

@NgModule({
  imports: [CommonModule, DtPipe],
  declarations: [],
  exports: [DtPipe]
})
export class SharedModule {}
