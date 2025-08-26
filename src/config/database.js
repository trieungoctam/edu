const mongoose = require('mongoose');

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      // In-memory storage mode: skip MongoDB entirely
      if (process.env.IN_MEMORY_STORAGE === 'true') {
        this.isConnected = true;
        console.log('In-memory storage mode enabled (skipping MongoDB connection)');
        return;
      }

      if (this.isConnected) {
        console.log('Database already connected');
        return;
      }

      // Build connection options to support optional authentication via env vars
      const defaultUri = 'mongodb://localhost:27017/hsu-chatbot';
      const envUri = process.env.MONGODB_URI;

      // If separate credentials are provided, construct URI accordingly
      const mongoHost = process.env.MONGODB_HOST || 'localhost';
      const mongoPort = process.env.MONGODB_PORT || '27017';
      const mongoDb   = process.env.MONGODB_DB   || 'hsu-chatbot';
      const mongoUser = process.env.MONGODB_USER;
      const mongoPass = process.env.MONGODB_PASSWORD;

      let mongoUri = envUri;
      if (!mongoUri) {
        if (mongoUser && mongoPass) {
          mongoUri = `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPass)}@${mongoHost}:${mongoPort}/${mongoDb}`;
        } else {
          mongoUri = defaultUri;
        }
      }

      // If an env URI exists but lacks credentials, and separate creds are provided, enrich the URI
      try {
        if (envUri && (!envUri.includes('@')) && mongoUser && mongoPass) {
          const url = new URL(envUri);
          url.username = encodeURIComponent(mongoUser);
          url.password = encodeURIComponent(mongoPass);
          // Ensure db name present
          if (!url.pathname || url.pathname === '/') {
            url.pathname = `/${mongoDb}`;
          }
          // Ensure authSource defaults to the db
          const searchParams = url.searchParams;
          if (!searchParams.has('authSource')) {
            searchParams.set('authSource', process.env.MONGODB_AUTHSOURCE || url.pathname.replace('/', '') || 'hsu-chatbot');
          }
          mongoUri = url.toString();
        }
      } catch (e) {
        // If URL parsing fails, continue with computed mongoUri
      }

      await mongoose.connect(mongoUri, {
        authSource: process.env.MONGODB_AUTHSOURCE || undefined,
        // Use modern parser and topology by default (no-op for recent mongoose but harmless)
        // bufferCommands false to surface errors immediately
        bufferCommands: false
      });

      this.isConnected = true;
      console.log('MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (!this.isConnected) {
        console.log('Database not connected');
        return;
      }

      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }
}

module.exports = new DatabaseConnection();