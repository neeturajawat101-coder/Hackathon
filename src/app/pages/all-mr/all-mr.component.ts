import { Component, OnInit, AfterViewInit, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FirebaseService, MRData } from '../../services/firebase.service';
import { GitLabService } from '../../services/gitlab.service';
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
  refreshingMRId: string | null = null;

  isBrowser: boolean;

  constructor(
    private firebaseService: FirebaseService,
    private gitLabService: GitLabService,
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  colDefs: ColDef[] = [
    { field: 'mrId', headerName: 'MR ID', filter: 'agTextColumnFilter', filterParams: { suppressAndOrCondition: true, suppressFilterButton: true } },
    { field: 'title', headerName: 'Title', filterParams: { suppressAndOrCondition: true, suppressFilterButton: true } },
    { field: 'jiraLink', headerName: 'Jira' },
    { field: 'webUrl', headerName: 'MR' },
    { field: 'priority', headerName: 'Priority', filter: 'agSetColumnFilter' },
    { field: 'squads', headerName: 'Squads', filter: 'agSetColumnFilter' },
    { field: 'status', headerName: 'Status', filter: 'agSetColumnFilter' },
    { field: 'reviewer', headerName: 'Reviewer' , filterParams: { suppressAndOrCondition: true, suppressFilterButton: true } },
    { field: 'aiSummary', headerName: 'AI Summary' },
    { field: 'action', headerName: 'Action' }
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

  refreshSingleMR(mr: MRData, event: Event): void {
    event.stopPropagation(); // Prevent row click
    
    if (!mr.mrId && !mr.mr) {
      console.error('No MR ID found for refresh');
      this.errorMessage = 'No MR ID found for this record';
      return;
    }
    
    const mrId = mr.mrId || mr.mr;
    if (!mrId) {
      console.error('Invalid MR ID');
      return;
    }

    console.log('Refreshing MR with ID:', mrId);
    this.refreshingMRId = mr.id || mrId;
    this.errorMessage = ''; // Clear any previous errors
    
    // Fetch MR data from GitLab using the existing getMergeRequestDetails method
    this.gitLabService.getMergeRequestDetails(mrId.toString()).subscribe({
      next: (mrDetails) => {
        console.log('Refreshed MR details received:', mrDetails);
        
        // Transform GitLab data exactly like input-page.ts does
        const updatedMRData: Partial<MRData> = {
          mr: mrId.toString(),
          title: mrDetails.title || 'No title',
          description: mrDetails.description || '',
          jira: this.extractJiraLink(mrDetails.description || ''),
          thread: mrDetails.web_url || '',
          priority: this.extractPriority(mrDetails.labels || []),
          squads: this.extractSquads(mrDetails.labels || []),
          status: this.mapStatus(mrDetails.state || 'opened'),
          reviewer: this.extractReviewerName(mrDetails || []),
          author: mrDetails.author?.name || 'Unknown',
          targetBranch: mrDetails.target_branch || '',
          sourceBranch: mrDetails.source_branch || '',
          labels: mrDetails.labels || [],
          mergedAt: (mrDetails.merged_at && mrDetails.state === 'merged') ? new Date(mrDetails.merged_at) : undefined,
          updatedAt: new Date()
        };

        console.log('Transformed MR data:', updatedMRData);

        // Prepare data to save, exactly like input-page.ts does
        const mrDataToSave: any = {
          mr: updatedMRData.mr,
          title: updatedMRData.title,
          jira: updatedMRData.jira,
          priority: updatedMRData.priority,
          squads: updatedMRData.squads,
          status: updatedMRData.status,
          reviewer: updatedMRData.reviewer,
          thread: updatedMRData.thread,
          description: updatedMRData.description,
          author: updatedMRData.author,
          targetBranch: updatedMRData.targetBranch,
          sourceBranch: updatedMRData.sourceBranch,
          labels: updatedMRData.labels,
          date: new Date().toISOString().split('T')[0]
        };

        // Only include mergedAt if the MR is actually merged and has a valid date
        if (updatedMRData.mergedAt && (updatedMRData.status === 'Merged' || updatedMRData.status === 'merged')) {
          mrDataToSave.mergedAt = updatedMRData.mergedAt;
        }

        console.log('Final MR data to save:', mrDataToSave);

        // Update in Firebase if we have an ID
        if (mr.id) {
          console.log('Updating existing MR in Firebase with ID:', mr.id);
          this.firebaseService.updateMR(mr.id, mrDataToSave)
            .then(() => {
              console.log('MR updated successfully in Firebase');
              // Reload the list to show updated data
              this.loadAllMRs();
            })
            .catch((error) => {
              console.error('Error updating MR in Firebase:', error);
              this.errorMessage = `Failed to save updated MR data: ${error.message}`;
            })
            .finally(() => {
              this.refreshingMRId = null;
            });
        } else {
          console.log('Saving new MR to Firebase');
          this.firebaseService.saveMR(mrDataToSave)
            .then(() => {
              console.log('MR saved successfully to Firebase');
              this.loadAllMRs();
            })
            .catch((error) => {
              console.error('Error saving MR to Firebase:', error);
              this.errorMessage = `Failed to save MR data: ${error.message}`;
            })
            .finally(() => {
              this.refreshingMRId = null;
            });
        }
      },
      error: (error) => {
        console.error('Error fetching MR data from GitLab:', error);
        this.errorMessage = `Failed to fetch updated MR data from GitLab: ${error.message || 'Unknown error'}`;
        this.refreshingMRId = null;
      }
    });
  }

  generateSummary(mr: MRData, event: Event): void {
    event.stopPropagation(); // Prevent row click
    
    if (!mr.id) return;
    
    this.generatingSummary = mr.id;
    
    // Navigate to summary page with MR data in state (not URL)
    this.router.navigate(['/summary'], {
      state: {
        mrData: mr
      }
    });
  }

  // Helper methods copied from input-page.ts for consistent data extraction
  private extractJiraLink(description: string): string {
    console.log('Extracting Jira link from description:', description);
    
    // Multiple regex patterns to catch different Jira URL formats
    const jiraPatterns = [
      /Story:\s*(https?:\/\/[^\s]+jira[^\s]*)/i,  // Story: https://jira...
      /https?:\/\/[^\s]*jira[^\s]*(?:\/browse\/[A-Z]+-\d+)/i,  // Direct jira URLs with browse
      /(https?:\/\/[^\s]+jira[^\s]*)/i  // Any jira URL
    ];
    
    for (const pattern of jiraPatterns) {
      const match = description.match(pattern);
      if (match) {
        const result = match[1] || match[0];
        console.log('Jira link extracted:', result);
        return result;
      }
    }
    
    console.log('No Jira link found');
    return '';
  }

  private extractPriority(labels: string[]): 'High' | 'Medium' | 'Low' {
    const priorityLabel = labels.find(label => 
      label.toLowerCase().includes('priority') || 
      label.toLowerCase().includes('high') || 
      label.toLowerCase().includes('medium') || 
      label.toLowerCase().includes('low')
    );
    
    if (priorityLabel?.toLowerCase().includes('high')) return 'High';
    if (priorityLabel?.toLowerCase().includes('medium')) return 'Medium';
    if (priorityLabel?.toLowerCase().includes('low')) return 'Low';
    return 'Medium';
  }

  private extractSquads(labels: string[]): string {
    const squadLabel = labels.find(label => 
      label.toLowerCase().includes('team') || 
      label.toLowerCase().includes('squad') ||
      label.toLowerCase().includes('frontend') ||
      label.toLowerCase().includes('backend') ||
      label.toLowerCase().includes('auth')
    );
    
    if (squadLabel) {
      // Remove "team::" prefix and return clean squad name
      return squadLabel.replace(/^team::/i, '').trim();
    }
    
    return 'General';
  }

  private extractReviewerName(data: any): string {
    const reviewerId = ["1136", "5436", "3271","947", "6620", "2525", "155", "734", "2421", "1183",
                        "1965", "4874", "593","863", "894", "2094", "747", "242", "177", "267"
    ];
    return data.reviewers.filter((reviewer: { id: { toString: () => string; }; }) => reviewerId.includes(reviewer.id.toString())).map((reviewer: { name: any; }) => reviewer.name).join(', ');
  }

  private mapStatus(gitlabStatus: string): 'opened' | 'merged' | 'closed' | 'draft' | 'Open' | 'Merged' | 'Closed' | 'Draft' | 'In Cg Review' {
    switch (gitlabStatus?.toLowerCase()) {
      case 'opened': return 'Open';
      case 'merged': return 'Merged';
      case 'closed': return 'Closed';
      case 'draft': return 'Draft';
      default: return 'Open';
    }
  }
}
