import * as Contacts from "expo-contacts";
import { Platform } from "react-native";

export type ContactPermissionStatus = "granted" | "denied" | "undetermined" | "blocked";

export interface DeviceContactAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface SerializableContact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phones: string[];
  emails: string[];
  /** ISO date: YYYY-MM-DD, or 0000-MM-DD when year is unknown */
  birthday?: string;
  company?: string;
  jobTitle?: string;
  addresses: DeviceContactAddress[];
}

export async function requestContactsPermission(): Promise<ContactPermissionStatus> {
  const { status } = await Contacts.requestPermissionsAsync();
  return mapStatus(status);
}

export async function getContactsPermissionStatus(): Promise<ContactPermissionStatus> {
  const { status } = await Contacts.getPermissionsAsync();
  return mapStatus(status);
}

function mapStatus(status: Contacts.PermissionStatus): ContactPermissionStatus {
  switch (status) {
    case Contacts.PermissionStatus.GRANTED:
      return "granted";
    case Contacts.PermissionStatus.DENIED:
      // On iOS a denied permission cannot be re-prompted — user must go to Settings
      return Platform.OS === "ios" ? "blocked" : "denied";
    case Contacts.PermissionStatus.UNDETERMINED:
    default:
      return "undetermined";
  }
}

function normaliseBirthday(birthday: Contacts.Date | undefined): string | undefined {
  if (!birthday) return undefined;
  const { year, month, day } = birthday;
  if (month == null || !day) return undefined;
  // expo-contacts months are 0-indexed on iOS, 1-indexed on Android
  const adjustedMonth = Platform.OS === "ios" ? month + 1 : month;
  const mm = String(adjustedMonth).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return year ? `${year}-${mm}-${dd}` : `0000-${mm}-${dd}`;
}

/** Fetch all device contacts. Photos are intentionally excluded to keep the
 *  WebView bridge payload manageable — avatars can be added post-import. */
export async function fetchDeviceContacts(): Promise<SerializableContact[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
      Contacts.Fields.Birthday,
      Contacts.Fields.Company,
      Contacts.Fields.JobTitle,
      Contacts.Fields.Addresses,
    ],
    sort: Contacts.SortTypes.FirstName,
  });

  const results: SerializableContact[] = [];

  for (const contact of data) {
    if (!contact.id) continue;

    const name =
      [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() ||
      contact.name ||
      "";
    if (!name) continue;

    const phones = (contact.phoneNumbers ?? [])
      .map((p) => p.number?.trim())
      .filter((n): n is string => !!n);

    const emails = (contact.emails ?? [])
      .map((e) => e.email?.trim().toLowerCase())
      .filter((e): e is string => !!e);

    const birthday = normaliseBirthday(contact.birthday);

    const addresses: DeviceContactAddress[] = (contact.addresses ?? []).map((a) => ({
      street: a.street ?? undefined,
      city: a.city ?? undefined,
      postalCode: a.postalCode ?? undefined,
      country: a.country ?? undefined,
    }));

    results.push({
      id: contact.id,
      name,
      firstName: contact.firstName ?? undefined,
      lastName: contact.lastName ?? undefined,
      phones,
      emails,
      birthday,
      company: contact.company ?? undefined,
      jobTitle: contact.jobTitle ?? undefined,
      addresses,
    });
  }

  return results;
}
