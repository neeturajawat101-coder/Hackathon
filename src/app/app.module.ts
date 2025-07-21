import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 

import { AppRoutingModule } from './app-routing.module';
import { App } from './app';
import { InputPageComponent } from './pages/input-page/input-page';
import { MRDetailsPageComponent } from './pages/mrdetails-page/mrdetails-page';
import { ReportsPageComponent } from './pages/reports-page/reports-page';
import { DebugPageComponent } from './pages/debug-page/debug-page';
ModuleRegistry.registerModules([AllCommunityModule]);

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    InputPageComponent,
    MRDetailsPageComponent,
    ReportsPageComponent,
    DebugPageComponent,
  ],
  providers: []
})
export class AppModule { }