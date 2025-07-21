import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-mrdetails-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mrdetails-page.html',
  styleUrls: ['./mrdetails-page.scss'],
})
export class MRDetailsPageComponent implements OnInit {
  mrData: any = null;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Get the data from router state
    let state = this.router.getCurrentNavigation()?.extras?.state;
    
    // Only access history in browser environment
    if (!state && isPlatformBrowser(this.platformId)) {
      state = history.state;
    }
    
    this.mrData = state?.['mrData'];
    
    // If no data found, redirect back to input page
    if (!this.mrData) {
      console.warn('No MR data found, redirecting to input page');
      this.router.navigate(['/input']);
    }
  }

  goBack(): void {
    this.router.navigate(['/input']);
  }

  getAssigneesNames(): string {
    if (!this.mrData?.assignees || this.mrData.assignees.length === 0) {
      return 'None assigned';
    }
    return this.mrData.assignees.map((assignee: any) => assignee.name).join(', ');
  }

  getLabelsString(): string {
    if (!this.mrData?.labels || this.mrData.labels.length === 0) {
      return 'None';
    }
    return this.mrData.labels.join(', ');
  }
}
