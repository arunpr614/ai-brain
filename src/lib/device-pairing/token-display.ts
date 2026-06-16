export function maskTokenForDisplay(token: string | null | undefined): string {
  if (!token || token.length < 12) return "Token hidden";
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export function isTokenVisibleInText(text: string, token: string): boolean {
  return token.length > 0 && text.includes(token);
}
