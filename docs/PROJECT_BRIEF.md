# Project Brief: ape-parel MVP

## 1. Executive Summary
**ape-parel** is an independent creator-powered apparel design and production marketplace connecting:
1. **Designers / Creators:** Upload graphic assets, manage storefronts, establish licensing terms and prices, and track royalties.
2. **Customers / Customizers:** Configure T-shirts, combine artwork from multiple creators, preview designs in photorealistic 2D and real 3D, calculate live costs, and submit orders.
3. **Suppliers / Manufacturers:** Publish blank-garment catalogs, printing services, production requirements, quotations, and manufacturing capabilities.

## 2. Core Business Loop
> **Designer publishes artwork** ➔ **Customer selects multiple artworks** ➔ **Customer configures garment** ➔ **System calculates garment, printing, artwork-license, and shipping costs** ➔ **Customer reviews design** ➔ **Order & royalty records created atomically** ➔ **Supplier receives production specifications** ➔ **Royalty obligations become traceable & settleable**.

## 3. Brand Identity & Design Tokens
- **Brand Concept:** Expressive streetwear graphic apparel, modular customization, and creator-owned intellectual property.
- **Tokens:**
  - Ink: `#131718`
  - Warm Beige: `#DABA98`
  - Paper: `#F5F0E8`
  - White: `#FFFFFF`
  - Muted Gray: `#777777`
  - Border: `#DED7CE`

## 4. Technical Architecture (Modular Monolith)
- **Framework:** Next.js 14+ (App Router, React 18, TypeScript)
- **Styling:** Tailwind CSS, Lucide React
- **3D Preview:** Three.js with OBJLoader (`public/models/tshirt.obj`)
- **Database & ORM:** Prisma ORM (SQLite dev / PostgreSQL prod)
- **Validation:** Zod
- **Testing:** Vitest

## 5. Pricing Benchmark Specification
- Garment Blank: THB 150
- DTG Printing: THB 80
- Packaging: THB 15
- Shipping: THB 40
- Artwork Licenses: Artwork A (฿40) + Artwork B (฿60) + Artwork C (฿25) = THB 125
- **Pre-fee, pre-tax total for 1 unit: THB 410**

## 6. Factory Team Roles
- **Technical Lead:** Architecture & full-stack development.
- **Code Reviewer:** Quality gates, security, domain constraints.
- **QA Engineer:** Automated tests, acceptance criteria verification.
