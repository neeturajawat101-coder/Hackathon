import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AIProvider {
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface AISummaryRequest {
  content: string;
  context?: string;
}

export interface AISummaryResponse {
  summary: string;
  provider: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private providers: { [key: string]: AIProvider };
  private currentProvider: string;

  constructor(private http: HttpClient) {
    // Initialize providers from environment
    this.providers = this.initializeProviders();
    this.currentProvider = environment.ai.defaultProvider;
  }

  private initializeProviders(): { [key: string]: AIProvider } {
    const providers: { [key: string]: AIProvider } = {};
    
    Object.keys(environment.ai.providers).forEach(key => {
      const envProvider = environment.ai.providers[key as keyof typeof environment.ai.providers];
      providers[key] = {
        name: envProvider.name,
        apiUrl: envProvider.apiUrl,
        apiKey: envProvider.apiKey,
        model: envProvider.model
      };
    });
    
    return providers;
  }

  setProvider(provider: string): void {
    if (this.providers[provider]) {
      this.currentProvider = provider;
    }
  }

  setApiKey(provider: string, apiKey: string): void {
    if (this.providers[provider]) {
      this.providers[provider].apiKey = apiKey;
    }
  }

  generateSummary(request: AISummaryRequest): Observable<AISummaryResponse> {
    const provider = this.providers[this.currentProvider];
    
    if (!provider.apiKey) {
      return throwError(() => new Error(`API key not set for ${provider.name}`));
    }

    switch (this.currentProvider) {
      case 'openai':
        return this.callOpenAI(request, provider);
      case 'gemini':
        return this.callGemini(request, provider);
      default:
        return throwError(() => new Error('Unsupported AI provider'));
    }
  }

  private callOpenAI(request: AISummaryRequest, provider: AIProvider): Observable<AISummaryResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    });

    const body = {
      model: provider.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert code reviewer analyzing GitLab merge request discussions. Provide insightful, well-structured summaries that help understand the review process and outcomes.'
        },
        {
          role: 'user',
          content: `You are analyzing a GitLab merge request discussion. Please provide a comprehensive, well-structured summary that focuses on insights and narrative understanding.

The analysis should be organized into these sections:

**Key Insights:**
- Main discussion points and important observations
- What the code review revealed
- Technical concerns or praises mentioned

**Decisions Made:**
- Agreements reached and resolutions
- Approved changes or approaches
- Consensus items from the discussion

**Action Items:**
- Tasks to be completed and follow-up items
- Items requiring further review or implementation
- Blockers or dependencies identified

**Technical Details:**
- Code changes, implementation notes, and technical decisions
- Architecture or design considerations discussed
- Performance, security, or quality concerns

**Recommendations:**
- Best practices, suggestions for improvement, and next steps
- Process improvements
- Knowledge sharing opportunities

Context Information:
${request.context || ''}

Discussion Content:
${request.content}

Please provide a detailed, insightful analysis that helps understand the merge request review process and outcomes. Focus on the human aspects of the review - collaboration, decision-making, and technical discussions rather than just repeating the raw data.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    };

    return this.http.post<any>(provider.apiUrl, body, { headers }).pipe(
      catchError(this.handleError),
      map(response => ({
        summary: response.choices[0].message.content,
        provider: provider.name,
        timestamp: new Date()
      } as AISummaryResponse))
    );
  }

  private callGemini(request: AISummaryRequest, provider: AIProvider): Observable<AISummaryResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const body = {
      contents: [{
        parts: [{
          text: `You are analyzing a GitLab merge request discussion. Please provide a comprehensive, well-structured summary that focuses on insights and narrative understanding.

The analysis should be organized into these sections:

**Key Insights:**
- Main discussion points and important observations
- What the code review revealed
- Technical concerns or praises mentioned

**Decisions Made:**
- Agreements reached and resolutions
- Approved changes or approaches
- Consensus items from the discussion

**Action Items:**
- Tasks to be completed and follow-up items
- Items requiring further review or implementation
- Blockers or dependencies identified

**Technical Details:**
- Code changes, implementation notes, and technical decisions
- Architecture or design considerations discussed
- Performance, security, or quality concerns

**Recommendations:**
- Best practices, suggestions for improvement, and next steps
- Process improvements
- Knowledge sharing opportunities

Context Information:
${request.context || ''}

Discussion Content:
${request.content}

Please provide a detailed, insightful analysis that helps understand the merge request review process and outcomes. Focus on the human aspects of the review - collaboration, decision-making, and technical discussions rather than just repeating the raw data.`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096
      }
    };

    const url = `${provider.apiUrl}/${provider.model}:generateContent?key=${provider.apiKey}`;

    return this.http.post<any>(url, body, { headers }).pipe(
      catchError(this.handleError),
      map(response => ({
        summary: response.candidates[0].content.parts[0].text,
        provider: provider.name,
        timestamp: new Date()
      } as AISummaryResponse))
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('AI Service Error:', error);
    return throwError(() => error);
  }

  getAvailableProviders(): string[] {
    return Object.keys(this.providers);
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }
}
