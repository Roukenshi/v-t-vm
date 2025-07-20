import jwt from 'jsonwebtoken';

// JWT Secret - In production, this should be from environment variables
const JWT_SECRET = 'your-super-secure-jwt-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  emailVerified: boolean;
  iat?: number;
  exp?: number;
}

export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

export const getTokenFromStorage = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const setTokenInStorage = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

export const removeTokenFromStorage = (): void => {
  localStorage.removeItem('auth_token');
};

export const refreshTokenIfNeeded = async (token: string): Promise<string | null> => {
  const decoded = verifyToken(token);
  if (!decoded) return null;
  
  // Check if token expires in less than 1 day
  const currentTime = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = decoded.exp! - currentTime;
  const oneDayInSeconds = 24 * 60 * 60;
  
  if (timeUntilExpiry < oneDayInSeconds) {
    // Generate new token with same payload
    const newToken = generateToken({
      userId: decoded.userId,
      email: decoded.email,
      emailVerified: decoded.emailVerified
    });
    setTokenInStorage(newToken);
    return newToken;
  }
  
  return token;
};