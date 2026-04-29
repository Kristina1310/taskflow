import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    <div
      class="animate-pulse bg-slate-200 rounded-lg"
      [style.height]="height"
      [style.width]="width"
    ></div>
  `
})
export class SkeletonComponent {
  @Input() height = '1rem';
  @Input() width = '100%';
}
