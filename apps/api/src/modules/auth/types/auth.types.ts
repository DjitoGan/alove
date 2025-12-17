/**
 * JWT User Payload Interface
 * Extracted from JWT token by JwtStrategy
 */
export interface JwtPayload {
  sub: string; // User ID (subject)
  email: string; // User email
  type: 'access' | 'refresh';
}

/**
 * CurrentUser Decorator Payload
 * What @CurrentUser decorator provides
 */
export interface CurrentUserPayload {
  sub: string; // User ID
  email: string; // User email
}
