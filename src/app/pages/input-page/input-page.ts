import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GitLabService } from '../../services/gitlab.service';
import { FirebaseService } from '../../services/firebase.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-page',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './input-page.html',
  styleUrls: ['./input-page.scss'],
})
export class InputPageComponent {
  mrId: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showForm: boolean = false;

  // Form fields for MR details
  formData = {
    mr: '',
    title: '',
    jira: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    squads: '',
    status: 'Open' as 'opened' | 'merged' | 'closed' | 'draft' | 'Open' | 'Merged' | 'Closed' | 'Draft' | 'In Cg Review',
    reviewer: '',
    thread: '',
    description: '',
    author: '',
    targetBranch: '',
    sourceBranch: '',
    labels: [] as string[],
    mergedAt: undefined as Date | undefined
  };

  priorityOptions = ['High', 'Medium', 'Low'];
  statusOptions = ['Open', 'Merged', 'Closed', 'Draft', 'In Cg Review'];

  constructor(
    private gitLabService: GitLabService, 
    private firebaseService: FirebaseService,
    private router: Router
  ) {
    console.log('Debug: InputPageComponent initialized');
  }

  fetchMRDetails(): void {
    if (!this.mrId.trim()) {
      this.errorMessage = 'Please enter a valid MR ID';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showForm = false;
    
    this.gitLabService.getMergeRequestDetails(this.mrId).subscribe({
      next: (data) => {
        // Populate form with fetched data
        this.formData = {
          mr: this.mrId,
          title: data.title || 'No title',
          description: data.description || '',
          jira: this.extractJiraLink(data.description || ''),
          thread: data.web_url || '',
          priority: this.extractPriority(data.labels || []),
          squads: this.extractSquads(data.labels || []),
          status: this.mapStatus(data.state || 'opened'),
          reviewer: this.extractReviewerName(data || []),
          //reviewer: data.assignees && data.assignees.length > 0 ? data.assignees[0].name : '',
          author: data.author?.name || 'Unknown',
          targetBranch: data.target_branch || '',
          sourceBranch: data.source_branch || '',
          labels: data.labels || [],
          mergedAt: (data.merged_at && data.state === 'merged') ? new Date(data.merged_at) : undefined
        };

        this.showForm = true;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to fetch MR data:', error);
        this.errorMessage = 'Failed to fetch MR data. Please check the MR ID and try again.';
        this.isLoading = false;
        this.showForm = false;
      }
    });
  }

  private extractReviewerName(data: any): string {
    const reviewerId = ["5436","3271","6620","2421", "103", "863"];
    return data.reviewers.filter((reviewer: { id: { toString: () => string; }; }) => reviewerId.includes(reviewer.id.toString())).map((reviewer: { name: any; }) => reviewer.name).join(', ');
  }

  saveToFirebase(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Prepare data to save, conditionally including mergedAt
    const mrDataToSave: any = {
      mr: this.formData.mr,
      title: this.formData.title,
      jira: this.formData.jira,
      priority: this.formData.priority,
      squads: this.formData.squads,
      status: this.formData.status,
      reviewer: this.formData.reviewer,
      thread: this.formData.thread,
      description: this.formData.description,
      author: this.formData.author,
      targetBranch: this.formData.targetBranch,
      sourceBranch: this.formData.sourceBranch,
      labels: this.formData.labels,
      date: new Date().toISOString().split('T')[0]
    };

    // Only include mergedAt if the MR is actually merged and has a valid date
    if (this.formData.mergedAt && (this.formData.status === 'Merged' || this.formData.status === 'merged')) {
      mrDataToSave.mergedAt = this.formData.mergedAt;
    }

    console.log('Saving MR data:', mrDataToSave);

    this.firebaseService.createMR(mrDataToSave).subscribe({
      next: (firebaseId) => {
        this.successMessage = `MR ${this.formData.mr} successfully saved to Firebase!`;
        this.resetForm();
        
        // Navigate to All MRs page after a short delay
        setTimeout(() => {
          this.router.navigate(['/all-mr']);
        }, 2000);
      },
      error: (firebaseError) => {
        console.error('Failed to save to Firebase:', firebaseError);
        this.errorMessage = 'Failed to save to Firebase. Please try again.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  resetForm(): void {
    this.mrId = '';
    this.showForm = false;
    this.formData = {
      mr: '',
      title: '',
      jira: '',
      priority: 'Medium',
      squads: '',
      status: 'Open',
      reviewer: '',
      thread: '',
      description: '',
      author: '',
      targetBranch: '',
      sourceBranch: '',
      labels: [],
      mergedAt: undefined
    };
  }

  mapStatus(gitlabStatus: string): 'opened' | 'merged' | 'closed' | 'draft' | 'Open' | 'Merged' | 'Closed' | 'Draft' | 'In Cg Review' {
    switch (gitlabStatus?.toLowerCase()) {
      case 'opened': return 'Open';
      case 'merged': return 'Merged';
      case 'closed': return 'Closed';
      case 'draft': return 'Draft';
      default: return 'Open';
    }
  }

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

  private generateUniqueId(): string {
    return 'mr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
