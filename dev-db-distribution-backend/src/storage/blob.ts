import { DefaultAzureCredential } from "@azure/identity";
import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  type BlobSASSignatureValues,
} from "@azure/storage-blob";
import { env } from "../env.js";
import { addHours, addMinutes, datePathParts, formatTimestamp, nowUtc } from "../utils/time.js";

interface BlobClientContext {
  serviceClient: BlobServiceClient;
  sharedKeyCredential?: StorageSharedKeyCredential;
}

let cachedContext: BlobClientContext | null = null;

const extractConnectionSetting = (connectionString: string, key: string) => {
  const segments = connectionString.split(";").filter(Boolean);
  for (const segment of segments) {
    const [name, value] = segment.split("=", 2);
    if (name?.toLowerCase() === key.toLowerCase()) {
      return value;
    }
  }
  return undefined;
};

const ensureContext = (): BlobClientContext => {
  if (!cachedContext) {
    if (env.useManagedIdentity) {
      const credential = new DefaultAzureCredential();
      const serviceClient = new BlobServiceClient(
        `https://${env.storageAccount}.blob.core.windows.net`,
        credential,
      );
      cachedContext = { serviceClient };
    } else {
      const connectionString = env.storageConnectionString!;
      const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
      const accountName =
        extractConnectionSetting(connectionString, "AccountName") ?? env.storageAccount;
      const accountKey = extractConnectionSetting(connectionString, "AccountKey");
      if (!accountKey) {
        throw new Error("Connection string missing AccountKey; cannot generate SAS");
      }
      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      cachedContext = { serviceClient, sharedKeyCredential };
    }
  }
  return cachedContext;
};

export const getBlobServiceClient = () => ensureContext().serviceClient;

const buildSasValues = (
  blobPath: string,
  permissions: BlobSASPermissions,
  startsOn: Date,
  expiresOn: Date,
  extra?: Partial<BlobSASSignatureValues>,
): BlobSASSignatureValues => ({
  containerName: env.storageContainer,
  blobName: blobPath,
  permissions,
  startsOn,
  expiresOn,
  contentDisposition: extra?.contentDisposition,
  contentType: extra?.contentType,
  cacheControl: extra?.cacheControl,
});

const buildBlobFilename = (blobPath: string) => {
  const parts = blobPath.split("/");
  return parts[parts.length - 1] ?? "backup.bak";
};

export const buildBlobPath = (
  serverDns: string,
  dbName: string,
  ticket: string,
  date: Date = nowUtc(),
) => {
  const { year, month, day } = datePathParts(date);
  const timestamp = formatTimestamp(date);
  const sanitizedServer = serverDns.replace(/[^a-zA-Z0-9.-]/g, "_");
  const sanitizedDb = dbName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const sanitizedTicket = ticket.replace(/[^a-zA-Z0-9_-]/g, "_");

  return `${env.storageBackupsPrefix}/${sanitizedServer}/${sanitizedDb}/${year}/${month}/${day}/${sanitizedTicket}/db_full_${sanitizedDb}_${timestamp}.bak`;
};

const buildBlobUrlWithSas = async (
  blobPath: string,
  values: BlobSASSignatureValues,
): Promise<string> => {
  const { serviceClient, sharedKeyCredential } = ensureContext();
  const containerClient = serviceClient.getContainerClient(env.storageContainer);
  const blobClient = containerClient.getBlockBlobClient(blobPath);

  const startsOn = values.startsOn ?? new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = values.expiresOn;
  const signatureValues: BlobSASSignatureValues = {
    ...values,
    startsOn,
    expiresOn,
  };

  let sas: string;

  if (env.useManagedIdentity) {
    const delegationKey = await serviceClient.getUserDelegationKey(startsOn, expiresOn);
    sas = generateBlobSASQueryParameters(
      signatureValues,
      delegationKey,
      env.storageAccount,
    ).toString();
  } else {
    if (!sharedKeyCredential) {
      throw new Error("Shared key credential unavailable for SAS generation");
    }
    sas = generateBlobSASQueryParameters(signatureValues, sharedKeyCredential).toString();
  }

  return `${blobClient.url}?${sas}`;
};

export const getUserDelegationSasUrl = async (blobPath: string, ttlHours: number) => {
  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = addHours(new Date(), ttlHours);
  const filename = buildBlobFilename(blobPath);
  const permissions = BlobSASPermissions.parse("r");

  const values = buildSasValues(blobPath, permissions, startsOn, expiresOn, {
    contentDisposition: `attachment; filename=${filename}`,
  });
  return buildBlobUrlWithSas(blobPath, values);
};

export const getWriteSasUrl = async (blobPath: string, ttlMinutes: number) => {
  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = addMinutes(new Date(), ttlMinutes);
  const permissions = BlobSASPermissions.parse("cw");

  const values = buildSasValues(blobPath, permissions, startsOn, expiresOn);
  return buildBlobUrlWithSas(blobPath, values);
};

