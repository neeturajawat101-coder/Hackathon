import { Component, OnInit, AfterViewInit, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FirebaseService, MRData } from '../../services/firebase.service';
import { GitLabService } from '../../services/gitlab.service';
import { AgGridAngular } from 'ag-grid-angular'; // Angular Data Grid Component
import type { ColDef } from 'ag-grid-community'; // Column Definition Type Interface
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { SetFilterModule } from 'ag-grid-enterprise';
import { Dialog } from '@angular/cdk/dialog'; 
import { Modal } from '../../modal/modal';

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
    @Inject(PLATFORM_ID) private platformId: Object,
    private dialog: Dialog
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  colDefs: ColDef[] = [
    { 
      field: 'mrId', 
      headerName: 'MR ID', 
      filter: false,
      width: 100,
      cellStyle: { fontWeight: '600', color: '#007bff' }
    },
    { 
      field: 'title', 
      headerName: 'Title', 
      filter: false,
      width: 300,
      cellStyle: { fontWeight: '500' },
      tooltipField: 'title'
    },
    { 
      field: 'jiraLink', 
      headerName: 'Jira',
      filter: false,
      width: 80,
      cellRenderer: (params: any) => {
        if (params.value && params.value !== '-') {
          return `<a href="${params.value}" target="_blank" class="jira-link" style="color: #0052cc; text-decoration: none; font-weight: 500;">Jira</a>`;
        }
        return '<span style="color: #6c757d;">-</span>';
      }
    },
    { 
      field: 'webUrl', 
      headerName: 'MR',
      width: 80,
      cellRenderer: (params: any) => {
        if (params.value && params.value !== '-') {
          return `<a href="${params.value}" target="_blank" class="mr-link" style="color: #28a745; text-decoration: none; font-weight: 500;">MR</a>`;
        }
        return '<span style="color: #6c757d;">-</span>';
      }
    },
    { 
      field: 'priority', 
      headerName: 'Priority', 
      filter: 'agSetColumnFilter',
      width: 100,
      cellRenderer: (params: any) => {
        const priority = params.value || '-';
        const priorityClass = priority.toLowerCase() === 'high' ? 'priority-high' : 
                             priority.toLowerCase() === 'medium' ? 'priority-medium' : 
                             priority.toLowerCase() === 'low' ? 'priority-low' : '';
        return `<span class="priority-badge ${priorityClass}">${priority}</span>`;
      }
    },
    { 
      field: 'squads', 
      headerName: 'Squads', 
      filter: 'agSetColumnFilter',
      width: 120
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      filter: 'agSetColumnFilter',
      width: 120,
      cellRenderer: (params: any) => {
        const status = params.value || '-';
        const statusClass = this.getStatusClass(status);
        return `<span class="status-badge ${statusClass}">${status}</span>`;
      }
    },
    { 
      field: 'reviewer', 
      headerName: 'Reviewer', 
      filter: 'agSetColumnFilter',
      width: 150
    },
    { 
      field: 'aiSummary', 
      headerName: 'AI Summary',
      filter: false,
      width: 150,
      minWidth: 140,
      resizable: false,
      cellRenderer: (params: any) => {
        const button = document.createElement('button');
        button.className = 'ai-summary-btn';
        button.title = 'Generate AI Summary';
        button.innerHTML = '<span>🤖 AI Summary</span>';
        button.style.cssText = `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 130px;
          text-align: center;
        `;
        button.addEventListener('click', () => {
          this.generateSummary(params.data);
        });
        button.addEventListener('mouseenter', () => {
          button.style.transform = 'translateY(-1px)';
          button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        });
        button.addEventListener('mouseleave', () => {
          button.style.transform = 'translateY(0)';
          button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        return button;
      }
    },
    {
      field: 'refresh',
      headerName: 'Refresh',
      filter: false,
      width: 100,
      minWidth: 90,
      resizable: false,
      cellRenderer: (params: any) => {
        const button = document.createElement('button');
        button.className = 'refresh-mr-btn';
        button.title = 'Refresh MR Data';
        button.innerHTML = '<span>🔄</span>';
        button.style.cssText = `
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
          color: white;
          border: none;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 80px;
        `;
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          this.refreshSingleMR(params.data, event);
        });
        button.addEventListener('mouseenter', () => {
          button.style.transform = 'translateY(-1px) rotate(90deg)';
          button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        });
        button.addEventListener('mouseleave', () => {
          button.style.transform = 'translateY(0) rotate(0deg)';
          button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        return button;
      }
    },
    { 
      field: 'action', 
      headerName: 'Actions',
      filter: false,
      width: 100,
      minWidth: 90,
      resizable: false,
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 8px; height: 100%;';
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.title = 'Delete MR';
        deleteButton.innerHTML = '<span>🗑️</span>';
        deleteButton.style.cssText = `
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 70px;
        `;
        deleteButton.addEventListener('click', (event) => {
          event.stopPropagation();
          this.deleteMR(params.data, event);
        });
        deleteButton.addEventListener('mouseenter', () => {
          deleteButton.style.transform = 'translateY(-1px) scale(1.05)';
          deleteButton.style.boxShadow = '0 4px 8px rgba(220,53,69,0.3)';
        });
        deleteButton.addEventListener('mouseleave', () => {
          deleteButton.style.transform = 'translateY(0) scale(1)';
          deleteButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        
        container.appendChild(deleteButton);
        return container;
      }
    }
  ];

  rowData: any = [];

  // AG Grid configuration
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 80,
    resizable: true,
    sortable: true,
    filter: true,
    filterParams: {
      suppressAndOrCondition: true
    }
  };

  gridOptions = {
    animateRows: true,
    enableCellTextSelection: true,
    suppressRowClickSelection: true,
    rowHeight: 50,
    headerHeight: 45,
    pagination: true,
    paginationPageSize: 20,
    suppressPaginationPanel: false,
    suppressScrollOnNewData: true,
    suppressHorizontalScroll: false,
    suppressColumnVirtualisation: true,
    rowStyle: { 
      background: 'white',
      borderBottom: '1px solid #e9ecef'
    },
    getRowStyle: (params: any) => {
      if (params.node.rowIndex % 2 === 0) {
        return { background: '#f8f9fa' };
      }
      return { background: 'white' };
    },
    onGridReady: (params: any) => {
      // Auto-size columns on grid ready
      params.api.sizeColumnsToFit();
    },
    onColumnResized: (params: any) => {
      // Ensure columns don't get too small
      params.api.sizeColumnsToFit();
    }
  };

  onRowClicked(event: any): void {
    // Navigate to MR details using the original data
    //this.viewMRDetails(event.data.data || event.data);
  }

  onGridReady(params: any): void {
    // Store grid API for later use
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    
    // Auto-size columns to fit
    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);
  }

  private gridApi: any;
  private gridColumnApi: any;

  ngOnInit(): void {
    // Don't load data immediately, wait for AfterViewInit
    this.openModal();
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
          refresh: '🔄',
          action: 'Actions',
          // Keep reference to original data for operations
          id: mr.id,
          data: mr
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

  // viewMRDetails(mr: MRData): void {
  //   this.router.navigate(['/details'], { state: { mrData: mr } });
  // }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'opened': return 'status-open';
      case 'merged': return 'status-merged';
      case 'closed': return 'status-closed';
      case 'draft': return 'status-draft';
      default: return 'status-default';
    }
  }

  deleteMR(mr: any, event: Event): void {
    event.stopPropagation(); // Prevent row click
    
    // Use the original data if available
    const mrData = mr.data || mr;
    const mrTitle = mrData.title || mr.title || 'this MR';
    const mrId = mrData.id || mr.id;
    
    if (confirm(`⚠️ Are you sure you want to delete "${mrTitle}"?\n\nThis action cannot be undone.`)) {
      if (mrId) {
        // Show loading state
        const originalRowData = this.rowData;
        this.rowData = this.rowData.map((row: any) => 
          row.id === mrId ? { ...row, deleting: true } : row
        );
        
        this.firebaseService.deleteMR(mrId).subscribe({
          next: () => {
            console.log('MR deleted successfully');
            // Show success feedback
            alert('✅ MR deleted successfully!');
            this.loadAllMRs(); // Reload the list
          },
          error: (error) => {
            console.error('Error deleting MR:', error);
            // Restore original data on error
            this.rowData = originalRowData;
            this.errorMessage = `❌ Failed to delete MR: ${error.message}`;
            alert(`❌ Failed to delete MR: ${error.message}`);
          }
        });
      } else {
        alert('❌ Error: No MR ID found for deletion');
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

  generateSummary(mr: any): void {
    // Use the original data if available
    const mrData = mr.data || mr;
    
    if (!mrData.mrId && !mrData.mr) {
      alert('❌ Error: No MR ID found for summary generation');
      return;
    }
    
    this.generatingSummary = mrData.mrId || mrData.mr;
    
    // Navigate to summary page with MR data in state (not URL)
    this.router.navigate(['/summary'], {
      state: {
        mrData: mrData
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

  openModal(data?: any): void {
    const dialogRef = this.dialog.open(Modal, {
      data: data,
      width: '500px',
      height: '400px'
    });

    dialogRef.closed.subscribe(result => {
      console.log('Modal closed', result);
    });
  }

}
