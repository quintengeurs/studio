import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase'; // Note: importing from our existing firebase config

export type CreateUserData = {
  // Notice: No `uid` here. The backend generates it.
  email: string;
  password?: string;
  displayName?: string;
  orgId: string;
  role?: 'Admin' | 'Member' | 'Viewer' | 'Staff' | string;
};

export type UpdateUserData = {
  uid: string;
  orgId?: string;
  role?: 'Admin' | 'Member' | 'Viewer' | 'Staff' | string;
};

// Create User (Calls our secure `adminCreateUser` function under the hood)
export async function createUserWithClaims(data: CreateUserData) {
  const fn = httpsCallable<CreateUserData, { uid: string, success: boolean }>(
    functions,
    'adminCreateUser'
  );
  const result = await fn(data);
  return result.data;
}

// Update User (Calls the new `updateUserClaims` function we just added)
export async function updateUserClaims(data: UpdateUserData) {
  const fn = httpsCallable<UpdateUserData, { success: boolean }>(
    functions,
    'updateUserClaims'
  );
  const result = await fn(data);
  return result.data;
}
