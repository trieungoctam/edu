lsof -ti tcp:3000 | xargs -r kill -9
LOG_DIR=. IN_MEMORY_STORAGE=true npm start