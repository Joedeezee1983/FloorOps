# FloorOps

**AI-powered floor operations platform for skilled trades industries.**

Live at [floorops.tech](https://floorops.tech)

---

## What is FloorOps?

FloorOps is a real-time floor operations platform built for casino floors, manufacturing facilities, and skilled trades environments. It replaces paper logs, radio chatter, and spreadsheets with a live digital command center that every tech on shift can access from any tablet or browser.

## Features

### Floor Map
- Interactive 20x12 grid representing the physical floor layout
- Real-time machine status — Green (Online), Red (Offline), Yellow (Warning), Orange (Maintenance)
- Drag-and-drop machine placement for ADMIN users
- Polls every 10 seconds for live updates
- Click any machine to view full detail and status history

### Machine Registry
- Register machines with number, name, serial, model, and grid position
- Full status change history with timestamps
- Status updates reflected instantly on the floor map

### Shift Management
- Start and end shifts with multi-tech support
- AI-powered shift briefings via Claude API
- 10-hour auto-timeout with supervisor override
- PDF shift report export

### Service Alert System
- Log customer service requests with automatic timestamps
- Visual escalation for alerts open longer than threshold
- Response time tracking and analytics

### Parts Ordering *(coming soon)*
- Techs log needed parts during shifts
- Auto-notifies inventory staff via email
- Status tracking: Pending → Ordered → Received
- Parts history for maintenance analytics

### IoT Sensor Integration *(coming soon)*
- Raspberry Pi Zero 2W sensors per machine
- Automatic door open, tilt, power loss, and service light detection
- Zero manual logging required

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Node.js, Prisma ORM, PostgreSQL (AWS RDS)
- **Auth:** NextAuth.js with TECH/SUPERVISOR/ADMIN roles
- **AI:** Anthropic Claude API
- **Email:** Resend
- **Hardware:** Raspberry Pi Zero 2W, GPIO sensors
- **Infrastructure:** AWS EC2, Nginx, PM2, Let's Encrypt SSL

## Roles

| Role | Access |
|------|--------|
| TECH | Dashboard, floor map, shift logging, service alerts |
| SUPERVISOR | All tech access + supervisor view, all active shifts |
| ADMIN | Full access, user management, floor layout editor, force-end shifts |

## Local Development

```bash
git clone https://github.com/Joedeezee1983/FloorOps.git
cd FloorOps
npm install
cp .env.local.example .env.local
# Fill in your environment variables
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
npm run dev
```

## Environment Variables

```plaintext
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
```

## Deployment

Deployed on AWS EC2 (us-west-2) behind Nginx as a PM2 process on port 3002.

```bash
git pull origin main
npx prisma generate
npm run build
pm2 restart floorops
```

## Built By

[JD Tek LLC](https://jay-de.com) — Joseph Dobbs  
[github.com/Joedeezee1983](https://github.com/Joedeezee1983)
