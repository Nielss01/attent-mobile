export const GOOGLE_SCOPES = {
  CONTACTS_READONLY: "https://www.googleapis.com/auth/contacts.readonly",
  CALENDAR_READONLY: "https://www.googleapis.com/auth/calendar.readonly",
};

export const GOOGLE_SSO_SCOPES = [
  GOOGLE_SCOPES.CONTACTS_READONLY,
  GOOGLE_SCOPES.CALENDAR_READONLY,
].join(" ");
