import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Exclude _next, _vercel, files with extensions, and /models/ (public AI model files
  // have no extension and would otherwise be mistaken for locale routes)
  matcher: ['/((?!_next|_vercel|models/|.*\\..*).*)'],
}
