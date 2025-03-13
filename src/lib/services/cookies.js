// src/app/lib/services/cookies.js

import { serialize, parse } from 'cookie';

// Function to get a secure cookie from the request
export function getSecureCookie(req, name) {
    const cookies = parse(req.headers?.cookie || '');
    return cookies[name] || null;
  }

// Function to set a secure cookie in the response
export function setSecureCookie(res, name, value, options = {}) {
  const stringValue = typeof value === 'object' ? `j:${JSON.stringify(value)}` : String(value);

  const serializedCookie = serialize(name, stringValue, {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    ...options,
  });

  res.setHeader('Set-Cookie', serializedCookie);
}
