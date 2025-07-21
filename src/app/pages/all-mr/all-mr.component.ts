import { Component, OnInit, AfterViewInit, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FirebaseService, MRData } from '../../services/firebase.service';
import { AgGridAngular } from 'ag-grid-angular'; // Angular Data Grid Component
import type { ColDef } from 'ag-grid-community'; // Column Definition Type Interface
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { SetFilterModule } from 'ag-grid-enterprise'; 

ModuleRegistry.registerModules([ AllCommunityModule, SetFilterModule ]); 

@Component({
  selector: 'app-all-mr',
  standalone: true,
  imports: [CommonModule, AgGridAngular],
  templateUrl: './all-mr.component.html',
  styleUrls: ['./all-mr.component.scss']
})
export class AllMRComponent implements OnInit, AfterViewInit {
  mrList: MRData[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  generatingSummary: string | null = null;

  isBrowser: boolean;

  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  colDefs: ColDef[] = [
    { field: 'mrId', headerName: 'MR ID', filter: 'agSetColumnFilter' },
    { field: 'title', headerName: 'Title', filterParams: { suppressAndOrCondition: true, suppressFilterButton: true } },
    { field: 'jiraLink', headerName: 'Jira' },
    { field: 'webUrl', headerName: 'MR' },
    { field: 'priority', headerName: 'Priority', filter: 'agSetColumnFilter' },
    { field: 'squads', headerName: 'Squads', filter: 'agSetColumnFilter' },
    { field: 'status', headerName: 'Status', filter: 'agSetColumnFilter' },
    { field: 'reviewer', headerName: 'Reviewer' , filter: 'agSetColumnFilter' },
    { 
      field: 'aiSummary', 
      headerName: 'AI Summary',
      cellRenderer: (params: any) => {
        const button = document.createElement('button');
        button.className = 'ai-summary-btn';
        button.title = 'Generate AI Summary';
        button.innerHTML = '<span>🤖 AI Summary</span>';
        button.addEventListener('click', () => {
          this.generateSummary(params.data);
        });
        return button;
      }
    },    { field: 'action', headerName: 'Action' }
  ];

  rowData: any = [];

  ngOnInit(): void {
    // Don't load data immediately, wait for AfterViewInit
  }

  ngAfterViewInit(): void {
    // Delay Firebase operations to ensure we're in browser context
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.loadAllMRs();
        });
      }, 100);
    });
  }

  loadAllMRs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.firebaseService.getAllMRs().subscribe({
      next: (data) => {
        this.mrList = data;
        this.rowData = this.mrList.map(mr => ({
          mrId: mr.mr || mr.mrId || '-',
          title: mr.title,
          jiraLink: mr.jira || mr.jiraLink || '-',
          webUrl: mr.thread || mr.webUrl || '-',
          priority: mr.priority || '-',
          squads: mr.squads || '-',
          status: mr.status,
          reviewer: mr.reviewer || mr.author || '-',
          aiSummary: '🤖 AI Summary',
          action: mr.action
        }));
        this.isLoading = false;
        
        if (data.length === 0) {
          this.errorMessage = 'No merge requests found. Add some MRs using the input page.';
        }
      },
      error: (error) => {
        console.error('Error loading MRs from Firebase:', error);
        this.isLoading = false;
        this.errorMessage = `Failed to load merge requests from Firebase: ${error.message || 'Unknown error'}`;
        
        // Only use local fallback if it's a connection issue and we're not in browser
        if (!this.isInBrowser()) {
          console.log('Not in browser context, creating local fallback data...');
          this.createLocalSampleData();
        }
      }
    });
  }

  private createLocalSampleData(): void {
    console.log('Creating local sample data (SSR fallback)...');
    
    this.mrList = [
      {
        id: 'local-1',
        mrId: '123',
        title: 'Fix authentication bug in login module',
        description: 'This MR fixes a critical bug in the authentication system.',
        jiraLink: 'https://jira.example.com/browse/AUTH-456',
        webUrl: 'https://gitlab.example.com/project/-/merge_requests/123',
        priority: 'High',
        squads: 'Authentication Team',
        status: 'opened',
        reviewer: 'John Doe',
        author: 'Jane Smith',
        action: 'Review Required',
        targetBranch: 'main',
        sourceBranch: 'feature/auth-fix',
        labels: ['bug', 'high-priority', 'authentication'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  private isInBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  createCGReviewRequest(): void {
    this.router.navigate(['/input']);
  }

  viewMRDetails(mr: MRData): void {
    this.router.navigate(['/details'], { state: { mrData: mr } });
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'opened': return 'status-open';
      case 'merged': return 'status-merged';
      case 'closed': return 'status-closed';
      case 'draft': return 'status-draft';
      default: return 'status-default';
    }
  }

  deleteMR(mr: MRData, event: Event): void {
    event.stopPropagation(); // Prevent row click
    
    if (confirm(`Are you sure you want to delete "${mr.title}"?`)) {
      if (mr.id) {
        this.firebaseService.deleteMR(mr.id).subscribe({
          next: () => {
            console.log('MR deleted successfully');
            this.loadAllMRs(); // Reload the list
          },
          error: (error) => {
            console.error('Error deleting MR:', error);
            this.errorMessage = `Failed to delete MR: ${error.message}`;
          }
        });
      }
    }
  }

  refreshData(): void {
    this.loadAllMRs();
  }

  generateSummary(mr: MRData): void {
    
    
    if (!mr.mrId) return;
    
    this.generatingSummary = mr.mrId;
    
    // Navigate to summary page with MR data in state (not URL)
    this.router.navigate(['/summary'], {
      state: {
        mrData: mr
      }
    });
  }
}
