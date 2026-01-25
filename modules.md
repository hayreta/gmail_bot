# Gmail Bot - Complete Modules Documentation

## Project Dependencies

### Core Dependencies (package.json)

1. **telegraf** (v4.16.3)
   - Telegram bot API framework
   - Handles bot commands, actions, callbacks, and middleware
   - Provides Markup for inline keyboards and buttons
   - Provides session management for user state tracking

2. **dotenv** (v17.2.3)
   - Environment variable management
   - Loads BOT_TOKEN and other configuration from .env file
   - Ensures secure credential storage (never commit .env to git)

3. **lowdb** (v5.1.0)
   - Lightweight JSON database
   - Used for persistent user data storage
   - Alternative to in-memory database for production

### Node.js Built-in Modules (No Installation Required)

All Node.js built-in modules are available:
- `path` - File path utilities
- `fs` - File system operations
- `http/https` - HTTP requests
- `util` - Utility functions
- `events` - Event emitter
- `stream` - Data streaming
- `crypto` - Cryptographic operations
- `os` - Operating system info
- `process` - Process control
- `buffer` - Binary data handling

## Application Structure

### Main Components

#### 1. **Bot Configuration**
- BOT_TOKEN: Telegram API authentication
- ADMIN_ID: Administrator user ID (5522724001)
- BOT_USERNAME: Bot's Telegram handle (@createUnlimitedGmail_Bot)

#### 2. **Database Module**
- In-memory object-based database
- Structure: `db[userId] = { points, referrals, registered, joined, name, username }`
- `getDB()` function: Creates/retrieves user records

#### 3. **Channels Module**
- List of required channels: @Hayre37, @Digital_Claim, @BIgsew_community, @hayrefx
- Force join verification middleware
- Channel membership checking via Telegram API

#### 4. **Keyboard/UI Module**
- `getMenu()` - User main menu keyboard
- `adminKeyboard` - Admin control panel keyboard
- `cancelKeyboard` - Cancellation button
- Markup.inlineKeyboard for callback buttons
- Markup.button.url() for external links
- Markup.button.callback() for action handlers

#### 5. **Middleware**
- `session()` - User session management
- `checkJoin()` - Force join verification
- Error handling for crashed/disconnected bots

#### 6. **Action Handlers (Callbacks)**
- User actions: register, account, referrals, help
- Admin actions: stats, broadcast, add_points, rem_points, list_users
- Verification: verify_and_delete
- Navigation: back_menu, cancel_op

#### 7. **Command Handlers**
- `/start` - Bot initialization
- `/help` - Help information
- `/admin` - Admin panel access

#### 8. **Message Handlers**
- Text message processing for form inputs
- Registration form data capture
- Points/referral management

#### 9. **Error Handling**
- Global error handlers for unhandled rejections
- Graceful shutdown on SIGTERM/SIGINT (Railway compatibility)
- Try-catch blocks for async operations
- Silent error suppression for failed message copies

## Module Dependencies Map

```
telegraf (main framework)
├── Telegraf (bot instance)
├── Markup (keyboard generation)
├── session (user state management)
└── button helpers (url, callback)

dotenv (configuration)
└── BOT_TOKEN loading

lowdb (optional database)
└── Persistent storage layer
```

## Environment Variables Required

- `BOT_TOKEN` - Telegram Bot API token (required for production)

## Installation Instructions

```bash
npm install
```

This installs all dependencies from package.json:
- telegraf@4.16.3
- dotenv@17.2.3
- lowdb@5.1.0

## Running the Bot

```bash
# Development
npm run dev

# Production (Railway)
npm start
```

## Production Checklist

- [x] Error handling for crashes
- [x] Graceful shutdown handlers
- [x] Environment variable support
- [x] Session management
- [x] Database structure ready
- [x] All keyboards functional with callbacks
- [x] Admin panel secure with ID verification
- [x] Force join verification system
- [x] Message logging capability

## Optional Enhancements

For future scaling, consider:
- PostgreSQL with proper ORM (Prisma, Sequelize)
- Redis for session caching
- Axios/node-fetch for external API calls
- Express.js for webhook mode instead of polling
- Joi/Yup for data validation
