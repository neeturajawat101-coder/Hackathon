# AI Integration Setup

## Overview
The MR Manager now includes AI-powered summary generation for GitLab merge request discussions. The system supports both OpenAI and Google Gemini APIs.

## Features Added

### 1. Generic AI Service (`ai.service.ts`)
- Supports multiple AI providers (OpenAI, Gemini)
- Configurable API keys
- Standardized request/response interfaces

### 2. Enhanced GitLab Service
- Fetches MR discussions from GitLab API
- Formats discussions for AI processing
- URL: `https://vie.git.bwinparty.com/api/v4/projects/502/merge_requests/{mrId}/discussions`

### 3. Summary Page Component
- Beautiful AI summary display
- MR details overview
- Discussion preview
- Error handling and retry functionality

### 4. Reports Page Enhancement
- Added MR listing section
- "AI Summary" button for each MR
- Navigation to summary page

## Setup Instructions

### 1. Configure AI Provider
Choose and configure one of the supported providers:

#### OpenAI Setup
```typescript
// In your component or service
aiService.setProvider('openai');
aiService.setApiKey('openai', 'your-openai-api-key');
```

#### Google Gemini Setup
```typescript
// In your component or service
aiService.setProvider('gemini');
aiService.setApiKey('gemini', 'your-gemini-api-key');
```

### 2. Environment Variables (Recommended)
Add to your `environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: { /* your firebase config */ },
  aiProvider: 'openai', // or 'gemini'
  openaiApiKey: 'your-openai-api-key',
  geminiApiKey: 'your-gemini-api-key'
};
```

### 3. GitLab Access Token
The GitLab service is already configured with an access token for the project.

## Usage

1. Navigate to the Reports page
2. Scroll down to the "All Merge Requests" section
3. Click "AI Summary" for any MR
4. The system will:
   - Fetch discussions from GitLab API
   - Send formatted content to AI provider
   - Display a comprehensive summary

## API Integration Details

### GitLab API Call
```
GET https://vie.git.bwinparty.com/api/v4/projects/502/merge_requests/{mrId}/discussions
Headers: Authorization: Bearer {gitlab-token}
```

### AI Processing Flow
1. Fetch MR discussions from GitLab
2. Filter out system notes
3. Format discussions with context (title, author, branches, description)
4. Send to AI provider for summary generation
5. Display formatted results

## Error Handling
- Network failures gracefully handled
- Retry functionality for failed AI requests
- User-friendly error messages
- Fallback to raw discussion data

## Security Notes
- Store API keys securely (environment variables)
- Never commit API keys to version control
- Consider using server-side proxy for API calls in production
- GitLab token has appropriate scope limitations

## Customization
The AI prompts can be customized in the `ai.service.ts` file to generate different types of summaries (technical focus, decision focus, action items, etc.).
