# Backend Algorithms Analysis

This document provides a comprehensive analysis of all algorithms implemented in the backend folder.

## 1. **Trending Posts Algorithm** 📈
**Location:** `backend/src/utils/post-utils.ts`

**Algorithm Type:** Scoring/Ranking Algorithm

**Description:**
Implements a weighted scoring system to determine trending posts based on engagement metrics and recency.

**Formula:**
```
Trending Score = (likes × 2) + (comments × 1.5) + (reposts × 2.5) - (hours_since_posted × 0.5)
```

**Key Features:**
- Uses MongoDB aggregation pipeline
- Weights reposts more heavily than likes and comments
- Penalizes older posts with time decay
- Sorts by score descending, then by creation date

**Complexity:** O(n log n) - Due to sorting operation

---

## 2. **Explore Posts Algorithm** 🔍
**Location:** `backend/src/utils/post-utils.ts`

**Algorithm Type:** Hybrid Ranking Algorithm

**Description:**
Combines recency and popularity to create a diverse feed.

**Formula:**
```
Popularity Score = (likes × 2) + (comments × 1.5) + (reposts × 2.5)
```

**Sorting Strategy:**
- Primary: Creation date (newest first)
- Secondary: Popularity score (highest first)

**Complexity:** O(n log n)

---

## 3. **Trending Hashtags Algorithm** #️⃣
**Location:** `backend/src/utils/post-utils.ts`

**Algorithm Type:** Aggregation & Counting Algorithm

**Description:**
Identifies trending hashtags by counting occurrences within a time window.

**Process:**
1. Filter posts within last N days (default: 2 days)
2. Unwind hashtags array
3. Group by hashtag and count occurrences
4. Sort by count descending
5. Return top N hashtags (default: 10)

**Complexity:** O(n) - Linear aggregation

---

## 4. **Content Filtering Algorithm** 🛡️
**Location:** `backend/src/utils/contentFilter.ts`

**Algorithm Type:** Pattern Matching & Text Filtering

**Description:**
Multi-layered content filtering system for inappropriate content detection.

**Components:**
1. **Keyword Filtering:**
   - Exact word matching (case-insensitive)
   - Whitelist exclusion mechanism
   - Custom word lists support

2. **Pattern Matching:**
   - Regex patterns for hate speech
   - Spam/scam pattern detection
   - Multi-word phrase detection

3. **Severity Classification:**
   - None: No violations
   - Low: Spam/scam patterns
   - Medium: Moderate violations
   - High: Profanity, hate speech, violence

**Algorithm Flow:**
```
1. Convert text to lowercase
2. Check each filter word for presence
3. Skip if word is in whitelist
4. Apply regex patterns for complex phrases
5. Aggregate violations and assign severity
6. Optionally censor content in strict mode
```

**Complexity:** O(n × m) where n = text length, m = number of filter words

---

## 5. **Image Filtering Algorithm** 🖼️
**Location:** `backend/src/utils/imageFilter.ts`

**Algorithm Type:** File Validation & Format Detection

**Description:**
Basic image validation using file signature detection.

**Validation Steps:**
1. **File Size Check:**
   - Maximum: 50MB
   - Violation if exceeded

2. **Format Detection:**
   - JPEG: Checks for `0xFF 0xD8` header
   - PNG: Checks for `0x89 0x50 0x4E 0x47` signature
   - GIF: Checks for `0x47 0x49 0x46` signature
   - WebP: Checks for `WEBP` signature

**Complexity:** O(1) - Constant time file signature check

---

## 6. **Web Scraping Algorithm** 🕷️
**Location:** `backend/src/services/scraper.service.ts`

**Algorithm Type:** Multi-source Scraping with Fallback

**Description:**
Implements a robust web scraping system with multiple sources and fallback mechanisms.

**Algorithm Flow:**
```
1. Generate source requests (Zara, H&M)
2. Prioritize user-selected brands
3. For each source:
   a. Try primary URL with fetch
   b. If fails, try backup URL
   c. If still fails, try Oxylabs proxy
4. Parse and normalize product data
5. Return first successful result
```

**Features:**
- **URL Construction:** Dynamic query parameter building
- **Locale Normalization:** Handles both hyphen and underscore formats
- **Brand Prioritization:** Filters sources by user preference
- **Fallback Chain:** fetch → backup URL → Oxylabs proxy
- **Product Mapping:** Normalizes different source formats to unified structure

**Complexity:** O(k) where k = number of sources (typically 2)

---

## 7. **Style Generation Workflow Algorithm** 🎨
**Location:** `backend/src/services/styleGenerationWorkflow.service.ts`

**Algorithm Type:** Multi-stage Pipeline Algorithm

**Description:**
Orchestrates the complete style generation process from user input to outfit creation.

**Pipeline Stages:**
```
1. Create generation record (status: pending)
2. Generate style plan via AI
   - Input: Form data + user profile
   - Output: JSON outfit plan
3. Extract primary outfit (first of up to 5)
4. For each outfit item:
   a. Build source requests
   b. Scrape product data
   c. Find first matching product
5. Store scraped products in database
6. Create outfit with product associations
7. Update generation status (completed/failed)
```

**Error Handling:**
- Graceful degradation if no products found
- Status tracking throughout pipeline
- Failure reason logging

**Complexity:** O(n × k) where n = outfit items, k = scraping complexity

---

## 8. **Product Storage/Merging Algorithm** 💾
**Location:** `backend/src/services/productStorage.service.ts`

**Algorithm Type:** Data Deduplication & Merging

**Description:**
Stores scraped products with intelligent deduplication and locale merging.

**Merge Strategy:**
1. **Product Identification:** Uses `externalId` as unique key
2. **Color Merging:**
   - Uploads color images to CDN
   - Preserves existing colors if no new ones
3. **Locale Merging:**
   - Filters out existing locale entries
   - Appends new locale details
   - Prevents duplicate locales per product
4. **Metadata Preservation:**
   - Merges query metadata
   - Preserves raw product data

**Upsert Logic:**
```
If product exists:
  - Update fields (name, description, images)
  - Merge colors (only if new ones provided)
  - Merge locale details
  - Update metadata
Else:
  - Create new product
  - Upload all images
  - Store initial data
```

**Complexity:** O(1) per product - Single database lookup

---

## 9. **Username Generation Algorithm** 👤
**Location:** `backend/src/middleware/auth.ts`

**Algorithm Type:** Unique Name Generation

**Description:**
Generates unique usernames with conflict resolution.

**Process:**
```
1. Extract base from email (before @) or generate from ID
2. Normalize: lowercase, remove special chars, keep alphanumeric + underscore
3. Check if username exists
4. If exists, append counter (1, 2, 3, ...)
5. Repeat until unique username found
6. Fallback: append timestamp if error occurs
```

**Normalization Rules:**
- Convert to lowercase
- Remove all non-alphanumeric characters except underscore
- Trim whitespace

**Complexity:** O(n) where n = number of existing similar usernames (worst case)

---

## 10. **Time Ago Calculation Algorithm** ⏰
**Location:** `backend/src/utils/notification-utils.ts`

**Algorithm Type:** Relative Time Calculation

**Description:**
Converts absolute timestamps to human-readable relative time.

**Algorithm:**
```
diff = current_time - timestamp

if diff < 60 seconds:
  return "just now"
else if diff < 3600 seconds:
  return "{minutes}m"
else if diff < 86400 seconds:
  return "{hours}h"
else if diff < 2592000 seconds:
  return "{days}d"
else if diff < 31536000 seconds:
  return "{months}mo"
else:
  return "{years}y"
```

**Time Units:**
- Seconds: 60
- Hours: 3600 (60 × 60)
- Days: 86400 (24 × 60 × 60)
- Months: 2592000 (30 × 24 × 60 × 60) - approximate
- Years: 31536000 (365 × 24 × 60 × 60) - approximate

**Complexity:** O(1)

---

## 11. **Currency Conversion Algorithm** 💱
**Location:** `backend/src/routes/billing.ts`

**Algorithm Type:** Currency Conversion

**Description:**
Converts between USD and NPR (Nepalese Rupee) currencies.

**Conversion Functions:**

1. **USD Cents → NPR Paisa:**
```
npr_paisa = round((usd_cents / 100) × exchange_rate × 100)
minimum = 1000 paisa (10 NPR)
```

2. **NPR Paisa → USD Cents:**
```
usd_cents = round((npr_paisa / 100) / exchange_rate × 100)
```

**Exchange Rate:** 1 USD = 133 NPR (configurable)

**Complexity:** O(1)

---

## 12. **Pagination Algorithm** 📄
**Location:** Multiple route files (`posts.ts`, `reports.ts`, etc.)

**Algorithm Type:** Offset-based Pagination

**Description:**
Implements standard offset-based pagination for list endpoints.

**Calculation:**
```
skip = (page - 1) × limit
offset = skip
hasNextPage = (page × limit) < totalCount
hasPrevPage = page > 1
totalPages = ceil(totalCount / limit)
```

**Usage Pattern:**
1. Extract page and limit from query parameters
2. Calculate skip value
3. Query with `.skip(skip).limit(limit)`
4. Calculate pagination metadata
5. Return results with pagination info

**Complexity:** O(n) where n = limit (number of items per page)

---

## 13. **Sorting Algorithms** 🔄
**Location:** Multiple files across backend

**Types of Sorting:**

1. **Date-based Sorting:**
   - Most common: `sort({ createdAt: -1 })` (newest first)
   - Used in posts, comments, notifications

2. **Score-based Sorting:**
   - Trending posts: By calculated score
   - Explore posts: By popularity score

3. **Custom Comparator:**
   - JavaScript array sort with custom comparison:
   ```javascript
   array.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
   ```

**Complexity:** O(n log n) - Standard comparison-based sorting

---

## 14. **Search/Filtering Algorithms** 🔎
**Location:** `backend/src/routes/protected.ts`, `posts.ts`

**Algorithm Type:** Regex-based Pattern Matching

**Description:**
Implements text search using MongoDB regex queries.

**Search Types:**

1. **Case-Insensitive Search:**
```javascript
{ field: { $regex: searchTerm, $options: 'i' } }
```

2. **Multi-field Search:**
```javascript
{
  $or: [
    { field1: { $regex: term, $options: 'i' } },
    { field2: { $regex: term, $options: 'i' } }
  ]
}
```

3. **Username Search:**
- Splits query into words
- Filters empty strings
- Searches across multiple user fields

**Complexity:** O(n × m) where n = collection size, m = pattern length

---

## 15. **Data Augmentation Algorithm** 📊
**Location:** `backend/src/scripts/style-dataset/augmentTemplates.ts`

**Algorithm Type:** Template-based Data Generation

**Description:**
Generates synthetic training data from templates with variations.

**Process:**
1. **Template Selection:**
   - Random selection from predefined scenarios
   - Each template has base items, brands, budget range

2. **Variation Application:**
   - Color variations: Random color prefix insertion
   - Price variations: ±10% randomization
   - Brand variations: Random selection from brand sets

3. **Sample Generation:**
   - Builds style plan from varied items
   - Creates form and profile data
   - Generates unique ID using MD5 hash

4. **Validation:**
   - Ensures sample passes schema validation
   - Filters invalid entries

**Hash Algorithm:**
- Uses MD5 for sample ID generation
- Input: scenario + iteration + brands
- Output: 12-character hex string

**Complexity:** O(1) per sample generation

---

## 16. **MD5 Hashing Algorithm** 🔐
**Location:** `backend/src/scripts/style-dataset/`

**Algorithm Type:** Cryptographic Hash Function

**Description:**
Used for generating unique IDs and checksums in dataset scripts.

**Usage:**
```javascript
crypto.createHash('md5')
  .update(inputString)
  .digest('hex')
  .slice(0, 12) // First 12 characters
```

**Applications:**
- Dataset sample ID generation
- Product/outfit ID hashing
- Unique identifier creation

**Complexity:** O(n) where n = input string length

---

## Summary of Algorithm Types

| Algorithm Type | Count | Examples |
|---------------|-------|----------|
| Scoring/Ranking | 3 | Trending Posts, Explore Posts, Popularity Score |
| Filtering/Search | 4 | Content Filter, Image Filter, Search, Block Filtering |
| Data Processing | 4 | Web Scraping, Product Merging, Data Augmentation, Aggregation |
| Time Calculation | 1 | Time Ago |
| Currency Conversion | 1 | USD ↔ NPR |
| Hashing | 1 | MD5 Hash |
| Sorting | 1 | Multiple sorting implementations |
| Pagination | 1 | Offset-based pagination |
| Unique Generation | 1 | Username Generation |
| Pipeline/Workflow | 1 | Style Generation Workflow |

---

## Performance Characteristics

- **Fastest Algorithms:** O(1)
  - Time ago calculation
  - Currency conversion
  - Image format validation
  
- **Linear Algorithms:** O(n)
  - Content filtering
  - Pagination
  - Aggregation queries

- **Logarithmic Algorithms:** O(n log n)
  - Sorting operations
  - Trending posts calculation

- **Quadratic Algorithms:** O(n × m)
  - Multi-field search
  - Content filtering with multiple patterns

---

## Algorithm Design Patterns

1. **Fallback Pattern:** Web scraping with multiple retry mechanisms
2. **Pipeline Pattern:** Style generation workflow
3. **Strategy Pattern:** Multiple sorting strategies
4. **Factory Pattern:** Template-based data generation
5. **Observer Pattern:** Real-time notifications
6. **Singleton Pattern:** Content filter service

---

*Last Updated: Analysis completed after reviewing all backend source files*


