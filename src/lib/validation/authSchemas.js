import { z } from 'zod'
import { swissPhoneSchema } from './phoneValidation'
import { swissUidSchema } from './uidValidation'

/**
 * Enterprise & Financial Standard Password Schema (Mindestens 12 Zeichen)
 */
export const passwordSchema = z
  .string()
  .min(12, 'Das Passwort muss mindestens 12 Zeichen lang sein (Schweizer Finanzsoftware-Standard).')
  .refine((val) => /[A-Z]/.test(val) && /[a-z]/.test(val), {
    message: 'Das Passwort muss sowohl Gross- als auch Kleinbuchstaben enthalten.',
  })
  .refine((val) => /[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val), {
    message: 'Das Passwort muss mindestens eine Ziffer oder ein Sonderzeichen enthalten.',
  })

/**
 * Calculates password strength based on the 12-character standard
 * 
 * @param {string} pass 
 * @returns {{ score: number, label: string, color: string }}
 */
export function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: '', color: 'bg-gray-200' }
  if (pass.length < 12) {
    return { 
      score: 0, 
      label: `Zu kurz (${pass.length}/12 Zeichen)`, 
      color: 'bg-red-400' 
    }
  }

  let score = 1 // Already passed 12-char threshold
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[^A-Za-z0-9]/.test(pass) || pass.length >= 16) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: 'Einfach (mind. Gross/Kleinbuchstaben empfohlen)', color: 'bg-amber-400' }
    case 2:
      return { score: 2, label: 'Mittel', color: 'bg-amber-500' }
    case 3:
      return { score: 3, label: 'Gut', color: 'bg-blue-600' }
    case 4:
      return { score: 4, label: 'Sehr stark', color: 'bg-emerald-600' }
    default:
      return { score: 0, label: 'Zu kurz (mind. 12 Zeichen)', color: 'bg-red-400' }
  }
}

/**
 * Step 1: User Profile & Authentication Schema
 */
export const registrationStep1Schema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Bitte geben Sie Ihren vollständigen Vor- und Nachnamen ein (mindestens 2 Zeichen).'),
  email: z
    .string()
    .trim()
    .email('Bitte geben Sie eine gültige geschäftliche E-Mail-Adresse ein.'),
  password: passwordSchema,
})

/**
 * Step 2: Company & Swiss Location Schema
 */
export const registrationStep2Schema = z.object({
  firmenname: z
    .string()
    .trim()
    .min(2, 'Bitte geben Sie Ihren Firmen- oder Betriebsnamen ein.'),
  ort: z
    .string()
    .trim()
    .min(2, 'Bitte geben Sie mindestens den Standort (Ort) Ihres Betriebs an.'),
  kanton: z
    .string()
    .trim()
    .length(2, 'Bitte wählen Sie einen gültigen Schweizer Kanton (z. B. ZH, BE, SG).'),
  strasse: z.string().optional().default(''),
  plz: z.string().optional().default(''),
  telefon: swissPhoneSchema,
  uid: swissUidSchema,
  gewerk: z.string().min(1, 'Bitte wählen Sie Ihr Gewerk aus.'),
})

/**
 * Step 3: Terms & Finalization Schema
 */
export const registrationStep3Schema = z.object({
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Bitte bestätigen Sie die AGB und die Schweizer Datenschutzbestimmungen (DSG).',
  }),
})

/**
 * Helper to validate data against a schema and return user-friendly error string
 */
export function validateWithSchema(schema, data) {
  const result = schema.safeParse(data)
  if (result.success) {
    return { isValid: true, errors: null, data: result.data }
  }

  // Format first error message
  const firstIssue = result.error.issues[0]
  const message = firstIssue?.message || 'Eingabe ungültig. Bitte prüfen Sie Ihre Daten.'
  
  // Format field-level error mapping
  const fieldErrors = {}
  result.error.issues.forEach((issue) => {
    const field = issue.path[0]
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = issue.message
    }
  })

  return {
    isValid: false,
    errorMessage: message,
    fieldErrors,
  }
}
