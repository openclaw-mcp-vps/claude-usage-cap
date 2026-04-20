export async function sendSlackAlert(webhookUrl: string, text: string): Promise<void> {
  if (!webhookUrl) {
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      text
    })
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${responseText}`);
  }
}
