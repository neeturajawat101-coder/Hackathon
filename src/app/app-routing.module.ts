import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InputPageComponent } from './pages/input-page/input-page';
import { MRDetailsPageComponent } from './pages/mrdetails-page/mrdetails-page';
import { ReportsPageComponent } from './pages/reports-page/reports-page';
import { DebugPageComponent } from './pages/debug-page/debug-page';

const routes: Routes = [
  { path: '', redirectTo: 'debug', pathMatch: 'full' },
  { path: 'debug', component: DebugPageComponent },
  { path: 'input', component: InputPageComponent },
  { path: 'details', component: MRDetailsPageComponent },
  { path: 'reports', component: ReportsPageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
