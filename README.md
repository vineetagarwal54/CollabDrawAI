# 🎨 CollabDraw - Real-time Collaborative Whiteboard

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6.2-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-green?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)

A modern, real-time collaborative whiteboard application built with cutting-edge web technologies. Create, share, and collaborate on drawings with multiple users simultaneously in a beautiful, responsive interface.

## 📸 Screenshots

### 🏠 Landing Page
![Landing Page](./screenshots/landing-page.png)
*Modern landing page with glass morphism design*

### 🔐 Authentication  
![Authentication](./screenshots/auth-page.png)
*Sign in/Sign up pages with elegant form design*

### 🎨 Drawing Canvas
![Drawing Canvas](./screenshots/canvas-main.png)
*Real-time collaborative drawing interface*


## ✨ Features

- **🚀 Real-time Collaboration** - Multiple users can draw simultaneously with live updates
- **👥 Live User Count** - See how many people are currently in your room  
- **🏠 Room-based Sessions** - Create or join rooms via room ID or custom slug
- **🎨 Drawing Tools** - Pencil, rectangle, circle, and eraser with customizable properties
- **🖌️ Customizable Brush** - Adjustable brush sizes and color picker
- **📱 Responsive Design** - Works seamlessly across desktop, tablet, and mobile
- **✨ Glass Morphism UI** - Beautiful frosted glass effects and gradient backgrounds
- **🔄 Real-time Updates** - Instant synchronization across all connected users

## 🏗️ Architecture

This project follows a modern monorepo structure with clear separation of concerns:

```
├── apps/
│   ├── excelidraw-frontend/     # Next.js frontend application
│   ├── http-backend/            # Express.js REST API server
│   └── ws-backend/              # WebSocket server for real-time features
├── packages/
│   ├── ui/                      # Shared UI components library
│   ├── db/                      # Database schema and Prisma client
│   ├── common/                  # Shared types and utilities
│   ├── backend-common/          # Backend shared utilities
│   └── typescript-config/       # Shared TypeScript configurations
```

## 🛠️ Technology Stack

**Frontend**: Next.js 15, TypeScript, Tailwind CSS, HTML5 Canvas  
**Backend**: Express.js, WebSocket (ws), JWT Authentication  
**Database**: PostgreSQL, Prisma ORM  
**Tools**: Turborepo, npm workspaces, ESLint

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm package manager  
- PostgreSQL database access

### Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/vineetagarwal54/CollabDrawAI.git
   cd CollabDrawAI
   npm install
   ```

2. **Setup database**
   ```bash
   # In packages/db/.env
   DATABASE_URL="postgresql://username:password@host:port/database"
   
   cd packages/db
   npx prisma generate
   npx prisma db push
   ```

3. **Start development**
   ```bash
   npm run dev
   ```

**Access Points:**
- Frontend: http://localhost:3002
- API: http://localhost:3001  
- WebSocket: ws://localhost:8081

## 📱 How to Use

1. **Sign up/Sign in** - Create account or login with existing credentials
2. **Create/Join Room** - Start new room or join existing one with room ID
3. **Start Drawing** - Use toolbar to select tools, colors, and brush sizes
4. **Collaborate** - See other users drawing in real-time with live user count

### Drawing Tools
- **Pencil** 🖊️: Freehand drawing with adjustable brush sizes
- **Rectangle** ⬛: Draw perfect rectangles and squares  
- **Circle** ⭕: Create circles and ellipses
- **Eraser** 🧹: Remove parts of drawing
- **Color Picker** 🎨: 16 colors + custom color selection

## 🎯 Key Technical Features

### Real-time Synchronization
- WebSocket-based bidirectional communication
- Instant drawing updates across all connected clients
- Live user presence indicators with automatic cleanup
- Robust reconnection handling for network interruptions

### User Management System
- JWT-based secure authentication
- Protected room access control
- Session management with automatic token refresh
- Real-time user count updates with connection status

### High-Performance Drawing Engine
- Optimized HTML5 Canvas API implementation
- Smooth drawing experience with 60fps performance
- Tool state management and persistence
- Responsive canvas that adapts to screen size changes

### Modern UI Components
- Custom button component with 5 variants and 4 sizes
- Glass morphism effects with backdrop blur
- Animated loading states and micro-interactions
- Responsive design patterns for all device sizes

## 🔧 Development

### Available Scripts
```bash
npm run dev              # Start all services in development
npm run build            # Build for production
npm run lint             # Lint all packages  
```

### Project Structure
```
apps/excelidraw-frontend/    # Next.js frontend
apps/http-backend/           # Express.js API
apps/ws-backend/             # WebSocket server
packages/db/                 # Database & Prisma
packages/ui/                 # Shared components
```
npm run build            # Build all packages for production
npm run lint             # Lint all packages with ESLint
npm run format           # Format code with Prettier

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run database migrations


## 🔒 Security Measures

### Authentication & Authorization
- JWT tokens with expiration
- Password validation (frontend and backend)
- Protected API routes
- Session management

### Data Protection
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection with proper escaping
- CORS configuration for API security

### WebSocket Security
- Token-based authentication for WebSocket connections
- Message validation and sanitization
- Rate limiting (planned for future releases)
- Connection cleanup and user tracking

## 📄 API Documentation

### Authentication
```typescript
POST /signup - Create account
POST /signin - Login user
```

### Rooms  
```typescript
POST /room - Create new room (auth required)
GET /room/:slug - Get room by slug
GET /room/id/:id - Get room by ID
```

### WebSocket Events
```typescript
// Join/leave room
{ type: "join_room", roomId: string }
{ type: "leave_room", roomId: string }

// Drawing data
{ type: "drawing", roomId: string, data: DrawingData }

// User count updates  
{ type: "user_count", roomId: string, count: number }
```

## 📞 Contact & Support

- **Email**: vineeta.garwal54@gmail.com