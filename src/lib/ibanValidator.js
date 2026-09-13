import * as ibantools from 'ibantools';

export function validateIban(iban) {
  if (!iban || typeof iban !== 'string') {
    return { valid: false, error: 'Ungültiges IBAN-Format. Bitte prüfe die Eingabe.' };
  }

  const cleanIban = iban.replace(/\s+/g, '').toUpperCase();

  if (!cleanIban) {
    return { valid: false, error: 'Ungültiges IBAN-Format. Bitte prüfe die Eingabe.' };
  }

  if (!cleanIban.startsWith('CH') && !cleanIban.startsWith('LI')) {
    return { valid: false, error: 'Nur Schweizer (CH) und Liechtensteiner (LI) IBANs werden unterstützt.' };
  }

  if (cleanIban.length !== 21) {
    return { valid: false, error: 'Schweizer IBANs bestehen aus 21 Zeichen.' };
  }

  const result = ibantools.validateIBAN(cleanIban);
  if (!result.valid) {
    if (result.errorCodes.includes(ibantools.ValidationErrorsIBAN.WrongIBANChecksum)) {
      return { valid: false, error: 'Die Prüfziffer der IBAN ist ungültig.' };
    }
    return { valid: false, error: 'Ungültiges IBAN-Format. Bitte prüfe die Eingabe.' };
  }

  return { valid: true };
}

export function validateQrIban(iban) {
  const result = validateIban(iban);
  if (!result.valid) {
    return { valid: false, isQrIban: false, error: result.error };
  }

  const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
  const iid = parseInt(cleanIban.substring(4, 9), 10);

  const isQrIban = iid >= 30000 && iid <= 31999;

  if (!isQrIban) {
    return { 
      valid: false, 
      isQrIban: false, 
      error: 'Dies ist keine QR-IBAN. Eine QR-IBAN hat eine Instituts-ID zwischen 30000 und 31999.' 
    };
  }

  return { valid: true, isQrIban: true };
}
