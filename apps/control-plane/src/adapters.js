function required(value, name) {
  if (value === undefined || value === null || value === "") throw new Error(`Missing commercial field: ${name}`);
  return value;
}

function iso(value, name) {
  const parsed = new Date(required(value, name));
  if (Number.isNaN(parsed.valueOf())) throw new Error(`Invalid timestamp: ${name}`);
  return parsed.toISOString();
}

function nonNegativeNumber(value, name) {
  const number = Number(required(value, name));
  if (!Number.isFinite(number) || number < 0) throw new Error(`${name} must be a non-negative number`);
  return number;
}

function optionalText(value) {
  return value === undefined || value === null || value === "" ? undefined : value;
}

function ociRequestId(usageKey) {
  const normalized = String(usageKey).replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 120);
  return `usage-${normalized || "record"}`;
}

export function awsMeteringRecord(usage) {
  const commercial = usage.commercial ?? {};
  return {
    ProductCode: required(commercial.productCode ?? process.env.AWS_MARKETPLACE_PRODUCT_CODE, "productCode"),
    UsageRecords: [{
      CustomerIdentifier: required(commercial.customerIdentifier, "customerIdentifier"),
      Dimension: usage.dimension,
      Quantity: usage.quantity,
      Timestamp: iso(usage.timestamp, "timestamp")
    }]
  };
}

export async function submitAwsUsage(usage) {
  const { MarketplaceMeteringClient, BatchMeterUsageCommand } = await import("@aws-sdk/client-marketplace-metering");
  const client = new MarketplaceMeteringClient({ region: process.env.AWS_REGION });
  const payload = awsMeteringRecord(usage);
  const response = await client.send(new BatchMeterUsageCommand(payload));
  if (response.UnprocessedRecords?.length) {
    const error = new Error("AWS Marketplace returned unprocessed metering records");
    error.retryable = true;
    error.details = response.UnprocessedRecords;
    throw error;
  }
  return { provider: "aws", recordId: usage.usageKey, requestId: response.$metadata?.requestId ?? null };
}

export function ociUsageRecord(usage) {
  const commercial = usage.commercial ?? {};
  const usageStart = iso(commercial.usageStart ?? usage.timestamp, "usageStart");
  const usageEnd = iso(commercial.usageEnd ?? usage.timestamp, "usageEnd");
  if (usageStart >= usageEnd) throw new Error("OCI usageEnd must be after usageStart");

  return {
    id: required(usage.usageKey, "usageKey"),
    marketplaceOfferId: required(commercial.marketplaceOfferId, "marketplaceOfferId"),
    amount: nonNegativeNumber(commercial.amount, "amount"),
    currencyCode: required(commercial.currencyCode ?? "USD", "currencyCode"),
    timeUsageStarted: new Date(usageStart),
    timeUsageEnded: new Date(usageEnd),
    usageDimensionName: required(usage.dimension, "dimension"),
    consumedQuantity: nonNegativeNumber(usage.quantity, "quantity"),
    customerTenancyId: optionalText(commercial.customerTenancyId),
    billingIdentifier: optionalText(commercial.billingIdentifier)
  };
}

export async function createOciPartnerClient() {
  const self = await import("oci-self");
  const common = await import("oci-common");
  const provider = common.ResourcePrincipalAuthenticationDetailsProvider.builder();
  return new self.PartnerIntegerationClient({ authenticationDetailsProvider: provider });
}

export async function submitOciUsage(usage, { client, compartmentId } = {}) {
  const targetCompartmentId = required(compartmentId ?? process.env.OCI_COMPARTMENT_ID, "OCI_COMPARTMENT_ID");
  const partnerClient = client ?? await createOciPartnerClient();
  const response = await partnerClient.submitSubscriptionUsageRecords({
    compartmentId: targetCompartmentId,
    opcRetryToken: usage.usageKey,
    opcRequestId: ociRequestId(usage.usageKey),
    submitSubscriptionUsageRecordsDetails: { subscriptionUsageRecords: [ociUsageRecord(usage)] }
  });
  return { provider: "oci", recordId: usage.usageKey, requestId: response.opcRequestId ?? null };
}

export async function deliverUsage(usage, mode = process.env.MARKETPLACE_DELIVERY_MODE ?? "record") {
  if (mode === "record") return { provider: usage.provider, recordId: usage.usageKey, mode: "record" };
  if (mode !== "production") throw new Error(`Unsupported MARKETPLACE_DELIVERY_MODE: ${mode}`);
  if (usage.provider === "aws") return submitAwsUsage(usage);
  if (usage.provider === "oci") return submitOciUsage(usage);
  throw new Error(`Unsupported marketplace provider: ${usage.provider}`);
}
