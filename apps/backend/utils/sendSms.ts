/**
 * Sends an SMS via an external provider (stub — integrate with Semaphore/Vonage as needed).
 */
export async function sendSms(to: string, message: string): Promise<void> {
  console.log(`[SMS] To: ${to} | Message: ${message}`);
  // TODO: Integrate with a Philippine SMS provider like Semaphore or Globe API
}
