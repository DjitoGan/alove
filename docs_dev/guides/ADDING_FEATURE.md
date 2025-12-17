# 📝 Adding a New Feature - Complete Guide

**Step-by-step instructions for implementing new features in ALOVE.**

---

## 🎯 Feature Development Workflow

### Phase 1: Planning & Design

```
1. Define requirements
2. Design database schema (if needed)
3. Design API endpoints
4. Plan UI/UX
5. Create task list
6. Estimate effort
```

### Phase 2: Database Changes

```
1. Modify prisma/schema.prisma
2. Create migration
3. Review generated SQL
4. Run in development
5. Seed test data
```

### Phase 3: Backend Implementation

```
1. Create service methods
2. Add controller endpoints
3. Add DTO (Data Transfer Objects)
4. Add validation
5. Add error handling
6. Write tests
```

### Phase 4: Frontend Implementation

```
1. Create API service
2. Create page/component
3. Add state management
4. Add error handling
5. Style with CSS/Tailwind
6. Test end-to-end
```

### Phase 5: Testing & Deployment

```
1. Unit tests (backend)
2. Component tests (frontend)
3. E2E tests (full flow)
4. Manual testing
5. Code review
6. Merge to main
```

---

## 📋 Database Migration Example

### Step 1: Update Schema (apps/api/prisma/schema.prisma)

```prisma
// [1] FEATURE: Add warranty support
model Part {
  id        Int     @id @default(autoincrement())
  // ... existing fields ...

  // [2] NEW WARRANTY FIELDS
  // [2a] Warranty period in months
  warrantyMonths Int? @default(12)

  // [2b] Warranty type
  warrantyType  String? // "MANUFACTURER", "EXTENDED", "NONE"

  // [2c] Relationship to warranty records
  warranties    Warranty[] @relation("PartWarranties")

  updatedAt     DateTime @updatedAt

  @@map("parts")
}

// [3] NEW WARRANTY MODEL
// [3a] Tracks warranty claims per part
model Warranty {
  id              Int      @id @default(autoincrement())

  // [3a.1] Foreign key to part
  partId          Int
  part            Part     @relation("PartWarranties", fields: [partId], references: [id])

  // [3a.2] Warranty details
  claimDate       DateTime
  expiryDate      DateTime
  status          String   @default("ACTIVE") // ACTIVE, EXPIRED, CLAIMED

  // [3a.3] Claim information
  claimDescription String?
  claimDate       DateTime?
  claimApproved   Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("warranties")
}
```

### Step 2: Create Migration

```bash
cd /Users/amouzou/projects/alove
docker compose exec api npx prisma migrate dev --name add_warranty_support

# Answer prompts:
# ? Enter a name for this migration › add_warranty_support
# ✔ Prisma Migrate created the following migration:
# migrations/20251216_add_warranty_support/migration.sql
```

### Step 3: Review Migration (auto-generated)

```sql
-- AlterTable
ALTER TABLE "parts" ADD COLUMN "warrantyMonths" INTEGER DEFAULT 12;
ALTER TABLE "parts" ADD COLUMN "warrantyType" TEXT;

-- CreateTable
CREATE TABLE "warranties" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "partId" INTEGER NOT NULL,
  "claimDate" TIMESTAMP(3) NOT NULL,
  "expiryDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "claimDescription" TEXT,
  "claimApproved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "warranties_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id")
);

CREATE INDEX "warranties_partId_idx" ON "warranties"("partId");
```

### Step 4: Test Migration

```bash
# Migration auto-applied after migrate dev
# Check it worked
docker compose exec api npx prisma studio

# Should see:
# - Part table with warrantyMonths, warrantyType columns
# - Warranty table with all new fields
```

---

## 🔧 Backend Implementation Example

### Step 1: Create Service Methods (apps/api/src/modules/warranties/warranty.service.ts)

```typescript
// [1] WARRANTY SERVICE - Handles warranty business logic
// [1a] Service is responsible for all warranty operations
// [1b] Does NOT handle HTTP or validation (controller's job)
// [1c] WHY: Separation of concerns = easier to test + maintain

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WarrantyService {
  constructor(private prisma: PrismaService) {}

  // [2] CREATE WARRANTY
  // [2a] Validates warranty doesn't already exist for part
  // [2b] Sets expiry date based on warranty months
  // [2c] Returns created warranty record
  async createWarranty(partId: number, months: number) {
    // [2.1] Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);

    // [2.2] Create warranty record
    return this.prisma.warranty.create({
      data: {
        partId,
        claimDate: new Date(),
        expiryDate,
        status: "ACTIVE",
      },
    });
  }

  // [3] GET WARRANTY FOR PART
  // [3a] Returns warranty details
  // [3b] Handles not found error
  async getWarrantyByPartId(partId: number) {
    return this.prisma.warranty.findFirst({
      where: { partId },
      orderBy: { createdAt: "desc" },
    });
  }

  // [4] CHECK WARRANTY STATUS
  // [4a] Returns true if warranty still valid (not expired)
  // [4b] Used for warranty claim eligibility
  async isWarrantyValid(partId: number): Promise<boolean> {
    const warranty = await this.getWarrantyByPartId(partId);
    if (!warranty) return false;

    return warranty.status === "ACTIVE" && warranty.expiryDate > new Date();
  }

  // [5] CLAIM WARRANTY
  // [5a] Submits warranty claim
  // [5b] Sets claim date and description
  // [5c] Validation: must be within warranty period
  async claimWarranty(partId: number, description: string) {
    const warranty = await this.getWarrantyByPartId(partId);

    if (!warranty || warranty.expiryDate < new Date()) {
      throw new Error("Warranty expired");
    }

    return this.prisma.warranty.update({
      where: { id: warranty.id },
      data: {
        claimDescription: description,
        claimDate: new Date(),
        status: "CLAIMED",
      },
    });
  }
}
```

### Step 2: Create Controller Endpoints (apps/api/src/modules/warranties/warranty.controller.ts)

```typescript
// [1] WARRANTY CONTROLLER - Handles HTTP requests
// [1a] Validates input using DTOs
// [1b] Catches errors and returns proper HTTP status codes
// [1c] WHY: Separation from business logic = easier testing

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { WarrantyService } from "./warranty.service";

@Controller("v1/warranties")
export class WarrantyController {
  constructor(private warrantyService: WarrantyService) {}

  // [2] GET WARRANTY FOR PART
  // [2a] Endpoint: GET /v1/warranties/part/:partId
  // [2b] Returns: Warranty object with status + expiry date
  // [2c] Errors: 404 if part has no warranty
  @Get("part/:partId")
  async getWarranty(@Param("partId") partId: string) {
    try {
      const warranty = await this.warrantyService.getWarrantyByPartId(
        parseInt(partId)
      );
      if (!warranty) {
        throw new NotFoundException("Warranty not found");
      }
      return warranty;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // [3] CLAIM WARRANTY
  // [3a] Endpoint: POST /v1/warranties/:partId/claim
  // [3b] Request body: { description: string }
  // [3c] Validation: Description must be provided
  @Post(":partId/claim")
  async claimWarranty(
    @Param("partId") partId: string,
    @Body() dto: { description: string }
  ) {
    if (!dto.description || dto.description.trim().length === 0) {
      throw new BadRequestException("Description is required");
    }

    try {
      return await this.warrantyService.claimWarranty(
        parseInt(partId),
        dto.description
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // [4] CHECK WARRANTY VALIDITY
  // [4a] Endpoint: GET /v1/warranties/:partId/valid
  // [4b] Returns: { valid: boolean }
  // [4c] Used by: Frontend to show warranty badge
  @Get(":partId/valid")
  async isValid(@Param("partId") partId: string) {
    const valid = await this.warrantyService.isWarrantyValid(parseInt(partId));
    return { valid };
  }
}
```

### Step 3: Create Data Transfer Objects (DTOs)

```typescript
// [1] DTO - Data validation and API documentation
// [1a] Ensures input data matches expected format
// [1b] Provides API documentation in Swagger
// [1c] WHY: Prevents bad data + documents API contract

import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class ClaimWarrantyDto {
  // [2] CLAIM DESCRIPTION
  // [2a] String from 10 to 500 characters
  // [2b] Required - cannot be empty
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;
}
```

### Step 4: Module Setup (apps/api/src/modules/warranties/warranty.module.ts)

```typescript
// [1] WARRANTY MODULE - Dependency injection setup
// [1a] Imports services + controllers
// [1b] Registers in main AppModule
// [1c] WHY: NestJS modular pattern for organization

import { Module } from "@nestjs/common";
import { WarrantyService } from "./warranty.service";
import { WarrantyController } from "./warranty.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [WarrantyService],
  controllers: [WarrantyController],
  exports: [WarrantyService],
})
export class WarrantyModule {}
```

### Step 5: Register in Main App Module (apps/api/src/app.module.ts)

```typescript
import { WarrantyModule } from "./modules/warranties/warranty.module";

@Module({
  imports: [
    // ... existing modules ...
    WarrantyModule, // [1] NEW MODULE
  ],
})
export class AppModule {}
```

### Step 6: Write Tests (apps/api/src/modules/warranties/warranty.service.spec.ts)

```typescript
// [1] UNIT TESTS - Test service methods in isolation
// [1a] Each test: arrange → act → assert
// [1b] Mock dependencies (PrismaService)
// [1c] WHY: Ensures service logic works correctly

import { Test, TestingModule } from "@nestjs/testing";
import { WarrantyService } from "./warranty.service";
import { PrismaService } from "../prisma/prisma.service";

describe("WarrantyService", () => {
  let service: WarrantyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyService,
        {
          provide: PrismaService,
          useValue: {
            warranty: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WarrantyService>(WarrantyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // [2] TEST: Creating warranty
  // [2a] ARRANGE: Mock data
  // [2b] ACT: Call service method
  // [2c] ASSERT: Verify result and database call
  it("should create warranty with correct expiry date", async () => {
    const partId = 1;
    const months = 12;

    const mockWarranty = {
      id: 1,
      partId,
      claimDate: new Date(),
      expiryDate: new Date(),
      status: "ACTIVE",
    };

    (prisma.warranty.create as jest.Mock).mockResolvedValue(mockWarranty);

    const result = await service.createWarranty(partId, months);

    expect(result).toEqual(mockWarranty);
    expect(prisma.warranty.create).toHaveBeenCalled();
  });

  // [3] TEST: Checking warranty validity
  it("should return true if warranty is valid", async () => {
    const partId = 1;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const mockWarranty = {
      id: 1,
      partId,
      expiryDate: futureDate,
      status: "ACTIVE",
    };

    (prisma.warranty.findFirst as jest.Mock).mockResolvedValue(mockWarranty);

    const result = await service.isWarrantyValid(partId);

    expect(result).toBe(true);
  });
});
```

---

## 🎨 Frontend Implementation Example

### Step 1: Create API Service (apps/web/src/services/warrantyService.ts)

```typescript
// [1] WARRANTY API SERVICE - Handles all warranty API calls
// [1a] Fetches warranty data from backend
// [1b] Handles errors and token refresh
// [1c] WHY: Centralize API logic = easier to modify endpoints

// [2] GET WARRANTY STATUS
// [2a] Fetches warranty for a part
// [2b] Returns: { valid, expiryDate, status }
export async function getWarrantyStatus(partId: number) {
  const token = localStorage.getItem("accessToken");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/warranties/part/${partId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch warranty");
  }

  return response.json();
}

// [3] CLAIM WARRANTY
// [3a] Submits warranty claim
// [3b] Request: { description: string }
// [3c] Returns: Updated warranty record
export async function claimWarranty(partId: number, description: string) {
  const token = localStorage.getItem("accessToken");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/warranties/${partId}/claim`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to claim warranty");
  }

  return response.json();
}

// [4] CHECK WARRANTY VALIDITY
// [4a] Quick check if warranty is still valid
// [4b] Used to show warranty badge on product cards
export async function checkWarrantyValid(partId: number) {
  const token = localStorage.getItem("accessToken");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/warranties/${partId}/valid`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    return { valid: false };
  }

  return response.json();
}
```

### Step 2: Create Component (apps/web/src/components/WarrantyBadge.tsx)

```typescript
// [1] WARRANTY BADGE COMPONENT - Shows warranty status on product
// [1a] Displays warranty expiry date and status
// [1b] Shows loading state while fetching
// [1c] WHY: Reusable component = use on catalog + product details

import { useState, useEffect } from "react";
import { checkWarrantyValid } from "../services/warrantyService";

export function WarrantyBadge({ partId }: { partId: number }) {
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // [2] FETCH WARRANTY STATUS ON MOUNT
  // [2a] Runs once when component appears
  // [2b] Sets valid state
  // [2c] Handles error silently (warranty not required)
  useEffect(() => {
    checkWarrantyValid(partId)
      .then((result) => setValid(result.valid))
      .catch(() => setValid(false))
      .finally(() => setLoading(false));
  }, [partId]);

  // [3] RENDER LOADING STATE
  if (loading) {
    return <div className="badge badge-loading">...</div>;
  }

  // [4] RENDER WARRANTY STATUS
  // [4a] Green badge if valid warranty
  // [4b] Gray badge if no warranty
  // [4c] Tooltip shows warranty details
  return (
    <>
      {valid ? (
        <div className="badge badge-success">✓ Warranty Active</div>
      ) : (
        <div className="badge badge-outline">No Warranty</div>
      )}
    </>
  );
}
```

### Step 3: Add to Product Page (apps/web/src/pages/part-details.tsx)

```typescript
import { WarrantyBadge } from "../components/WarrantyBadge";

export default function PartDetailsPage() {
  // ... existing code ...

  return (
    <div className="part-details">
      {/* [1] PRODUCT HEADER */}
      <h1>{part.name}</h1>

      {/* [2] NEW WARRANTY BADGE */}
      {/* [2a] Shows warranty status */}
      {/* [2b] Uses WarrantyBadge component */}
      <WarrantyBadge partId={part.id} />

      {/* ... rest of page ... */}
    </div>
  );
}
```

---

## ✅ Testing Checklist

### Backend Testing

- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] Error handling covers edge cases
- [ ] Input validation works
- [ ] Database migration works
- [ ] No console errors in docker logs

### Frontend Testing

- [ ] Component renders without errors
- [ ] API calls work correctly
- [ ] Loading states display
- [ ] Error states handled
- [ ] Responsive design works
- [ ] Works in Chrome, Firefox, Safari
- [ ] No console errors in browser

### End-to-End Testing

- [ ] User can complete full workflow
- [ ] Data persists after refresh
- [ ] Works on mobile
- [ ] Works with slow network (throttle in DevTools)
- [ ] Works offline gracefully

---

## 🔄 Git Workflow

### Create Feature Branch

```bash
# [1] Update main branch
git pull origin main

# [2] Create feature branch (semantic naming)
# Format: feature/thing-you-add or fix/thing-you-fix
git checkout -b feature/warranty-support

# [3] Make changes locally
npm run dev

# [4] Test everything
npm test
```

### Commit Changes

```bash
# [1] Stage all changes
git add .

# [2] Commit with descriptive message
# Format: [TYPE] Short description
# Examples:
# - [FEATURE] Add warranty claims
# - [FIX] Fix warranty expiry calculation
# - [DOCS] Update warranty docs
# - [TEST] Add warranty service tests
git commit -m "[FEATURE] Add warranty claims support"

# [3] Push to GitHub
git push origin feature/warranty-support
```

### Create Pull Request

```
Title: [FEATURE] Add warranty claims support

Description:
- Adds warranty model to database
- Creates warranty controller + service
- Adds warranty badge to product pages
- Includes unit + integration tests

Testing:
- [x] Backend tests pass
- [x] Frontend tests pass
- [x] End-to-end flow works
- [x] No console errors
```

### Merge Steps

1. Wait for code review approval
2. Ensure CI/CD passes
3. Merge to main branch
4. Delete feature branch
5. Verify in production

---

## 📊 Effort Estimation

| Task                | Time         | Notes                         |
| ------------------- | ------------ | ----------------------------- |
| Database design     | 30 min       | Plan schema + relationships   |
| Migration + testing | 30 min       | Create + test migration       |
| Backend service     | 1-2 hrs      | Methods + business logic      |
| Backend controller  | 1 hr         | Endpoints + validation        |
| Backend tests       | 1-2 hrs      | Unit + integration tests      |
| Frontend component  | 1-2 hrs      | UI + state management         |
| Frontend tests      | 1 hr         | Component + integration tests |
| Documentation       | 30 min       | Comments + examples           |
| Code review fixes   | 30 min       | Average revisions             |
| **Total**           | **7-10 hrs** | One person, one day           |

---

## 🆘 Common Issues

### Migration Failed

```bash
# Issue: Migration syntax error
# Solution: Check generated migration.sql, fix manually

docker compose exec api npx prisma migrate status
# Shows which migrations passed/failed

# If stuck:
docker compose down -v
docker compose up -d
docker compose exec api npx prisma migrate dev
```

### API Endpoint Returns 404

```bash
# Issue: Endpoint not registered
# Solution: Check module imports

# 1. Verify controller imported in module
// warranty.module.ts
@Module({
  controllers: [WarrantyController],  // ← Must be here
})

// 2. Verify module imported in AppModule
// app.module.ts
@Module({
  imports: [WarrantyModule],  // ← Must be here
})

// 3. Restart API
docker compose restart api
```

### Frontend Can't Call API

```bash
// Issue: CORS error
// Solution: Check API URL

// apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/v1  // ← Correct URL?

// Check API running:
curl http://localhost:3001/v1/health
// Should return: {"status":"ok"}
```

---

## 📚 Next Steps

1. **Review this guide** - Familiarize yourself with the process
2. **Pick a small feature** - Something that takes 2-3 hours
3. **Follow the workflow** - Database → Backend → Frontend → Test
4. **Ask questions** - Don't guess, ask in #development
5. **Create PR** - Link to this guide in PR description
6. **Get feedback** - Iterate based on code review
7. **Celebrate** - You've shipped a feature! 🎉

---

_Last Updated: December 16, 2025_  
_Status: ✅ Complete & Ready to Use_  
_Questions? Check the troubleshooting section or ask in #development_
