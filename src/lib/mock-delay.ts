/** Mock 模式下模拟网络延迟 */
export async function withMockDelay(ms = 300): Promise<void> {
  if (process.env.USE_FEISHU !== "true") {
    await new Promise((r) => setTimeout(r, ms));
  }
}
