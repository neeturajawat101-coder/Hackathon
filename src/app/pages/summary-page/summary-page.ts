import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AIService, AISummaryResponse } from '../../services/ai.service';
import { GitLabService, GitLabDiscussion, GitLabNote, MRAnalysisData } from '../../services/gitlab.service';
import { MRData } from '../../services/firebase.service';
import { LineBreakToBrPipe } from '../../pipes/line-break-to-br.pipe';

interface ParsedSummary {
  keyInsights: string[];
  decisions: string[];
  actionItems: string[];
  technicalDetails: string[];
  recommendations: string[];
  risks: string[];
  improvements: string[];
}

interface SummaryCardInfo {
  title: string;
  icon: string;
  items: string[];
  color: string;
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-summary-page',
  standalone: true,
  imports: [CommonModule, LineBreakToBrPipe],
  templateUrl: './summary-page.html',
  styleUrl: './summary-page.scss'
})
export class SummaryPageComponent implements OnInit {
  mrData: MRData | null = null;
  analysisData: MRAnalysisData | null = null;
  discussions: GitLabDiscussion[] = [];
  summary: AISummaryResponse | null = null;
  isLoading = false;
  error: string | null = null;
  loadingStep = 0;
  magicParticles: Array<{x: number, y: number, symbol: string, delay: number}> = [];
  isBrowser: boolean;
  
  parsedSummary: ParsedSummary = {
    keyInsights: [],
    decisions: [],
    actionItems: [],
    technicalDetails: [],
    recommendations: [],
    risks: [],
    improvements: []
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private aiService: AIService,
    private gitlabService: GitLabService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('🔥 SUMMARY PAGE CONSTRUCTOR CALLED 🔥');
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Initialize analysisData with a safe structure to prevent template errors
    this.analysisData = {
      basicInfo: { id: 0, title: '', web_url: '' },
      changes: { 
        changes: []
      },
      notes: [],
      pipelines: [],
      analysis: {
        totalComments: 0,
        timeToMerge: null,
        creationDate: null,
        mergeDate: null,
        topCommentedFiles: [],
        pipelineCount: 0,
        failedPipelines: 0,
        pipelineStatuses: [],
        recommendations: [],
        authors: [],
        reviewers: []
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startMagicLoading(): void {
    this.loadingStep = 0;
    this.generateMagicParticles();
  }

  private updateLoadingStep(step: number): void {
    this.loadingStep = step;
  }

  private generateMagicParticles(): void {
    const particles = ['✨', '🌟', '💫', '⭐', '🔮', '🪄', '💎', '🌠'];
    this.magicParticles = [];
    
    for (let i = 0; i < 15; i++) {
      this.magicParticles.push({
        x: Math.random() * 800,
        y: Math.random() * 400,
        symbol: particles[Math.floor(Math.random() * particles.length)],
        delay: Math.random() * 3
      });
    }
  }

  ngOnInit(): void {
    console.log('🚀 SUMMARY PAGE COMPONENT LOADED 🚀');
    console.log('Summary page ngOnInit called');
    
    // Get MR data from router state instead of query parameters
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || (this.isBrowser ? window.history.state : {});
    
    console.log('Navigation state:', state);
    console.log('MR data from state:', state?.['mrData']);
    
    if (state?.['mrData']) {
      this.mrData = state['mrData'];
      console.log('MR data set:', this.mrData);
      this.loadMRSummary();
    } else {
      console.log('No MR data found in state');
      // For testing purposes, let's try with a known MR ID
      console.log('Testing with hardcoded MR ID: 16505');
      this.mrData = { mr: '16505' } as any;
      this.loadMRSummary();
      // this.error = 'No MR data provided. Please navigate from the All MRs page.';
    }
  }

  async loadMRSummary(): Promise<void> {
    if (!this.mrData || !this.mrData.mr) return;

    this.isLoading = true;
    this.error = null;
    this.summary = null; // Clear previous summary
    this.startMagicLoading();

    try {
      console.log('Starting MR analysis for:', this.mrData.mr);
      
      // Step 1: Gathering comprehensive data
      this.updateLoadingStep(1);
      await this.delay(1000); // Slightly longer delay for better UX
      
      // Get comprehensive analysis data from GitLab
      const fetchedData = await this.gitlabService.getComprehensiveMRAnalysis(this.mrData.mr).toPromise();
      
      console.log('Analysis data received:', fetchedData);
      
      if (!fetchedData) {
        throw new Error('Failed to fetch MR analysis data');
      }

      // Step 2: Processing and merging data
      this.updateLoadingStep(2);
      await this.delay(800);

      // Safely merge the fetched data with our initialized structure
      // This ensures analysisData.analysis always exists even if the service returns incomplete data
      if (this.analysisData) {
        this.analysisData = {
          basicInfo: fetchedData.basicInfo || this.analysisData.basicInfo,
          changes: fetchedData.changes || this.analysisData.changes,
          notes: fetchedData.notes || this.analysisData.notes,
          pipelines: fetchedData.pipelines || this.analysisData.pipelines,
          analysis: {
            ...this.analysisData.analysis,  // Start with our safe defaults
            ...(fetchedData.analysis || {}) // Override with fetched data if available
          }
        };
      } else {
        // Fallback if this.analysisData is somehow null
        this.analysisData = fetchedData;
      }

      console.log('Merged analysis data:', this.analysisData);

      // Log specific analysis details
      console.log('Creation Date:', this.getCreationDate());
      console.log('Merge Date:', this.getMergeDate());
      console.log('Time to Merge:', this.getTimeToMerge());
      console.log('Top Files:', this.getTopCommentedFiles());
      console.log('Pipeline Count:', this.getPipelineCount());
      console.log('Authors:', this.getAuthors());
      console.log('Reviewers:', this.getReviewers());
      console.log('Recommendations:', this.getRecommendations());

      // Step 3: Analyzing patterns and generating insights
      this.updateLoadingStep(3);
      await this.delay(900);
      
      // Format discussions for AI
      const formattedDiscussions = this.gitlabService.formatDiscussionsForAI(this.analysisData.notes);
      
      // Create enhanced context for AI including analysis data
      const context = `
        MR Title: ${this.mrData.title}
        Author: ${this.mrData.author}
        Status: ${this.mrData.status}
        Target Branch: ${this.mrData.targetBranch}
        Source Branch: ${this.mrData.sourceBranch}
        Description: ${this.mrData.description || 'No description provided'}
        
        Analysis Summary:
        - Creation Date: ${this.getCreationDate()?.toISOString() || 'Unknown'}
        - Merge Date: ${this.getMergeDate()?.toISOString() || 'Not merged yet'}
        - Time to Merge: ${this.getTimeToMerge() ? `${this.getTimeToMerge()} days` : 'Not calculated'}
        - Pipeline Count: ${this.getPipelineCount()}
        - Failed Pipelines: ${this.getFailedPipelines()}
        - Top Commented Files: ${this.getTopCommentedFiles().map(f => `${f.file} (${f.count} comments)`).join(', ')}
        - Authors: ${this.getAuthors().join(', ')}
        - Reviewers: ${this.getReviewers().join(', ')}
      `;

      // Generate AI summary with enhanced context
      this.summary = await this.aiService.generateSummary({
        content: formattedDiscussions,
        context: context
      }).toPromise() || null;

      // Step 4: Organizing and finalizing summary
      this.updateLoadingStep(4);
      await this.delay(600);

      // Parse the summary for structured display
      if (this.summary?.summary) {
        this.parseSummaryContent(this.summary.summary);
      }

      // Small delay to show completion
      await this.delay(300);

    } catch (error: any) {
      console.error('Error generating summary:', error);
      this.error = error.message || 'Failed to generate AI summary. Please try again.';
    } finally {
      this.isLoading = false;
      this.loadingStep = 0;
    }
  }

  goBack(): void {
    this.router.navigate(['/reports']);
  }

  retryGeneration(): void {
    this.loadMRSummary();
  }

  getNonSystemNotesCount(discussion: GitLabDiscussion): number {
    return discussion.notes.filter(note => !note.system).length;
  }

  getFirstNonSystemNote(discussion: GitLabDiscussion): GitLabNote | null {
    return discussion.notes.find(note => !note.system) || null;
  }

  truncateText(text: string, maxLength: number = 100): string {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  private parseSummaryContent(summaryText: string): void {
    // Reset parsed summary
    this.parsedSummary = {
      keyInsights: [],
      decisions: [],
      actionItems: [],
      technicalDetails: [],
      recommendations: [],
      risks: [],
      improvements: []
    };

    if (!summaryText) return;

    const lines = summaryText.split('\n').filter(line => line.trim());

    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect section headers
      if (trimmedLine.toLowerCase().includes('key insight') || 
          trimmedLine.toLowerCase().includes('main point') ||
          trimmedLine.toLowerCase().includes('summary')) {
        currentSection = 'insights';
        continue;
      } else if (trimmedLine.toLowerCase().includes('decision') || 
                 trimmedLine.toLowerCase().includes('resolved') ||
                 trimmedLine.toLowerCase().includes('agreed')) {
        currentSection = 'decisions';
        continue;
      } else if (trimmedLine.toLowerCase().includes('action') || 
                 trimmedLine.toLowerCase().includes('todo') ||
                 trimmedLine.toLowerCase().includes('follow up')) {
        currentSection = 'actions';
        continue;
      } else if (trimmedLine.toLowerCase().includes('technical') || 
                 trimmedLine.toLowerCase().includes('code') ||
                 trimmedLine.toLowerCase().includes('implementation')) {
        currentSection = 'technical';
        continue;
      } else if (trimmedLine.toLowerCase().includes('recommend') || 
                 trimmedLine.toLowerCase().includes('suggest') ||
                 trimmedLine.toLowerCase().includes('next step')) {
        currentSection = 'recommendations';
        continue;
      } else if (trimmedLine.toLowerCase().includes('risk') || 
                 trimmedLine.toLowerCase().includes('concern') ||
                 trimmedLine.toLowerCase().includes('issue')) {
        currentSection = 'risks';
        continue;
      } else if (trimmedLine.toLowerCase().includes('improve') || 
                 trimmedLine.toLowerCase().includes('enhancement') ||
                 trimmedLine.toLowerCase().includes('optimize')) {
        currentSection = 'improvements';
        continue;
      }

      // Add content to appropriate section
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || 
          trimmedLine.startsWith('*') || /^\d+\./.test(trimmedLine)) {
        const cleanedLine = trimmedLine.replace(/^[-•*\d+.]\s*/, '').trim();
        
        if (cleanedLine) {
          switch (currentSection) {
            case 'insights':
              this.parsedSummary.keyInsights.push(cleanedLine);
              break;
            case 'decisions':
              this.parsedSummary.decisions.push(cleanedLine);
              break;
            case 'actions':
              this.parsedSummary.actionItems.push(cleanedLine);
              break;
            case 'technical':
              this.parsedSummary.technicalDetails.push(cleanedLine);
              break;
            case 'recommendations':
              this.parsedSummary.recommendations.push(cleanedLine);
              break;
            case 'risks':
              this.parsedSummary.risks.push(cleanedLine);
              break;
            case 'improvements':
              this.parsedSummary.improvements.push(cleanedLine);
              break;
            default:
              // If no specific section, categorize based on content
              if (cleanedLine.toLowerCase().includes('should') || 
                  cleanedLine.toLowerCase().includes('need') ||
                  cleanedLine.toLowerCase().includes('must')) {
                this.parsedSummary.actionItems.push(cleanedLine);
              } else if (cleanedLine.toLowerCase().includes('decided') || 
                         cleanedLine.toLowerCase().includes('approved')) {
                this.parsedSummary.decisions.push(cleanedLine);
              } else if (cleanedLine.toLowerCase().includes('recommend') || 
                         cleanedLine.toLowerCase().includes('suggest')) {
                this.parsedSummary.recommendations.push(cleanedLine);
              } else if (cleanedLine.toLowerCase().includes('risk') || 
                         cleanedLine.toLowerCase().includes('concern')) {
                this.parsedSummary.risks.push(cleanedLine);
              } else if (cleanedLine.toLowerCase().includes('improve') || 
                         cleanedLine.toLowerCase().includes('enhance')) {
                this.parsedSummary.improvements.push(cleanedLine);
              } else {
                this.parsedSummary.keyInsights.push(cleanedLine);
              }
          }
        }
      }
    }
  }

  hasParsedContent(): boolean {
    return this.parsedSummary.keyInsights.length > 0 ||
           this.parsedSummary.decisions.length > 0 ||
           this.parsedSummary.actionItems.length > 0 ||
           this.parsedSummary.technicalDetails.length > 0 ||
           this.parsedSummary.recommendations.length > 0 ||
           this.parsedSummary.risks.length > 0 ||
           this.parsedSummary.improvements.length > 0;
  }

  getTotalParsedItems(): number {
    return this.parsedSummary.keyInsights.length +
           this.parsedSummary.decisions.length +
           this.parsedSummary.actionItems.length +
           this.parsedSummary.technicalDetails.length +
           this.parsedSummary.recommendations.length +
           this.parsedSummary.risks.length +
           this.parsedSummary.improvements.length;
  }

  getSummaryCards(): SummaryCardInfo[] {
    const cards: SummaryCardInfo[] = [];
    
    if (this.parsedSummary.keyInsights.length > 0) {
      cards.push({
        title: 'Key Insights',
        icon: '💡',
        items: this.parsedSummary.keyInsights,
        color: 'insights',
        priority: 'high'
      });
    }
    
    if (this.parsedSummary.decisions.length > 0) {
      cards.push({
        title: 'Decisions Made',
        icon: '✅',
        items: this.parsedSummary.decisions,
        color: 'decisions',
        priority: 'high'
      });
    }
    
    if (this.parsedSummary.actionItems.length > 0) {
      cards.push({
        title: 'Action Items',
        icon: '🎯',
        items: this.parsedSummary.actionItems,
        color: 'actions',
        priority: 'high'
      });
    }
    
    if (this.parsedSummary.risks.length > 0) {
      cards.push({
        title: 'Risks & Concerns',
        icon: '⚠️',
        items: this.parsedSummary.risks,
        color: 'risks',
        priority: 'high'
      });
    }
    
    if (this.parsedSummary.technicalDetails.length > 0) {
      cards.push({
        title: 'Technical Details',
        icon: '⚙️',
        items: this.parsedSummary.technicalDetails,
        color: 'technical',
        priority: 'medium'
      });
    }
    
    if (this.parsedSummary.recommendations.length > 0) {
      cards.push({
        title: 'Recommendations',
        icon: '🌟',
        items: this.parsedSummary.recommendations,
        color: 'recommendations',
        priority: 'medium'
      });
    }
    
    if (this.parsedSummary.improvements.length > 0) {
      cards.push({
        title: 'Improvements',
        icon: '🚀',
        items: this.parsedSummary.improvements,
        color: 'improvements',
        priority: 'low'
      });
    }
    
    // Sort by priority
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    return cards.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  getConfidenceScore(): number {
    // Simulate confidence based on amount of parsed content
    const totalItems = this.getTotalParsedItems();
    if (totalItems === 0) return 0;
    if (totalItems >= 10) return 95;
    if (totalItems >= 7) return 88;
    if (totalItems >= 5) return 82;
    if (totalItems >= 3) return 75;
    return 68;
  }

  getProcessingTime(): string {
    // Simulate processing time (in a real app, you'd track actual time)
    return (Math.random() * 2 + 1.5).toFixed(1);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Text successfully copied to clipboard
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  toggleItemExpansion(cardTitle: string, itemIndex: number): void {
    // Show expanded view of the item
    console.log('Expanding item:', cardTitle, itemIndex);
  }

  getCompletionPercentage(cardType: string): number {
    // Simulate completion percentage based on card type
    const percentages: { [key: string]: number } = {
      'insights': 85,
      'decisions': 95,
      'actions': 60,
      'technical': 75,
      'recommendations': 70,
      'risks': 80,
      'improvements': 50
    };
    return percentages[cardType] || 0;
  }

  getCircleProgress(itemCount: number): number {
    const maxItems = Math.max(...this.getSummaryCards().map(card => card.items.length));
    return maxItems > 0 ? (itemCount / maxItems) * 100 : 0;
  }

  // Helper methods for accessing analysis data
  getTimeToMerge(): number | null {
    if (!this.analysisData || !this.analysisData.analysis) {
      return null;
    }
    return this.analysisData.analysis?.timeToMerge || null;
  }

  getCreationDate(): Date | null {
    if (!this.analysisData || !this.analysisData.analysis) {
      return null;
    }
    return this.analysisData.analysis?.creationDate || null;
  }

  getMergeDate(): Date | null {
    if (!this.analysisData || !this.analysisData.analysis) {
      return null;
    }
    return this.analysisData.analysis?.mergeDate || null;
  }

  getTopCommentedFiles(): Array<{ file: string; count: number }> {
    if (!this.analysisData || !this.analysisData.analysis) {
      return [];
    }
    return this.analysisData.analysis?.topCommentedFiles || [];
  }

  getPipelineCount(): number {
    if (!this.analysisData || !this.analysisData.analysis) {
      return 0;
    }
    return this.analysisData.analysis?.pipelineCount || 0;
  }

  getPipelineDescription(): string {
    const count = this.getPipelineCount();
    if (count === 0) return 'No pipelines found';
    if (count === 1) return 'One pipeline ran';
    return `${count} pipelines ran`;
  }

  getPipelineStatuses(): string[] {
    if (!this.analysisData || !this.analysisData.analysis) {
      return [];
    }
    
    const pipelineStatuses = this.analysisData.analysis?.pipelineStatuses || [];
    const statuses: string[] = [];
    
    pipelineStatuses.forEach(pipeline => {
      if (pipeline.status === 'failed') {
        statuses.push(`❌ ${pipeline.name} - Failed`);
      } else if (pipeline.status === 'success') {
        statuses.push(`✅ ${pipeline.name} - Success`);
      } else {
        statuses.push(`⚠️ ${pipeline.name} - ${pipeline.status || 'Unknown'}`);
      }
    });
    
    return statuses;
  }

  getRecommendations(): string[] {
    if (!this.analysisData || !this.analysisData.analysis) {
      return [];
    }
    return this.analysisData.analysis?.recommendations || [];
  }

  getAuthors(): string[] {
    if (!this.analysisData || !this.analysisData.analysis) {
      return [];
    }
    return this.analysisData.analysis?.authors || [];
  }

  getReviewers(): string[] {
    if (!this.analysisData || !this.analysisData.analysis) {
      return [];
    }
    return this.analysisData.analysis?.reviewers || [];
  }

  getFailedPipelines(): number {
    if (!this.analysisData || !this.analysisData.analysis) {
      return 0;
    }
    return this.analysisData.analysis?.failedPipelines || 0;
  }

  getPipelines(): any[] {
    return this.analysisData?.pipelines || [];
  }

  getChangedFiles(): any[] {
    return this.analysisData?.changes.changes || [];
  }
}
