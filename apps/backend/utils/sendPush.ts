import admin from "../src/config/firebase";

interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification({ token, title, body, data }: PushPayload): Promise<void> {
  await admin.messaging().send({
    token,
    notification: { title, body },
    data,
  });
}
