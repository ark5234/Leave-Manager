import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteField,
} from 'firebase/firestore';
import type { UserRecord } from './attendance';

/** Normalize any date value to a YYYY-MM-DD string key */
function toDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Use local date parts to avoid timezone-shift issues
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function readRecords(uid: string): Promise<UserRecord[]> {
  const ref = collection(db, 'users', uid, 'records');
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({
    date: d.id, // YYYY-MM-DD
    status: d.data().status as UserRecord['status'],
  }));
}

export async function upsertRecord(uid: string, rec: UserRecord): Promise<UserRecord> {
  const key = toDateKey(rec.date);
  const ref = doc(db, 'users', uid, 'records', key);
  await setDoc(ref, { date: key, status: rec.status }, { merge: true });
  return { ...rec, date: key };
}

export async function deleteRecord(uid: string, date: Date | string): Promise<void> {
  const key = toDateKey(date);
  const ref = doc(db, 'users', uid, 'records', key);
  await deleteDoc(ref);
}

export async function clearAll(uid: string): Promise<void> {
  const ref = collection(db, 'users', uid, 'records');
  const snap = await getDocs(ref);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

// --------------- Profile & Admin Utilities ---------------

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  // Custom overrides stored in Firestore (user can change these independently of Google account)
  customDisplayName?: string;
  customPhotoURL?: string;
};

/** Called on every login — keeps Google profile in sync, does NOT overwrite custom fields */
export async function saveUserProfile(uid: string, profile: Omit<UserProfile, 'uid'>): Promise<void> {
  const ref = doc(db, 'users', uid);
  // Only write the Google-sourced fields; custom* fields are managed separately
  await setDoc(ref, {
    email: profile.email,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
  }, { merge: true });
}

/** Fetch the full profile document for a user (includes custom fields) */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    email: d.email || '',
    displayName: d.displayName || '',
    photoURL: d.photoURL || '',
    customDisplayName: d.customDisplayName || '',
    customPhotoURL: d.customPhotoURL || '',
  };
}

/** Save custom display name and/or photo URL chosen by the user */
export async function updateCustomProfile(
  uid: string,
  fields: { customDisplayName?: string; customPhotoURL?: string }
): Promise<void> {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, fields, { merge: true });
}

/** Admin: list all registered users */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const ref = collection(db, 'users');
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({
    uid: d.id,
    email: d.data().email || '',
    displayName: d.data().displayName || d.id,
    photoURL: d.data().photoURL || '',
  }));
}

/** Admin: read records for any user */
export async function readRecordsForUser(uid: string): Promise<UserRecord[]> {
  return readRecords(uid);
}

// --------------- Internship Date Range ---------------

export type InternshipDates = {
  internshipStart?: string; // YYYY-MM-DD
  internshipEnd?: string;   // YYYY-MM-DD
};

/** Persist the internship start/end dates on the user's profile document */
export async function saveInternshipDates(uid: string, dates: InternshipDates): Promise<void> {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, dates, { merge: true });
}

/** Load the internship start/end dates from the user's profile document */
export async function getInternshipDates(uid: string): Promise<InternshipDates> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return {};
  const d = snap.data();
  return {
    internshipStart: d.internshipStart ?? '',
    internshipEnd: d.internshipEnd ?? '',
  };
}

// --------------- Day Notes ---------------
// Notes are stored as a map field `notesByDate` on the user's profile document
// (users/{uid}) so they are covered by the same Firestore security rules.

/** Read all notes for a user; returns a map of YYYY-MM-DD → note text */
export async function readNotes(uid: string): Promise<Record<string, string>> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return {};
    return (snap.data().notesByDate as Record<string, string>) ?? {};
  } catch {
    return {};
  }
}

/** Save or delete the note for a specific day.
 *  Passing an empty/whitespace-only string removes the key from the map. */
export async function saveNote(uid: string, dateKey: string, note: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  if (!note.trim()) {
    // deleteField() removes only this key from the notesByDate map
    await updateDoc(ref, { [`notesByDate.${dateKey}`]: deleteField() });
  } else {
    await updateDoc(ref, { [`notesByDate.${dateKey}`]: note.trim() });
  }
}
