import { NgModule } from '@angular/core';
import { NavbarComponent } from './navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [NavbarComponent, SidebarComponent],
  imports: [SharedModule],
  exports: [NavbarComponent, SidebarComponent]
})
export class LayoutModule {}
