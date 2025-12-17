# 📋 Documentation Standards & Principles

**Guidelines for maintaining consistent, high-quality documentation.**

---

## 🎯 Core Principles

### 1. Clear & Concise

- **Goal:** Readers understand immediately
- **How:** Short paragraphs, active voice, plain language
- **Example:**
  ```
  ❌ BAD: "The system facilitates the provision of services"
  ✅ GOOD: "The API provides services"
  ```

### 2. Complete & Accurate

- **Goal:** Readers can act on information
- **How:** Include examples, test steps, expected results
- **Example:**
  ```
  ❌ BAD: "Run migrations"
  ✅ GOOD: "Run: docker compose exec api npx prisma migrate dev"
  ```

### 3. Organized & Structured

- **Goal:** Readers find what they need quickly
- **How:** Numbered sections, clear headings, consistent formatting
- **Example:**
  ```
  [1] OVERVIEW
  [2] SETUP
  [2a] Prerequisites
  [2b] Installation
  [3] USAGE
  ```

### 4. Actionable & Practical

- **Goal:** Readers can implement what they learn
- **How:** Code samples, step-by-step guides, checklists
- **Example:**
  Include actual commands they can copy/paste

### 5. Maintainable & Evolving

- **Goal:** Documentation stays current as code changes
- **How:** Clear ownership, update timestamps, version notes
- **Example:**
  ```markdown
  _Last Updated: December 16, 2025_
  _Status: ✅ Complete & Tested_
  ```

---

## 📝 File Structure Template

Every major documentation file should follow this structure:

```markdown
# 📚 Document Title

**One-sentence description of content.**

---

## 🎯 Overview Section

- Clear explanation of what this doc covers
- Who should read it
- What they'll learn

---

## 📋 Main Content Section

### [1] FIRST MAIN TOPIC

- Overview of topic
- Key concepts

#### [1a] Sub-topic

Details here

#### [1b] Another Sub-topic

Details here

### [2] SECOND MAIN TOPIC

- Overview of topic

#### [2a] Sub-topic

Details here

---

## ✅ Checklist Section

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

---

## 🆘 Troubleshooting Section

### Problem: Issue Description

**Symptoms:** What the user sees
**Cause:** Why this happens
**Solution:** How to fix it

---

## 📚 Related Documentation

- [Link to related doc](path)
- [Another related doc](path)

---

## 🔗 External Resources

- Official docs: [link]
- Tutorials: [link]

---

_Last Updated: [Date]_
_Status: [✅ Complete | 🔄 In Progress | 📋 Planned]_
_Maintainer: [Team/Person]_
```

---

## 🏷️ Markdown Formatting Guidelines

### Headings

```markdown
# H1 - Document Title (use once per file)

## H2 - Major sections

### H3 - Subsections

#### H4 - Sub-subsections

❌ Don't use: Too many levels beyond H4
```

### Emphasis

```markdown
**Bold** - Important terms, keywords
_Italic_ - Emphasis, file names
`Code` - Functions, variables, commands
`path/to/file.ext` - File paths

❌ Don't use: ALL CAPS for emphasis
```

### Code Blocks

```markdown
Single line code: `npm run dev`

Multi-line code:
\`\`\`bash
docker compose up -d
docker compose ps
\`\`\`

\`\`\`typescript
interface User {
id: number;
name: string;
}
\`\`\`
```

### Lists

```markdown
Unordered:

- Item 1
- Item 2
  - Nested item

Ordered:

1. First step
2. Second step
3. Third step

Definition:
Term
: Definition of term
```

### Tables

```markdown
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

### Blockquotes

```markdown
> Single-line important information

> Multi-line
> important information
> with multiple lines

⚠️ Use for: Warnings, important notes, tips
```

### Links

```markdown
[Link text](relative/path/to/file.md)
[Link with anchor](file.md#section-name)
[External link](https://example.com)

❌ Don't: Use absolute paths
✅ Do: Use relative paths in workspace
```

---

## 🏗️ Common Section Patterns

### Quick Start Section

```markdown
## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker

### 5-Minute Setup

1. Clone repository
2. Install dependencies
3. Start services
4. Run tests

See [Detailed Setup](#setup) for more.
```

### Architecture Section

```markdown
## 🏛️ Architecture

### System Design

[Describe high-level design]

### Components

- **Component A:** Purpose
- **Component B:** Purpose

### Data Flow

1. User does action
2. Component A processes
3. Component B stores
4. Response sent back
```

### API Reference Section

```markdown
## 📡 API Reference

### Endpoint: GET /api/resource

**Description:** What this endpoint does

**Request:**
\`\`\`
GET /api/resource/123
Authorization: Bearer {token}
\`\`\`

**Response (200):**
\`\`\`json
{
"id": 123,
"name": "Resource"
}
\`\`\`

**Errors:**

- 404: Resource not found
- 401: Unauthorized
```

### Error Handling Section

```markdown
## 🚨 Error Handling

### Common Errors

#### Error: ECONNREFUSED

**Cause:** Database connection failed
**Solution:**

1. Check database is running
2. Verify connection string
3. Check firewall

#### Error: CORS Error

**Cause:** Frontend can't reach API
**Solution:**

1. Verify API URL in frontend
2. Check CORS enabled on backend
```

### FAQ Section

```markdown
## ❓ Frequently Asked Questions

### Q: How do I...?

A: [Detailed answer with steps]

### Q: Why does...?

A: [Explanation with example]

### Q: Can I...?

A: [Yes/No with explanation]
```

---

## 📐 Numbering System

Use this consistent numbering for inline references:

```
[1] Main topic
[1a] First sub-topic
[1b] Second sub-topic
[1.1] Related point under [1a]
[1.1.1] Nested point

[2] Another main topic
[2a] First sub-topic
[2.1] Point under [2]
[2.1.1] Nested point

[3] Third main topic
```

### Why This System?

- ✅ Easy to reference: "See section [2a]"
- ✅ Allows deep nesting: [1.2.3.1]
- ✅ Consistent across all docs
- ✅ Works in code comments too

---

## 💬 Comment Patterns

### In Code

```typescript
// [1] OVERVIEW
// [1a] What this code does
// [1b] Why it does it

// [2] IMPLEMENTATION
// [2a] First part
// [2b] Second part

// [2.1] Important detail
// [2.1a] Sub-detail
```

### In Documentation

```markdown
## [1] Overview

Description

### [1a] Sub-topic

Details

### [1b] Another topic

Details

## [2] Implementation

Code examples
```

---

## ✨ Quality Checklist

### Before Publishing Any Doc

#### Content Quality

- [ ] Spelling and grammar checked
- [ ] Links all work
- [ ] Code examples are tested
- [ ] No outdated information
- [ ] Instructions are accurate

#### Structure Quality

- [ ] Has clear title
- [ ] Has overview/introduction
- [ ] Organized with headings
- [ ] Numbered sections where applicable
- [ ] Related docs linked

#### Completeness

- [ ] Includes examples
- [ ] Includes troubleshooting
- [ ] Includes links to related docs
- [ ] Includes "Last Updated" date
- [ ] Includes status indicator

#### Accessibility

- [ ] Clear and concise language
- [ ] No jargon without explanation
- [ ] Code blocks formatted properly
- [ ] Tables clearly formatted
- [ ] Links work and are descriptive

#### Usability

- [ ] Easy to scan (headings, bold text)
- [ ] Easy to find (navigation links)
- [ ] Easy to copy (code snippets)
- [ ] Easy to understand (examples)
- [ ] Easy to act on (step-by-step)

---

## 📊 Documentation Metrics

### Good Documentation Has...

```
Code Examples    ✅ Includes working code snippets
Step-by-Step     ✅ Clear numbered instructions
Troubleshooting  ✅ Common problems & solutions
Related Links    ✅ References to other docs
Updated Dates    ✅ When file was last updated
Status Indicator ✅ Complete/In Progress/Planned
```

### Word Count Guidelines

```
Quick Start      50-100 words   - Get started fast
Overview         200-400 words  - Understand topic
Tutorial         500-1000 words - Learn in depth
Reference        1000+ words    - Complete guide
```

---

## 🔄 Update & Maintenance

### When to Update

- ✅ Code changes related to doc
- ✅ Bug fixes mentioned in doc
- ✅ New features added
- ✅ User feedback received
- ✅ Process improvements made

### How to Update

1. Edit the file
2. Update "Last Updated" date
3. Add note if major change
4. Test instructions still work
5. Commit with message

### Version Notes

```markdown
_Last Updated: December 16, 2025_

**Recent Changes (v1.2):**

- Updated API endpoints
- Added new examples
- Fixed instructions

**Previous Versions:**

- See git history for changes
```

---

## 🚀 New File Workflow

### Step 1: Plan

- [ ] Choose filename
- [ ] Choose directory
- [ ] Outline main sections
- [ ] Gather code examples

### Step 2: Write

- [ ] Follow template above
- [ ] Use clear, concise language
- [ ] Include examples
- [ ] Add troubleshooting
- [ ] Review for accuracy

### Step 3: Review

- [ ] Check spelling/grammar
- [ ] Test all links
- [ ] Test code examples
- [ ] Check formatting
- [ ] Verify completeness

### Step 4: Publish

- [ ] Add to git
- [ ] Add link in parent README
- [ ] Update main navigation
- [ ] Commit with message

---

## 🎨 Visual Elements

### Emoji Use

```markdown
📚 Documentation/Reading
🚀 Getting started/Launch
🔧 Configuration/Setup
📊 Statistics/Data
⚠️ Warning/Important
✅ Complete/Success
📋 Planning/Lists
🔄 In progress
📱 Mobile/Device
🆘 Help/Troubleshooting
```

### Badges/Status

```markdown
✅ Complete
🔄 In Progress
📋 Planned
⚠️ Needs Update
🚀 Ready to Use
🐛 Buggy
```

### Highlighting

```markdown
⭐⭐⭐⭐⭐ Important/High quality
❌ Don't do this
✅ Do this instead
💡 Helpful tip
🔒 Security concern
```

---

## 📚 Documentation Hierarchy

```
Level 1: README.md (Main hub)
  ↓
Level 2: Category README (backend/, frontend/, infrastructure/)
  ↓
Level 3: Topic files (modules/auth.md, DOCKER.md, guides/ADDING_FEATURE.md)
  ↓
Level 4: Code examples in same file
  ↓
Level 5: Linked code (github links to source)
```

Each level references the level below, making navigation clear.

---

## 🔗 Cross-Referencing

### Link to Files

```markdown
[File description](relative/path/to/file.md)
[Backend README](../backend/README.md)
[GETTING_STARTED](../../GETTING_STARTED.md)
```

### Link to Sections

```markdown
[Section reference](file.md#section-heading)
[Setup section](GETTING_STARTED.md#setup)
```

### Link to Code

```markdown
[Code example](../../apps/api/src/main.ts)
[File with line numbers](../../apps/api/src/main.ts#L1-L20)
```

---

## ✍️ Writing Style

### Use This Style

```
✅ "Use the API to fetch data"
✅ "Run: npm install"
✅ "The database stores user records"
✅ "You can configure X by..."
```

### Avoid This Style

```
❌ "One should utilize the API mechanism"
❌ "Execute: npm install"
❌ "The data persistence layer contains entity records"
❌ "Configuration of X is possible via..."
```

### Voice & Tone

- **Helpful** - Assume reader might not know
- **Clear** - Short sentences, active voice
- **Practical** - Include examples, not just theory
- **Professional** - But not stuffy
- **Encouraging** - "You got this!" not "This is hard"

---

## 🎓 Teaching & Learning

### Each Doc Should Help Reader...

1. **Understand** - WHY should they care?
2. **Learn** - WHAT are the key concepts?
3. **Act** - HOW do they do it?
4. **Troubleshoot** - What if it breaks?
5. **Extend** - Where do they go next?

### Structure for Learning

```
[1] WHY? (motivation)
[2] WHAT? (concepts)
[3] HOW? (steps)
[4] EXAMPLE? (code sample)
[5] GOTCHAS? (common issues)
[6] NEXT? (advanced topics)
```

---

## 📞 Getting Help

### Questions About Documentation?

1. Check this file first
2. Look at examples in existing docs
3. Ask in #documentation channel
4. Create an issue if something is unclear

### Want to Contribute?

1. Read this file
2. Follow the template
3. Get peer review
4. Merge when approved

---

## 🏆 Examples of Great Documentation

### Backend Module Doc

- ✅ Explains what the module does
- ✅ Shows key concepts
- ✅ Includes code examples
- ✅ Lists API endpoints
- ✅ Has troubleshooting
- ✅ Links to related docs

### Feature Guide

- ✅ Shows step-by-step workflow
- ✅ Includes real code samples
- ✅ Has effort estimation
- ✅ Includes testing checklist
- ✅ Has git workflow
- ✅ Includes common issues

### Infrastructure Doc

- ✅ Explains why (architecture)
- ✅ Shows how (commands)
- ✅ Includes examples
- ✅ Has checklist
- ✅ Troubleshooting
- ✅ Links to resources

---

## 📈 Success Metrics

### Good Documentation Results In...

- ✅ Less time to onboard new devs
- ✅ Fewer support questions
- ✅ Fewer bugs
- ✅ Better team alignment
- ✅ Easier knowledge transfer
- ✅ Better code quality
- ✅ Faster feature development

### We Know It's Working When...

- "I found the answer in the docs" - Often quoted
- New devs productive in <2 weeks
- Fewer duplicate questions
- Code reviews shorter
- Feature delivery faster
- Team confidence higher

---

## 🎯 Summary

Great documentation is:

- ✅ **Clear:** Easy to understand
- ✅ **Complete:** Has everything needed
- ✅ **Correct:** Accurate and tested
- ✅ **Current:** Updated regularly
- ✅ **Connected:** Linked to related docs
- ✅ **Concise:** No unnecessary words
- ✅ **Consistent:** Same style everywhere

---

_Last Updated: December 16, 2025_  
_Status: ✅ Complete_  
_Maintainer: Documentation Team_  
_Questions? Ask in #documentation_
