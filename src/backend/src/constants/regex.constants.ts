/**
 * Regular expression constants for application-wide input validation and data sanitization.
 * These patterns are designed for both server-side security validation and client-side form validation
 * with zod integration. Performance and security considerations are documented for each pattern.
 * 
 * @module regex.constants
 */

/**
 * Validates phone numbers in E.164 international format.
 * Examples: +1234567890 (valid), 1234567890 (invalid).
 * Used for SMS functionality and lead contact validation.
 * 
 * Pattern explanation:
 * ^ - Start of string
 * \+ - Literal plus sign
 * [1-9] - First digit must be 1-9 (no leading zero)
 * \d{1,14} - 1 to 14 additional digits
 * $ - End of string
 * 
 * Max length: 15 digits (plus sign + 14 digits) per E.164 specification
 */
export const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * RFC 5322 compliant email validation pattern.
 * Balances security with real-world email formats.
 * Examples: user@domain.com (valid), user@domain (invalid).
 * 
 * Pattern explanation:
 * ^ - Start of string
 * [a-zA-Z0-9._%+-]+ - Local part: letters, numbers, and common special chars
 * @ - At symbol
 * [a-zA-Z0-9.-]+ - Domain: letters, numbers, dots, and hyphens
 * \. - Dot separator
 * [a-zA-Z]{2,} - TLD: letters only, minimum 2 chars
 * $ - End of string
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Strong password validation requiring minimum 8 characters,
 * at least one uppercase, lowercase, number, and special character.
 * Follows security best practices for user authentication.
 * 
 * Pattern explanation:
 * ^ - Start of string
 * (?=.*[a-z]) - At least one lowercase letter
 * (?=.*[A-Z]) - At least one uppercase letter
 * (?=.*\d) - At least one number
 * (?=.*[@$!%*?&]) - At least one special character
 * [A-Za-z\d@$!%*?&]{8,} - Valid chars, minimum 8 length
 * $ - End of string
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * URL validation for form embeds and integrations.
 * Supports HTTP/HTTPS protocols.
 * Examples: https://example.com (valid), ftp://example.com (invalid).
 * 
 * Pattern explanation:
 * ^ - Start of string
 * https?:\/\/ - HTTP or HTTPS protocol
 * (?:www\.)? - Optional www
 * [-a-zA-Z0-9@:%._\+~#=]{1,256} - Domain name
 * \. - Dot separator
 * [a-zA-Z0-9()]{1,6} - TLD
 * \b - Word boundary
 * (?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*) - Valid URL chars
 * $ - End of string
 */
export const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

/**
 * WARNING: These patterns are part of the application's security layer.
 * Any modifications must undergo security review and testing.
 * 
 * @security
 * - Patterns are designed to prevent injection attacks
 * - Regular expressions are anchored (^ and $) to prevent partial matches
 * - Performance considerations taken into account to prevent ReDoS attacks
 * - Patterns follow industry standards and specifications where applicable
 */