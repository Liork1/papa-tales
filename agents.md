# Papa Tales - Technical Architecture & Agent Design

## System Architecture Overview

Papa Tales follows a client-server architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React/Next.js)                   │
│  - UI Components (Phase 2+)                                 │
│  - Story Prompt Input                                       │
│  - API Client                                               │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Next.js API Routes)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ /api/generate-story                                    │ │
│  │ - Validate input                                       │ │
│  │ - Fetch inspirational stories                          │ │
│  │ - Call Claude API                                      │ │
│  │ - Return generated story                               │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────┬──────────────────────────────────┬────────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────────────┐    ┌──────────────────────────┐
│   Supabase (PostgreSQL)      │    │  Anthropic Claude API    │
│                              │    │                          │
│  Table: stories              │    │  - 4.6 Opus Model       │
│  - Inspirational stories     │    │  - Story Generation     │
│  - Seeded data               │    │  - Hebrew Language      │
│  - Metadata & themes         │    │                          │
└──────────────────────────────┘    └──────────────────────────┘
```

---

## Component Architecture

### 1. API Layer

#### Endpoint: `/api/generate-story`

**Method**: POST

**Request Body Schema**:
```typescript
interface GenerateStoryRequest {
  prompt: string;           // Hebrew story prompt
  ageGroup?: string;        // Target age: "2-4" | "4-6" | "6-8" | "8-10"
  theme?: string;           // Optional theme filter
  maxLength?: number;       // Word count (default: 700)
}
```

**Response Schema**:
```typescript
interface GenerateStoryResponse {
  success: boolean;
  data?: {
    story: string;                // Full story in Hebrew
    title: string;                // Generated title
    rhymeScheme: string;           // e.g., "AABB"
    wordCount: number;
    generatedAt: string;           // ISO timestamp
    inspiration?: string[];        // Themes from inspirational stories
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

**Status Codes**:
- `200` - Story generated successfully
- `400` - Invalid request parameters
- `429` - Rate limit exceeded
- `500` - Server error
- `503` - Claude API unavailable

---

### 2. Database Layer

#### Service: `lib/supabase.ts`

**Responsibilities**:
- Initialize Supabase client
- Manage database connections
- Handle queries with error handling

**Key Functions**:
```typescript
// Initialize Supabase client
export const initSupabaseClient = () => {
  // Returns authenticated Supabase client
}

// Fetch stories by filter criteria
export const getStories = (filters: {
  theme?: string;
  ageGroup?: string;
  limit?: number;
}) => Promise<Story[]>

// Get random inspirational stories
export const getRandomStories = (count: number) => Promise<Story[]>
```

#### Database Schema: `stories` Table

```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  theme VARCHAR(50),
  age_group VARCHAR(20),
  keywords TEXT[] DEFAULT '{}',
  rhyme_scheme VARCHAR(20),
  language VARCHAR(5) DEFAULT 'he',
  word_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stories_theme ON stories(theme);
CREATE INDEX idx_stories_age_group ON stories(age_group);
CREATE INDEX idx_stories_language ON stories(language);
```

---

### 3. AI Integration Layer

#### Service: `lib/claude.ts`

**Responsibilities**:
- Manage Claude API client
- Build system prompts
- Handle API calls with retry logic
- Parse responses

**Key Functions**:
```typescript
// Initialize Claude client
export const initClaudeClient = () => {
  // Returns Anthropic client with API key from .env.local
}

// Generate story using Claude
export const generateStory = async (options: {
  prompt: string;              // Hebrew prompt
  inspirationalStories: Story[];
  ageGroup: string;
  maxTokens?: number;
}) => Promise<{
  story: string;
  title: string;
  rhymeScheme: string;
}>

// Parse Claude response
export const parseStoryResponse = (response: string) => {
  // Extract story, title, rhyme scheme from response
}
```

**System Prompt (Hebrew)**:
```
אתה סופר מומחה של סיפורים לילדים. המשימה שלך היא ליצור סיפור חרוז מקורי בעברית.

דרישות:
1. השתמש בשפה פשוטה והבנה לגיל [AGE_GROUP]
2. הסיפור צריך להיות בעל חרוזים קבועים (בחר AABB או ABAB)
3. אורך: [WORD_COUNT] מילים בערך
4. השלח שיעור או ערך חיובי
5. היה יצירתי אבל השתמש בטמות מסיפורי ההשראה שלהלן כבעלי השפעה

סיפורי השראה:
[INSPIRATIONAL_STORIES]

תשובתך צריכה להיות בפורמט JSON:
{
  "title": "כותרת הסיפור",
  "story": "הסיפור המלא",
  "rhymeScheme": "AABB או ABAB",
  "themes": ["תמה1", "תמה2"]
}
```

---

### 4. Stories Utility Layer

#### Service: `lib/stories.ts`

**Responsibilities**:
- Query logic for fetching stories
- Matching and filtering
- Story composition for prompts

**Key Functions**:
```typescript
// Get inspirational stories based on prompt context
export const getContextualStories = async (
  context: {
    theme?: string;
    ageGroup?: string;
    keywords?: string[];
  },
  limit: number = 3
) => Promise<Story[]>

// Build inspiration context for Claude
export const buildInspirationContext = (stories: Story[]) => string

// Validate story output
export const validateGeneratedStory = (story: any): boolean
```

---

### 5. Type Definitions

#### File: `types/stories.ts`

```typescript
export interface Story {
  id: string;
  title: string;
  content: string;
  theme?: string;
  ageGroup?: string;
  keywords: string[];
  rhymeScheme?: string;
  language: string;
  wordCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryTheme {
  id: string;
  name: string;
  description: string;
}

export interface AgeGroup {
  id: string;
  range: string;          // e.g., "4-6"
  minAge: number;
  maxAge: number;
  complexity: 'simple' | 'moderate' | 'advanced';
}

export type RhymeScheme = 'AABB' | 'ABAB' | 'ABCB' | 'ABBA';
```

---

## Data Flow

### Story Generation Flow

```
1. User Input
   └─> Prompt (Hebrew)
       Age Group (optional)
       Theme (optional)

2. API Validation
   └─> Validate prompt length (10-500 chars)
   └─> Validate age group format
   └─> Validate theme against known themes

3. Database Query
   └─> Fetch 3-5 inspirational stories
   └─> Filter by theme if provided
   └─> Filter by age group if provided

4. Prompt Construction
   └─> Build system prompt in Hebrew
   └─> Include inspirational stories context
   └─> Add constraints (word count, rhyme scheme)

5. Claude API Call
   └─> Send prompt to Claude 4.6 (Opus)
   └─> Wait for response (max 30 seconds)
   └─> Handle rate limits & errors

6. Response Parsing
   └─> Parse JSON from Claude response
   └─> Extract story, title, rhyme scheme
   └─> Validate output format

7. Response Return
   └─> Format API response
   └─> Return to client
   └─> Log generation metrics
```

---

## Error Handling Strategy

### Error Categories

#### 1. Input Validation Errors
```typescript
{
  code: 'INVALID_INPUT',
  message: 'הנושא אינו חוקי',
  details: {
    field: 'prompt',
    reason: 'too_short',
    minLength: 10
  }
}
```

#### 2. Database Errors
```typescript
{
  code: 'DB_ERROR',
  message: 'שגיאה בקישור לבסיס הנתונים',
  details: {
    operation: 'fetch_stories',
    retry: true
  }
}
```

#### 3. Claude API Errors
```typescript
{
  code: 'CLAUDE_ERROR',
  message: 'שגיאה בעיבוד בקשתך',
  details: {
    statusCode: 429,
    retryAfter: 60
  }
}
```

#### 4. Response Parsing Errors
```typescript
{
  code: 'PARSE_ERROR',
  message: 'שגיאה בעיבוד התשובה',
  details: {
    expected: 'JSON',
    received: 'text'
  }
}
```

### Retry Logic
- Automatic retry on:
  - Network timeouts (up to 3 times)
  - 429 (Rate Limit) - with exponential backoff
  - 5xx server errors - with exponential backoff
- No retry on:
  - 4xx client errors
  - Invalid input errors

---

## Environment Configuration

### `.env.local` Variables

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# Supabase Local (Development)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Feature Flags
ENABLE_LOGGING=true
LOG_LEVEL=info
MAX_STORY_LENGTH=800
DEFAULT_AGE_GROUP=4-6

# Rate Limiting
API_RATE_LIMIT=10
RATE_LIMIT_WINDOW_MS=3600000
```

---

## Performance Considerations

### Optimization Strategies

1. **Story Caching**
   - Cache inspirational stories in memory
   - Invalidate cache every 24 hours
   - Use Supabase cache headers

2. **Claude API Optimization**
   - Use shorter prompts when possible
   - Batch process if needed in Phase 3
   - Monitor token usage

3. **Database Queries**
   - Index on theme, ageGroup, language
   - Limit results to 5 stories maximum
   - Use connection pooling

4. **Response Times**
   - Target: <5 seconds for story generation
   - Timeout: 30 seconds max
   - Async processing for non-blocking UI (Phase 2)

---

## Security Considerations

### API Security
- Validate all inputs
- Implement rate limiting
- Use CORS headers appropriately
- Log suspicious activity

### Data Security
- Use environment variables for secrets
- Never expose API keys in frontend code
- Sanitize all user inputs
- Use HTTPS in production

### Content Safety
- Filter inappropriate keywords in prompts
- Moderate generated stories (optional)
- Age-appropriate content validation

---

## Monitoring & Logging

### Metrics to Track
- API response times
- Claude API usage (tokens, cost)
- Error rates by type
- Story generation success rate
- Database query times

### Logging Format
```typescript
{
  timestamp: ISO_STRING,
  level: 'info' | 'warn' | 'error',
  service: 'api' | 'claude' | 'db',
  action: string,
  duration_ms: number,
  error?: string,
  userId?: string  // Future when auth is added
}
```

---

## Phase 2 Implementation Checklist

### Backend Setup
- [ ] Create Next.js API route structure
- [ ] Set up environment variables
- [ ] Initialize Supabase connection utility
- [ ] Initialize Claude API client

### Database Integration
- [ ] Create stories table with schema
- [ ] Write `seed.tsx` script
- [ ] Load seed data into local Supabase
- [ ] Create database query utilities

### API Development
- [ ] Build request validation middleware
- [ ] Implement `/api/generate-story` endpoint
- [ ] Build Claude prompt builder
- [ ] Implement response parsing logic

### Error Handling
- [ ] Add try-catch blocks
- [ ] Implement error response formatting
- [ ] Add retry logic for API calls
- [ ] Create logging utility

### Testing
- [ ] Test with sample Hebrew prompts
- [ ] Test error scenarios
- [ ] Test rate limiting
- [ ] Verify story quality

---

## Future Considerations (Phase 3+)

- **Image Generation**: Integrate with DALL-E or similar for story illustrations
- **Story History**: Add user accounts and story persistence
- **Story Sharing**: Enable sharing and export functionality
- **Language Support**: Expand to English, Arabic, etc.
- **Advanced Analytics**: Track story preferences and user behavior
- **Story Customization**: Allow more fine-grained control over story parameters
- **Voice Narration**: Add text-to-speech for stories