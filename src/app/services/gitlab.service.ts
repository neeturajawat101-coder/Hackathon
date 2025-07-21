import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface GitLabDiscussion {
  id: string;
  individual_note: boolean;
  notes: GitLabNote[];
}

export interface GitLabNote {
  id: number;
  author: {
    id: number;
    name: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
  body: string;
  system: boolean;
  noteable_type: string;
  resolvable: boolean;
  resolved: boolean;
  position?: {
    new_path?: string;
    old_path?: string;
    new_line?: number;
    old_line?: number;
  };
}

export interface GitLabMRChanges {
  changes: Array<{
    old_path: string;
    new_path: string;
    new_file: boolean;
    renamed_file: boolean;
    deleted_file: boolean;
    diff: string;
  }>;
}

export interface GitLabPipeline {
  id: number;
  status: string;
  ref: string;
  sha: string;
  created_at: string;
  updated_at: string;
  web_url: string;
}

export interface GitLabJob {
  id: number;
  name: string;
  status: string;
  stage: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  duration?: number;
  web_url: string;
  failure_reason?: string;
}

export interface MRAnalysisData {
  basicInfo: any; // MR basic details
  changes: GitLabMRChanges;
  notes: GitLabDiscussion[];
  pipelines: GitLabPipeline[];
  jobs?: GitLabJob[];
  analysis: {
    totalComments: number;
    creationDate: Date | null;
    mergeDate: Date | null;
    timeToMerge: number | null; // in days
    topCommentedFiles: Array<{ file: string; count: number }>;
    pipelineCount: number;
    failedPipelines: number;
    authors: string[];
    reviewers: string[];
    recommendations: string[];
    pipelineStatuses: Array<{ name: string; status: string }>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GitLabService {
  private gitlabApiUrl = 'https://vie.git.bwinparty.com/api/v4';
    private gitlabToken = 'glpat-Fz6KK4Zjyaf3QBxsoezV';
    private projectId = '502';

  constructor(private http: HttpClient) {}

  // Call 1: Get MR basic details (creation time, merge time, author, etc.)
  getMergeRequestDetails(mrId: string): Observable<any> {
    const url = `${this.gitlabApiUrl}/projects/${this.projectId}/merge_requests/${mrId}`;
    const headers = { Authorization: `Bearer ${this.gitlabToken}` };
    return this.http.get(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Call 1: Get MR changes (files changed with diffs)
  getMRChanges(mrId: string): Observable<GitLabMRChanges> {
    const url = `${this.gitlabApiUrl}/projects/${this.projectId}/merge_requests/${mrId}/changes`;
    const headers = { Authorization: `Bearer ${this.gitlabToken}` };
    return this.http.get<GitLabMRChanges>(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Call 2: Get MR notes/discussions (comments, reviewers)
  getMRDiscussions(mrId: string): Observable<GitLabDiscussion[]> {
    const url = `${this.gitlabApiUrl}/projects/${this.projectId}/merge_requests/${mrId}/discussions`;
    const headers = { Authorization: `Bearer ${this.gitlabToken}` };
    
    return this.http.get<GitLabDiscussion[]>(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Call 2b: Get MR notes (individual comments)
  getMRNotes(mrId: string): Observable<GitLabNote[]> {
    const url = `${this.gitlabApiUrl}/projects/${this.projectId}/merge_requests/${mrId}/notes`;
    const headers = { Authorization: `Bearer ${this.gitlabToken}` };
    
    return this.http.get<GitLabNote[]>(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Call 3: Get MR pipelines
  getMRPipelines(mrId: string): Observable<GitLabPipeline[]> {
    const url = `${this.gitlabApiUrl}/projects/${this.projectId}/merge_requests/${mrId}/pipelines`;
    const headers = { Authorization: `Bearer ${this.gitlabToken}` };
    return this.http.get<GitLabPipeline[]>(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Call 4: Get pipeline jobs (optional for specific job failures)
  getPipelineJobs(pipelineId: number): Observable<GitLabJob[]> {
    const url = `${this.gitlabApiUrl}/projects/${this.projectId}/pipelines/${pipelineId}/jobs`;
    const headers = { Authorization: `Bearer ${this.gitlabToken}` };
    return this.http.get<GitLabJob[]>(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Comprehensive analysis method that combines all API calls
  getComprehensiveMRAnalysis(mrId: string, includePipelineJobs: boolean = false): Observable<MRAnalysisData> {
    console.log('Starting comprehensive analysis for MR:', mrId);
    
    const basicInfo$ = this.getMergeRequestDetails(mrId);
    const changes$ = this.getMRChanges(mrId);
    const discussions$ = this.getMRDiscussions(mrId);
    const notes$ = this.getMRNotes(mrId);
    const pipelines$ = this.getMRPipelines(mrId);

    return forkJoin({
      basicInfo: basicInfo$,
      changes: changes$,
      discussions: discussions$,
      notes: notes$,
      pipelines: pipelines$
    }).pipe(
      map(data => {
        console.log('Raw API data received:', {
          basicInfo: data.basicInfo,
          basicInfoKeys: Object.keys(data.basicInfo || {}),
          authorInfo: data.basicInfo?.author,
          assignees: data.basicInfo?.assignees,
          reviewers: data.basicInfo?.reviewers,
          changes: data.changes,
          discussionsCount: data.discussions?.length || 0,
          notesCount: data.notes?.length || 0,
          pipelinesCount: data.pipelines?.length || 0
        });
        
        // Use notes for counting total comments since they are individual comments
        const totalComments = this.countTotalCommentsFromNotes(data.notes || []);
        console.log('Total comments from notes API:', totalComments);
        
        const analysis = this.analyzeData({
          basicInfo: data.basicInfo,
          changes: data.changes,
          notes: data.discussions || [], // Keep discussions for the existing structure
          pipelines: data.pipelines || []
        }, totalComments);
        
        console.log('Analysis result:', analysis);
        
        const result = {
          basicInfo: data.basicInfo,
          changes: data.changes,
          notes: data.discussions || [],
          pipelines: data.pipelines || [],
          analysis
        } as MRAnalysisData;
        
        console.log('Final MR Analysis Data:', result);
        return result;
      }),
      catchError(error => {
        console.error('Error in comprehensive analysis, providing mock data:', error);
        
        // Provide mock data with proper structure when API fails
        const mockData: MRAnalysisData = {
          basicInfo: {
            id: parseInt(mrId),
            title: `Merge Request ${mrId}`,
            web_url: `https://gitlab.example.com/merge_requests/${mrId}`,
            created_at: new Date().toISOString(),
            merged_at: null,
            author: { name: 'Unknown Author' }
          },
          changes: { changes: [] },
          notes: [],
          pipelines: [],
          analysis: {
            totalComments: 0,
            creationDate: new Date(),
            mergeDate: null,
            timeToMerge: null,
            topCommentedFiles: [],
            pipelineCount: 0,
            failedPipelines: 0,
            authors: ['Unknown Author'],
            reviewers: [],
            recommendations: ['GitLab API unavailable - showing mock data'],
            pipelineStatuses: []
          }
        };
        
        console.log('Returning mock data:', mockData);
        return [mockData];
      })
    );
  }

  // Data analysis method to process all the gathered information
  private analyzeData(data: {
    basicInfo: any;
    changes: GitLabMRChanges;
    notes: GitLabDiscussion[];
    pipelines: GitLabPipeline[];
  }, overrideTotalComments?: number) {
    console.log('Analyzing data:', {
      basicInfoExists: !!data.basicInfo,
      changesExists: !!data.changes,
      notesCount: data.notes?.length || 0,
      pipelinesCount: data.pipelines?.length || 0,
      overrideTotalComments: overrideTotalComments
    });

    // Use overridden total comments if provided, otherwise calculate from discussions
    const totalComments = overrideTotalComments !== undefined ? 
      overrideTotalComments : 
      this.countTotalComments(data.notes || []);
    const topCommentedFiles = this.getTopCommentedFiles(data.notes || []);
    const reviewers = this.extractReviewers(data.basicInfo, data.notes || []);
    
    console.log('Comment analysis:', { totalComments, topCommentedFiles, reviewers });
    
    // Analyze timing
    const creationDate = data.basicInfo?.created_at ? new Date(data.basicInfo.created_at) : null;
    const mergeDate = data.basicInfo?.merged_at ? new Date(data.basicInfo.merged_at) : null;
    const timeToMerge = this.calculateTimeToMerge(creationDate, mergeDate);
    
    console.log('Timing analysis:', { creationDate, mergeDate, timeToMerge });
    
    // Analyze pipelines
    const pipelineCount = (data.pipelines || []).length;
    const failedPipelines = (data.pipelines || []).filter(p => p.status === 'failed').length;
    
    console.log('Pipeline analysis:', { pipelineCount, failedPipelines });
    
    // Extract authors
    const authors = this.extractAuthors(data.basicInfo, data.notes || []);

    // Generate recommendations
    const recommendations = this.generateRecommendations(data.pipelines || [], topCommentedFiles, failedPipelines);
    
    // Get pipeline statuses
    const pipelineStatuses = (data.pipelines || []).map(pipeline => ({
      name: pipeline.ref || 'Pipeline',
      status: pipeline.status || 'unknown'
    }));

    const result = {
      totalComments,
      creationDate,
      mergeDate,
      timeToMerge,
      topCommentedFiles,
      pipelineCount,
      failedPipelines,
      authors,
      reviewers,
      recommendations,
      pipelineStatuses
    };
    
    console.log('Final analysis result:', result);
    return result;
  }

  // Helper methods for data analysis
  private countTotalComments(discussions: GitLabDiscussion[]): number {
    return discussions.reduce((total, discussion) => {
      return total + discussion.notes.filter(note => !note.system).length;
    }, 0);
  }

  private countTotalCommentsFromNotes(notes: GitLabNote[]): number {
    // Filter out system notes and count only human comments
    return notes.filter(note => !note.system).length;
  }

  private getTopCommentedFiles(discussions: GitLabDiscussion[]): Array<{ file: string; count: number }> {
    const fileCommentCounts = new Map<string, number>();
    
    discussions.forEach(discussion => {
      discussion.notes.forEach(note => {
        if (!note.system && note.position?.new_path) {
          const file = note.position.new_path;
          fileCommentCounts.set(file, (fileCommentCounts.get(file) || 0) + 1);
        }
      });
    });

    return Array.from(fileCommentCounts.entries())
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 files
  }

  private extractReviewers(basicInfo: any, discussions: GitLabDiscussion[]): string[] {
    const reviewers = new Set<string>();
    
    // Primary: Add reviewers from basic info if available
    if (basicInfo?.reviewers && Array.isArray(basicInfo.reviewers)) {
      basicInfo.reviewers.forEach((reviewer: any) => {
        if (reviewer?.name) {
          reviewers.add(reviewer.name);
        }
      });
    }
    
    // Secondary: Add assignees as potential reviewers if no specific reviewers field
    if (reviewers.size === 0 && basicInfo?.assignees && Array.isArray(basicInfo.assignees)) {
      basicInfo.assignees.forEach((assignee: any) => {
        // Don't add the author as a reviewer
        if (assignee?.name && assignee.name !== basicInfo?.author?.name) {
          reviewers.add(assignee.name);
        }
      });
    }
    
    // Fallback: Only use discussions if no reviewers found from basic info
    if (reviewers.size === 0) {
      discussions.forEach(discussion => {
        discussion.notes.forEach(note => {
          if (!note.system && note.author?.name && note.author.name !== basicInfo?.author?.name) {
            reviewers.add(note.author.name);
          }
        });
      });
    }

    console.log('Extracted reviewers:', Array.from(reviewers));
    return Array.from(reviewers);
  }

  private extractAuthors(basicInfo: any, discussions: GitLabDiscussion[]): string[] {
    const authors = new Set<string>();
    
    // Only add the actual MR author from basic info
    if (basicInfo?.author?.name) {
      authors.add(basicInfo.author.name);
      console.log('Extracted MR author:', basicInfo.author.name);
      return Array.from(authors);
    }
    
    // Fallback: Only add first author from discussions if no author found from basic info
    for (const discussion of discussions) {
      for (const note of discussion.notes) {
        if (!note.system && note.author?.name) {
          authors.add(note.author.name);
          console.log('Extracted authors from discussions:', Array.from(authors));
          return Array.from(authors); // Return first author found
        }
      }
    }

    console.log('No authors found');
    return Array.from(authors);
  }

  private calculateTimeToMerge(creationDate: Date | null, mergeDate: Date | null): number | null {
    if (!creationDate || !mergeDate) {
      return null;
    }
    
    const diffInMs = mergeDate.getTime() - creationDate.getTime();
    return Math.round(diffInMs / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private generateRecommendations(pipelines: GitLabPipeline[], topCommentedFiles: Array<{ file: string; count: number }>, failedPipelines: number): string[] {
    const recommendations: string[] = [];
    
    // Pipeline-based recommendations
    if (failedPipelines > 0) {
      recommendations.push('Address Pipeline Failures: Fix failed pipeline issues before merging');
    }
    
    // File-based recommendations
    if (topCommentedFiles.length > 0) {
      const topFile = topCommentedFiles[0];
      if (topFile.count > 3) {
        recommendations.push(`Focus on ${topFile.file}: This file has received ${topFile.count} comments and may need careful review`);
      }
    }
    
    // Test-related recommendations
    const testFiles = topCommentedFiles.filter(f => f.file.includes('.spec.') || f.file.includes('.test.'));
    if (testFiles.length > 0) {
      recommendations.push('Review Unit Tests: Multiple test files have comments - ensure test coverage is adequate');
    }
    
    // General recommendations
    if (pipelines.length === 0) {
      recommendations.push('Add CI/CD Pipeline: Consider adding automated testing and deployment pipelines');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('General Review: Review code changes carefully and ensure all requirements are met');
    }
    
    return recommendations;
  }

  getAllMergeRequests(): Observable<any[]> {
    const url = `${this.gitlabApiUrl}/projects/${this.projectId}/merge_requests`;
    const headers = { Authorization: `Bearer ${this.gitlabToken}` };
    // Get the first 20 merge requests, you can add pagination later
    return this.http.get<any[]>(url, { 
      headers,
      params: {
        per_page: '20',
        page: '1',
        state: 'all' // Get all states: opened, closed, merged
      }
    });
  }

  formatDiscussionsForAI(discussions: GitLabDiscussion[]): string {
    let formattedContent = '';
    
    discussions.forEach((discussion, index) => {
      formattedContent += `\n--- Discussion ${index + 1} ---\n`;
      
      discussion.notes.forEach(note => {
        if (!note.system) { // Skip system notes
          formattedContent += `\n${note.author.name} (${note.created_at}):\n${note.body}\n`;
        }
      });
    });
    
    return formattedContent;
  }

  private handleError(error: any): Observable<never> {
    console.error('GitLab Service Error:', error);
    return throwError(() => error);
  }
}
