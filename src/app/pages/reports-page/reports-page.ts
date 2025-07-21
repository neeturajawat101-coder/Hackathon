import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FirebaseService, MRData } from '../../services/firebase.service';

interface StatusCount {
  open: number;
  inCgReview: number;
  merged: number;
  approved: number;
  total: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss'
})
export class ReportsPageComponent implements OnInit {
  mrData: MRData[] = [];
  isLoading: boolean = true;
  
  // Summary statistics
  statusCounts: StatusCount = {
    open: 0,
    inCgReview: 0,
    merged: 0,
    approved: 0,
    total: 0
  };
  
  // Chart data
  monthlyTrends: MonthlyData[] = [];
  statusDistribution: StatusDistribution[] = [];

  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMRData();
  }

  loadMRData(): void {
    this.isLoading = true;
    this.firebaseService.getAllMRs().subscribe({
      next: (data) => {
        this.mrData = data;
        this.calculateStatistics();
        this.generateMonthlyTrends();
        this.generateStatusDistribution();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading MR data:', error);
        this.isLoading = false;
      }
    });
  }

  private calculateStatistics(): void {
    this.statusCounts = {
      open: 0,
      inCgReview: 0,
      merged: 0,
      approved: 0,
      total: this.mrData.length
    };

    this.mrData.forEach(mr => {
      const status = mr.status?.toLowerCase();
      switch (status) {
        case 'open':
        case 'opened':
          this.statusCounts.open++;
          break;
        case 'in cg review':
        case 'in review':
          this.statusCounts.inCgReview++;
          break;
        case 'merged':
          this.statusCounts.merged++;
          break;
        case 'approved':
          this.statusCounts.approved++;
          break;
      }
    });
  }

  private generateMonthlyTrends(): void {
    const monthCounts = new Map<string, number>();
    
    // Only count merged MRs using their mergedAt date
    this.mrData.forEach(mr => {
      if (mr.status?.toLowerCase() === 'merged' && mr.mergedAt) {
        let dateToUse: Date;
        
        // Handle Firebase Timestamp objects
        if (mr.mergedAt && typeof mr.mergedAt === 'object' && 'seconds' in mr.mergedAt) {
          dateToUse = new Date((mr.mergedAt as any).seconds * 1000);
        } else {
          dateToUse = new Date(mr.mergedAt);
        }
        
        if (!isNaN(dateToUse.getTime())) {
          const monthKey = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}`;
          monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
        }
      }
    });

    // Convert to array and sort by date
    const sortedEntries = Array.from(monthCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7); // Last 7 months

    this.monthlyTrends = sortedEntries.map(([month, count]) => ({
      month: this.formatMonth(month),
      count
    }));
  }

  private generateStatusDistribution(): void {
    const total = this.statusCounts.total;
    const colors = ['#17a2b8', '#ffc107', '#6f42c1', '#28a745']; // Teal, Yellow, Purple, Green
    
    this.statusDistribution = [
      {
        status: 'Open',
        count: this.statusCounts.open,
        percentage: Math.round((this.statusCounts.open / total) * 100),
        color: colors[0]
      },
      {
        status: 'In Cg Review',
        count: this.statusCounts.inCgReview,
        percentage: Math.round((this.statusCounts.inCgReview / total) * 100),
        color: colors[1]
      },
      {
        status: 'Approved',
        count: this.statusCounts.approved,
        percentage: Math.round((this.statusCounts.approved / total) * 100),
        color: colors[2]
      },
      {
        status: 'Merged',
        count: this.statusCounts.merged,
        percentage: Math.round((this.statusCounts.merged / total) * 100),
        color: colors[3]
      }
    ].filter(item => item.count > 0);
  }

  private formatMonth(monthKey: string): string {
    try {
      const [year, month] = monthKey.split('-');
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      
      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return monthKey; // Fallback to raw month key
      }
      
      const date = new Date(yearNum, monthNum - 1, 1);
      const formatted = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      return formatted === 'Invalid Date' ? monthKey : formatted;
    } catch (error) {
      console.error('Error formatting month:', monthKey, error);
      return monthKey; // Fallback to raw month key
    }
  }

  getMaxTrendValue(): number {
    return Math.max(...this.monthlyTrends.map(trend => trend.count), 1);
  }
}
