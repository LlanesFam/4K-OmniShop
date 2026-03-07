/** One-time fetch of a user profile. Returns null if not found. */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? (snap.data() as UserProfile) : null
  } catch {
    return null
  }
}
