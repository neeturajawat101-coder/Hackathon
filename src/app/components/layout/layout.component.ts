import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  searchQuery: string = '';
  userName: string = 'Neetu Rajawat';
  currentRoute: string = '';

  constructor(private router: Router) {
    // Track current route for active nav highlighting
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
    });
  }

  onSearch(): void {
    // Implement search functionality
    console.log('Searching for:', this.searchQuery);
  }

  navigateToCreateReview(): void {
    this.router.navigate(['/input']);
  }

  navigateToAllMR(): void {
    this.router.navigate(['/all-mr']);
  }

  navigateToReports(): void {
    this.router.navigate(['/reports']);
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute.includes(route);
  }
}
