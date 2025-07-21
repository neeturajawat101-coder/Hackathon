import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Firestore } from '@angular/fire/firestore';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { Observable, from, map, catchError, of } from 'rxjs';

export interface MRData {
  id?: string;
  mrId: string;
  title: string;
  description?: string;
  jiraLink?: string;
  webUrl: string;
  priority: 'High' | 'Medium' | 'Low';
  squads: string;
  status: 'opened' | 'merged' | 'closed' | 'draft';
  reviewer?: string;
  author: string;
  action?: string;
  createdAt: Date;
  updatedAt: Date;
  targetBranch?: string;
  sourceBranch?: string;
  labels?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseServiceV2 {
  private firestore = inject(Firestore);
  private platformId = inject(PLATFORM_ID);
  private collectionName = 'mrData';

  // Check if running in browser
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // Create a new MR record
  createMR(mrData: Omit<MRData, 'id' | 'createdAt' | 'updatedAt'>): Observable<string> {
    if (!this.isBrowser()) {
      return of('mock-id-' + Date.now());
    }

    const data = {
      ...mrData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const collectionRef = collection(this.firestore, this.collectionName);
    
    return from(addDoc(collectionRef, data)).pipe(
      map(docRef => {
        return docRef.id;
      }),
      catchError(error => {
        console.error('Error creating MR:', error);
        throw error;
      })
    );
  }

  // Get all MRs
  getAllMRs(): Observable<MRData[]> {
    // Return empty array if not in browser (SSR protection)
    if (!this.isBrowser()) {
      return of([]);
    }

    try {
      if (!this.firestore) {
        console.error('Firestore instance is null or undefined');
        return of([]);
      }

      const collectionRef = collection(this.firestore, this.collectionName);
      
      return from(getDocs(collectionRef)).pipe(
        map(snapshot => {
          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Convert Timestamp back to Date
              createdAt: data['createdAt']?.toDate() || new Date(),
              updatedAt: data['updatedAt']?.toDate() || new Date()
            } as MRData;
          });
        }),
        catchError(error => {
          console.error('Error getting MRs:', error);
          // Return empty array on error
          return of([]);
        })
      );
    } catch (error) {
      console.error('Error in getAllMRs setup:', error);
      return of([]);
    }
  }

  // Get MR by ID
  getMRById(id: string): Observable<MRData | null> {
    const docRef = doc(this.firestore, this.collectionName, id);
    
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date()
          } as MRData;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error getting MR by ID:', error);
        return of(null);
      })
    );
  }

  // Update MR
  updateMR(id: string, updates: Partial<MRData>): Observable<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const data = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    return from(updateDoc(docRef, data)).pipe(
      catchError(error => {
        console.error('Error updating MR:', error);
        throw error;
      })
    );
  }

  // Delete MR
  deleteMR(id: string): Observable<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    
    return from(deleteDoc(docRef)).pipe(
      catchError(error => {
        console.error('Error deleting MR:', error);
        throw error;
      })
    );
  }

  // Search MRs
  searchMRs(searchTerm: string): Observable<MRData[]> {
    return this.getAllMRs().pipe(
      map(mrs => mrs.filter(mr => 
        mr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mr.mrId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mr.jiraLink && mr.jiraLink.toLowerCase().includes(searchTerm.toLowerCase()))
      ))
    );
  }
}
