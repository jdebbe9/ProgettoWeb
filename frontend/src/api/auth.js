// src/api/auth.js
import api, { setAccessToken } from './client'

export async function register(payload) {
  const {
    name, surname, birthDate, email, password, consent,
    parentFirstName, parentLastName, parentEmail, parentPhone, parentConsent,
    isMinor
  } = payload

  const consentBool = !!consent
  const parentConsentBool = !!parentConsent

  const body = {
    name,
    email,
    password,

    // anagrafica
    surname, lastName: surname, cognome: surname,
    birthDate, dob: birthDate, dataNascita: birthDate,

    // minore
    isMinor: !!isMinor,

    // consenso proprio
    consent: consentBool, privacyConsent: consentBool, consenso: consentBool, termsAccepted: consentBool,

    // dati e consenso del genitore/tutore (varie chiavi per compatibilità)
    parent: {
      firstName: parentFirstName,
      lastName: parentLastName,
      email: parentEmail,
      phone: parentPhone,
      consent: parentConsentBool
    },
    parentFirstName, parentLastName, parentEmail, parentPhone,
    parentConsent: parentConsentBool,
    guardianConsent: parentConsentBool
  }

  const { data } = await api.post('/auth/register', body)
  return data
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  if (data?.accessToken) setAccessToken(data.accessToken)
  return data
}

export async function me() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function logout() {
  await api.post('/auth/logout')
  setAccessToken(null)
}

export async function refresh() {
  const { data } = await api.post('/auth/refresh')
  if (data?.accessToken) setAccessToken(data.accessToken)
  return data
}



