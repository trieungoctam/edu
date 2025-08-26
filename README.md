# HSU Chatbot

Hoa Sen University admission counseling chatbot system built with Node.js, Express.js, and Google Gemini AI.

## Features

- Intelligent conversation flow for admission counseling
- Lead collection and management
- Google Gemini AI integration
- Responsive web interface
- Vietnamese language support

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Google Gemini AI API key

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   - Set your `GEMINI_API_KEY`
   - Configure your `MONGODB_URI`
   - Update other environment variables as needed

## Development

Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## Production

Start the production server:
```bash
npm start
```

## API Endpoints

- `GET /health` - Health check endpoint
- More endpoints will be added as development progresses

## Project Structure

```
├── src/
│   ├── routes/          # API route handlers
│   ├── models/          # Database models
│   ├── services/        # Business logic services
│   ├── middleware/      # Express middleware
│   └── server.js        # Main server file
├── public/              # Static files
├── .env.example         # Environment variables template
└── package.json         # Project configuration
```

## Environment Variables

See `.env.example` for all required environment variables.

## License

MIT