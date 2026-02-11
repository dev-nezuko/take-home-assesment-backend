# User Data API with Advanced Caching - Backend

Express.js + TypeScript API with LRU caching, rate limiting, and asynchronous processing.

## Architecture Choices & Trade-offs

**Custom LRU Cache vs Library**: Custom implementation was chosen because it provides full control over TTL and eviction logic, demonstrates understanding of data structures, requires no external dependencies, and is easier to customize for specific requirements.

**Array Queue vs Bull/Redis**: Simple array-based queue was chosen because it requires no Redis dependency, is sufficient for the requirements, simplifies deployment, and demonstrates async processing concepts.

**Rate Limiting Strategy**: Token bucket algorithm was implemented because it supports burst traffic (5 requests in 10 seconds), provides smooth rate limiting (10 requests per minute), uses per-IP tracking for better fairness, and is an industry-standard approach.

**Request Deduplication**: Implemented to handle concurrent requests efficiently by preventing duplicate database calls for the same user ID. All concurrent requests share the same promise and receive the cached result.

## Project Structure

```
src/
├── routes/                    # Route definitions
│   ├── user.route.ts         # User route definitions
│   └── cache.route.ts        # Cache management routes
├── controllers/              # Request handlers
│   ├── user.controller.ts    # User controller handlers
│   └── cache.controller.ts   # Cache controller handlers
├── middleware/               # Express middleware
│   └── rateLimiter.ts        # Token bucket rate limiting
├── dal/                      # Data Access Layer (internal services)
│   ├── cache.dal.ts         # LRU cache implementation
│   ├── queue.dal.ts         # Async processing queue
│   └── requestDeduplicator.dal.ts  # Concurrent request handler
├── data/                     # Mock data
│   └── mockUsers.ts          # Mock user data
├── types/                    # TypeScript type definitions
│   └── index.ts              # Shared types
└── server.ts                 # Express server setup
```

## Naming Convention

- **Routes**: `*.route.ts` - Express route definitions
- **Controllers**: `*.controller.ts` - Request handlers and business logic
- **DAL**: `*.dal.ts` - Data Access Layer (internal services like cache, queue)

## Features

- ✅ Express.js server with TypeScript and appropriate middleware
- ✅ Advanced in-memory LRU cache with 60-second TTL
- ✅ Cache statistics (hits, misses, size, average response time)
- ✅ Background task to automatically clear stale cache entries
- ✅ GET /users/:id endpoint with caching and 200ms DB simulation
- ✅ Performance optimization: cache update only if not cached, concurrent request handling
- ✅ Sophisticated rate limiting: 10 req/min with burst capacity of 5 in 10-second window
- ✅ Asynchronous processing queue for non-blocking requests
- ✅ DELETE /cache endpoint for manual cache management
- ✅ GET /cache-status endpoint for cache statistics
- ✅ POST /users endpoint for user creation

## Quick Start

### Prerequisites
- Node.js >= 18
- pnpm (install via `npm install -g pnpm`)

### Installation & Running

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The API will be available at `http://localhost:3001`.

## API Endpoints

### User Endpoints

- `GET /users/:id` - Retrieve user by ID (with caching, 200ms delay if cache miss)
- `POST /users` - Create a new user

### Cache Management

- `GET /cache/status` - Get cache statistics (hits, misses, size, average response time)
- `DELETE /cache` - Clear entire cache

### Health Check

- `GET /health` - Server health status

## Testing

Use Postman or any HTTP client to test the endpoints:

1. **Test caching**: Make multiple requests to `GET /users/1` and observe response times (first request ~200ms, subsequent requests instant)
2. **Test rate limiting**: Make more than 10 requests per minute to see 429 responses
3. **Test concurrent requests**: Make multiple simultaneous requests to the same user ID - only one DB call should occur
4. **Test cache status**: Check `GET /cache/status` for statistics
5. **Test cache clearing**: Use `DELETE /cache` to clear cache and verify statistics reset
