# Project Brief: ape-parel

## 1. Executive Summary
**ape-parel** is a creator-powered apparel design and production marketplace connecting three principal parties:
1. **Designers / Creators:** Publish graphic assets, manage storefronts, establish licensing terms and royalties.
2. **Customers / Customizers:** Configure streetwear T-shirts, combine artwork from multiple creators, preview designs in photorealistic 2D and real 3D, calculate live pricing, and place orders.
3. **Suppliers / Manufacturers:** Publish blank-garment catalogs, print service capabilities, receive production specifications, and fulfill orders.

## 2. Core Business Loop
> **Designer publishes artwork** ➔ **Customer selects & positions artwork** ➔ **Customer configures garment (Fit, Color, Size)** ➔ **System calculates live costs (Garment + Print + Artwork Licenses + Shipping)** ➔ **Order created & Supplier receives production spec** ➔ **Royalty obligations recorded in auditable ledger**.

## 3. Scope & Key Deliverables

### In-Scope
- **Creator Marketplace:** Discover artists, view portfolios, browse categorized graphic artworks, and license assets.
- **Design Studio (2D & 3D):**
  - Photorealistic 2D Viewport with authentic transparent garment mockups (Ink Black, Optic White, Paper Beige, Warm Kraft).
  - Three.js 3D Viewport with genuine 3D T-shirt geometry (`tshirt.obj`), 360° orbit controls, and dynamic texture compositing.
  - Multi-surface support: FRONT, BACK, and SIDE.
- **Dynamic Cost Engine:** Server-validated pricing breakdown for garment blanks, DTG printing surfaces, creator licenses, and shipping.
- **Order & Production Pipeline:** Production spec generator with high-res asset coordinates, supplier dashboard, and status transitions (`PENDING`, `IN_PRODUCTION`, `COMPLETED`).
- **Royalty Ledger & Settlement:** Immutable ledger recording royalty accruals per line item, creator payout statements, and admin settlement triggers.
- **Role-Based Access Control:** Customer, Creator, Supplier, and Admin roles.

### Non-Goals (MVP Exclusions)
- Real payment gateway API integration (use documented development mock payment mode).
- Physical shipping carrier API integrations (use flat-rate tier calculation).
- Multi-region distributed microservices (modular monolith architecture required).

## 4. Technical Stack
- **Framework:** Next.js 14+ (App Router, React 18, TypeScript)
- **Styling:** Tailwind CSS, Lucide React Icons
- **3D Engine:** Three.js with OBJLoader
- **Database & ORM:** Prisma ORM (SQLite for zero-config dev, PostgreSQL compatible)
- **Validation:** Zod
- **Testing:** Vitest

## 5. Agent Team Architecture (Agents Factory)
- **Technical Lead:** Architecture design, full-stack implementation, database schema, and test generation.
- **Code Reviewer:** Quality gate validation, architectural integrity, and security checks.
- **QA Engineer:** End-to-end verification, test execution, regression checks, and performance validation.
