import winston from 'winston';
import { env } from './env';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const developmentFormat = combine(colorize(), timestamp({ format: 'HH:mm:ss' }), simple());

const productionFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'securebank-api' },
  transports: [
    new winston.transports.Console(),
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});
