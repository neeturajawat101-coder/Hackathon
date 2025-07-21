import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collectionData,
  CollectionReference,
  DocumentData,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';

export interface MRData {
  id?: string;
  
  // Support both field naming conventions
  mrId?: string;  // New convention
  mr?: string;    // Firebase actual field name
  
  title: string;
  description?: string;
  
  // Support both field naming conventions
  jiraLink?: string;  // New convention  
  jira?: string;      // Firebase actual field name
  
  // Support both field naming conventions
  webUrl?: string;    // New convention
  thread?: string;    // Firebase actual field name
  
  priority: 'High' | 'Medium' | 'Low' | 'high' | 'medium' | 'low';
  squads: string;
  status: 'opened' | 'merged' | 'closed' | 'draft' | 'Open' | 'Merged' | 'Closed' | 'Draft' | 'In Cg Review';
  reviewer?: string | string[];
  author?: string;
  action?: string;
  date?: string;
  createdAt?: Date;
  updatedAt?: Date;
  mergedAt?: Date;  // GitLab merged_at timestamp
  targetBranch?: string;
  sourceBranch?: string;
  labels?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private firestore = inject(Firestore);
  private platformId = inject(PLATFORM_ID);
  private collectionName = 'mrData';

  constructor() {}

  // Check if running in browser
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  private getCollection(): CollectionReference<DocumentData> {
    return collection(this.firestore, this.collectionName);
  }

  // Save MR data to Firebase
  async saveMR(mrData: any): Promise<void> {
    if (!this.isBrowser()) {
      console.log('Not in browser, skipping Firebase save');
      return;
    }

    try {
      await addDoc(this.getCollection(), {
        ...mrData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('MR data saved successfully to Firebase');
    } catch (error) {
      console.error('Error saving MR data:', error);
      throw error;
    }
  }

  // Create MR (for compatibility with existing code)
  createMR(mrData: Omit<MRData, 'id' | 'createdAt' | 'updatedAt'>): Observable<string> {
    if (!this.isBrowser()) {
      console.log('Not in browser, returning mock ID');
      return of('mock-id-' + Date.now());
    }

    return new Observable(observer => {
      this.saveMR(mrData).then(() => {
        const mockId = 'saved-' + Date.now();
        console.log('MR created with ID:', mockId);
        observer.next(mockId);
        observer.complete();
      }).catch(error => {
        console.error('Error in createMR:', error);
        observer.error(error);
      });
    });
  }

  // Get all MRs
  getAllMRs(): Observable<MRData[]> {
    try {
      const q = query(
        this.getCollection(),
        orderBy('updatedAt', 'desc')
      );
      
      return collectionData(q, { idField: 'id' }) as Observable<MRData[]>;
    } catch (error) {
      console.error('Error getting MRs:', error);
      
      // Only return empty array on error if we're definitely not in browser
      if (!this.isBrowser()) {
        console.log('Not in browser, returning empty array after error');
        return of([]);
      }
      
      // If we're in browser but got an error, still return empty array
      return of([]);
    }
  }

  // Delete MR
  deleteMR(id: string): Observable<void> {
    if (!this.isBrowser()) {
      console.log('Not in browser, skipping delete');
      return of();
    }

    return new Observable(observer => {
      deleteDoc(doc(this.firestore, this.collectionName, id)).then(() => {
        console.log('MR deleted successfully:', id);
        observer.next();
        observer.complete();
      }).catch(error => {
        console.error('Error deleting MR:', error);
        observer.error(error);
      });
    });
  }

  // Update MR
  async updateMR(id: string, updates: Partial<MRData>): Promise<void> {
    if (!this.isBrowser()) {
      console.log('Not in browser, skipping update');
      return;
    }

    try {
      await updateDoc(doc(this.firestore, this.collectionName, id), {
        ...updates,
        updatedAt: new Date()
      });
      console.log('MR updated successfully:', id);
    } catch (error) {
      console.error('Error updating MR:', error);
      throw error;
    }
  }
}