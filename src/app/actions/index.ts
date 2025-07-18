'use server';

import { signIn, signOut } from "../../auth";

export async function doSocialLogin(formData: FormData) {
  const action = formData.get('action');
  const callbackUrl = formData.get('callbackUrl') as string;
  await signIn(action as string, { redirectTo: callbackUrl || "/" });
}

export async function doLogout() {
  await signOut({ redirectTo: "/" });
}
