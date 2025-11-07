const SHA256_REGEX = /^[a-f0-9]{64}$/i;

export const normalizeSha256 = (value: string) => value.trim().toLowerCase();

export const assertSha256 = (value: string) => {
  if (!SHA256_REGEX.test(value)) {
    throw new Error("Invalid SHA-256 checksum provided");
  }
  return normalizeSha256(value);
};
