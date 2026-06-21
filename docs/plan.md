# Papa Tales - Project Plan

## Project Overview

Papa Tales is an AI-powered children's story generation app that creates personalized, rhyming stories for kids based on user prompts. The app leverages a database of inspirational stories and uses advanced AI models to generate contextually relevant, engaging narratives with poetic elements.

**Primary Goal**: Generate delightful, rhyming children's stories in Hebrew (Phase 1) with support for future multilingual expansion.

---

## Tech Stack

### Frontend
- **Framework**: React with Next.js
- **Language**: TypeScript (recommended)
- **Styling**: TBD (Phase 2+)

### Backend
- **Framework**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI Model**: Claude 4.6 (Opus) via Anthropic API
- **Environment Management**: `.env.local` for configuration

### Database
- **Primary**: Supabase (PostgreSQL)
- **Development**: Local Supabase instance
- **Production**: Cloud Supabase (final phase)

---

## Work execution and development workflow
according to the execution phases described in execution-phases.md

---

## Project Phases

### Phase 1: Database Setup & Infrastructure ✓ (In Scope)

**Objective**: Establish the foundational data layer with inspirational story seeds.

#### Tasks:
1. **Supabase Local Setup**
   - Initialize local Supabase environment
   - Configure PostgreSQL database
   - Set up authentication (if needed for future phases)

2. **Database Schema**
   ```
   Table: stories
   - id: UUID (primary key)
   - title: VARCHAR (story title)
   - content: TEXT (full story content)
   - theme: VARCHAR (story theme: adventure, friendship, learning, etc.)
   - age_group: VARCHAR (target age range: 2-4, 4-6, 6-8, etc.)
   - keywords: TEXT[] (array of keywords for relevance matching)
   - rhyme_scheme: VARCHAR (AABB, ABAB, etc.)
   - language: VARCHAR (ISO 639-1 code, default: 'he' for Hebrew)
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP
   ```

3. **Seed Data**
   - Create `seed.tsx` file with initial story collection
   - Minimum 10-15 diverse stories covering various themes
   - Include metadata for theme classification and age appropriateness
   - Stories should span different rhyme schemes and narrative structures

4. **Deliverables**:
   - Local Supabase configuration
   - Migration scripts
   - seed.tsx with initial story data
   - Database documentation and instruction to run it in README.md

---

### Phase 2: Backend API & AI Integration ✓ (In Scope)

**Objective**: Build the core API that generates stories using AI and inspirational stories.

#### Tasks:

1. **Environment Configuration**
   - Create `.env.local` with:
     - `ANTHROPIC_API_KEY` (Claude access)
     - `SUPABASE_URL` (local instance)
     - `SUPABASE_ANON_KEY`

2. **Story Retrieval Logic**
   - Create utility function to fetch inspirational stories from DB
   - Implement keyword matching to find relevant stories
   - Filter by age group and theme

3. **API Endpoint: `/api/generate-story`**
   
   **Request**:
   ```json
   {
     "prompt": "סיפור על ילד שמצא חברים חדשים בבית הספר",
     "ageGroup": "4-6",
     "theme": "friendship"
   }
   ```
   
   **Response**:
   ```json
   {
     "success": true,
     "story": "מלא סיפור עם חרוזים בעברית",
     "title": "כותרת הסיפור",
     "rhymeScheme": "AABB",
     "generatedAt": "2026-06-21T10:30:00Z"
   }
   ```

4. **Claude Integration**
   - Use Claude 4.6 (Opus) for story generation
   - System prompt in Hebrew with context about target audience
   - Inject inspirational stories as context
   - Temperature and parameters tuned for creative output

5. **AI Prompt Engineering**
   - System role: Expert children's story writer in Hebrew
   - Include guidelines for:
     - Age-appropriate language and themes
     - Rhyme scheme consistency (AABB, ABAB)
     - Story length (500-800 words)
     - Moral/lesson elements
   - Context: Sample inspirational stories from DB

6. **Error Handling**
   - API rate limiting
   - Graceful degradation if no inspirational stories found
   - Claude API timeout handling
   - Input validation

7. **Deliverables**:
   - `/api/generate-story` endpoint
   - Database query utilities
   - Claude integration service
   - Error handling middleware
   - API documentation

---

### Phase 3: Image Generation & UI (Out of Scope - Future MVP)

**Placeholder for future implementation**:
- Generate illustrations for stories
- Create interactive story UI
- Add user accounts and story history
- Implement story sharing features

---

## Internationalization (i18n) Strategy

### Phase 1-2 Implementation:
- Create dictionary/translation system for all UI text
- Use keys for all hardcoded strings
- Hebrew as primary language

### Structure:
```
/locales/
  ├── he.json (Hebrew - primary)
  ├── en.json (English - future)
  └── [other languages]
```

### Example Dictionary Entry:
```json
{
  "api": {
    "errors": {
      "invalidPrompt": "הנושא אינו חוקי",
      "apiError": "שגיאה בעיבוד בקשתך",
      "dbError": "שגיאה בקישור לבסיס הנתונים"
    }
  }
}
```

---

## Development Guidelines

### Code Organization:
```
papa-tales/
├── pages/
│   ├── api/
│   │   ├── generate-story.ts
│   │   └── health.ts
│   └── index.tsx
├── lib/
│   ├── supabase.ts
│   ├── claude.ts
│   ├── stories.ts
│   └── i18n.ts
├── types/
│   ├── stories.ts
│   └── api.ts
├── locales/
│   └── he.json
├── scripts/
│   └── seed.tsx
├── .env.local
└── package.json
```

### Key Principles:
- Keep backend logic isolated from frontend
- Use TypeScript for type safety
- Implement comprehensive error handling
- Add logging for debugging
- Keep secrets in environment variables
- Document API contracts clearly

### Testing Strategy:
- Unit tests for utility functions (Phase 2)
- API endpoint testing with sample prompts
- Manual testing with Hebrew language inputs

---

## Success Criteria

### Phase 1:
- ✅ Local Supabase running with seed data
- ✅ Database schema properly defined
- ✅ 10+ inspirational stories in DB

### Phase 2:
- ✅ `/api/generate-story` endpoint functional
- ✅ Claude integration working
- ✅ API returns coherent Hebrew stories with rhymes
- ✅ Error handling in place
- ✅ API tested with sample prompts
- ✅ Stories vary based on input prompt and age group

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "next": "^14.x",
    "@supabase/supabase-js": "^2.x",
    "@anthropic-ai/sdk": "^latest",
    "dotenv": "^latest"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/node": "^20.x"
  }
}
```

---

## Next Steps (Priority Order)

1. [ ] Set up local Supabase instance
2. [ ] Create database schema and migrations
3. [ ] Write `seed.tsx` with initial story data
4. [ ] Set up Next.js project structure
5. [ ] Configure environment variables
6. [ ] Implement Supabase connection utility
7. [ ] Implement Claude API integration
8. [ ] Build `/api/generate-story` endpoint
9. [ ] Test with Hebrew prompts
10. [ ] Add error handling and logging
11. [ ] Document API for Phase 3 usage

---

## Notes & Considerations

- **Hebrew Language**: Ensure UTF-8 encoding throughout
- **AI Costs**: Monitor Claude API usage during development
- **Local Development**: Keep local Supabase instance running - consider Docker setup
- **Future Scalability**: Design API to support batch processing for Phase 3 image generation
- **Story Quality**: Plan for evaluation process to assess generated stories
- **Content Safety**: Consider filtering mechanisms for age-appropriate content

