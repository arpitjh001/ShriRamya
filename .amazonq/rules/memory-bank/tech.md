# Technology Stack

## Programming Languages
- **JavaScript (ES6+)**: Primary language for frontend and backend
- **TypeScript**: Used for E2E tests (Playwright)
- **SQL**: MySQL database queries and migrations
- **Shell/Bash**: Deployment and utility scripts

## Frontend Stack

### Core Framework
- **React 19.0.0**: UI library with latest features
- **React Router DOM 7.5.1**: Client-side routing
- **Vite 7.3.1**: Build tool and dev server

### UI Libraries
- **Radix UI**: Accessible component primitives (Dialog, Dropdown, Select, etc.)
- **TailwindCSS 3.4.17**: Utility-first CSS framework
- **Framer Motion 12.34.0**: Animation library
- **Lucide React 0.507.0**: Icon library

### Form Management
- **React Hook Form 7.56.2**: Form state management
- **Zod 3.24.4**: Schema validation
- **@hookform/resolvers 5.0.1**: Validation integration

### Additional Libraries
- **Axios 1.8.4**: HTTP client
- **DayJS 1.11.19**: Date manipulation
- **Recharts 3.6.0**: Data visualization
- **Sonner 2.0.3**: Toast notifications
- **React Quill New 3.8.3**: Rich text editor

## Backend Stack

### Core Framework
- **Node.js 18+**: JavaScript runtime
- **Express 4.18.2**: Web framework
- **Mongoose 8.0.3**: MongoDB ODM

### Security & Authentication
- **JWT (jsonwebtoken 9.0.2)**: Token-based authentication
- **bcryptjs 2.4.3**: Password hashing
- **Helmet 7.1.0**: Security headers
- **CORS 2.8.5**: Cross-origin resource sharing
- **express-rate-limit 8.2.1**: API rate limiting

### Database & Caching
- **MongoDB**: User accounts, orders, sessions
- **MySQL**: Products, categories, blogs, CMS
- **Redis (ioredis 5.10.0)**: Caching and session storage

### Validation & Processing
- **Joi 17.11.0**: Request validation
- **Multer 1.4.5-lts.1**: File upload handling
- **Sharp 0.33.2**: Image processing and optimization
- **UUID 9.0.1**: Unique identifier generation

### Payment Gateways
- **Razorpay 2.9.6**: Indian payment gateway
- **Stripe 14.10.0**: International payment gateway

### Background Jobs
- **Bull 4.12.0**: Redis-based job queue

### API Documentation
- **Swagger JSDoc 6.2.8**: API documentation generation
- **Swagger UI Express 5.0.0**: Interactive API docs

### Utilities
- **Compression 1.7.4**: Response compression
- **Morgan 1.10.0**: HTTP request logger
- **Cookie Parser 1.4.7**: Cookie handling
- **Nodemailer 6.10.1**: Email sending
- **http-status 1.7.3**: HTTP status codes

## Testing Stack

### Backend Testing
- **Jest 30.2.0**: Test framework
- **Supertest 7.2.2**: HTTP assertion library

### Frontend Testing
- **Playwright 1.58.2**: E2E testing framework
- **@playwright/test**: Playwright test runner

## Development Tools

### Build Tools
- **Vite**: Frontend bundler and dev server
- **PostCSS 8.4.49**: CSS processing
- **Autoprefixer 10.4.20**: CSS vendor prefixing

### Code Quality
- **ESLint 9.39.3**: JavaScript linter
- **Nodemon 3.0.2**: Auto-restart dev server

### Package Management
- **npm 9+**: Backend package manager
- **Yarn 1.22.22**: Frontend package manager

## AI Development Tools
- **Antigravity Claude Proxy**: Google Gemini integration for Claude-compatible tools
- **Claude Code CLI**: AI-assisted development

## Database Versions
- **MongoDB**: 5.0+ (Atlas or local)
- **MySQL**: 8.0+ (local or hosted)
- **Redis**: 6.0+ (for caching and queues)

## Development Commands

### Backend (`backend_node/`)
```bash
npm install              # Install dependencies
npm run dev             # Start development server (nodemon)
npm start               # Start production server
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run test:rbac       # Test RBAC functionality
npm run test:api        # Test API endpoints
npm run seed:admin      # Create admin user
npm run seed:blogs      # Seed blog data
npm run migrate         # Run database migrations
```

### Frontend (`frontend/`)
```bash
yarn install            # Install dependencies
yarn dev                # Start development server (Vite)
yarn build              # Build for production
yarn preview            # Preview production build
```

### AI Proxy (`ai-proxy/`)
```bash
npm install             # Install dependencies
npm run dev             # Start proxy server
```

### Testing
```bash
# Backend tests
cd backend_node
npm test

# Frontend E2E tests
cd frontend
npx playwright test
npx playwright test --ui    # Interactive mode
```

## Environment Requirements

### Node.js Version
- **Minimum**: Node.js 18.0.0
- **Recommended**: Node.js 18+ LTS

### Environment Variables (Backend)
```
# Database
MONGODB_URI=mongodb://localhost:27017/shriramya
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=shriramya

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Payment Gateways
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
STRIPE_SECRET_KEY=your-key

# Server
PORT=8000
NODE_ENV=development
```

### Environment Variables (Frontend)
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_RAZORPAY_KEY_ID=your-key
```

## Deployment Platforms
- **Vercel**: Primary deployment platform for frontend and backend
- **MongoDB Atlas**: Hosted MongoDB database
- **MySQL Hosting**: Various options (AWS RDS, DigitalOcean, etc.)
- **Redis Cloud**: Hosted Redis instance

## Browser Support
- **Production**: >0.2%, not dead, not op_mini all
- **Development**: Latest Chrome, Firefox, Safari
