import "server-only";
// Payment provider seam. No card data ever touches this server: real providers use hosted
// payment pages / tokenised redirects and report the outcome via signed webhooks.
import { AppError } from "../../errors";
import { getEnv, isPaymentSimulationAllowed } from "../../env";
import { hmacHex, safeEqual } from "../../crypto";

export type PaymentEventType = "payment.succeeded" | "payment.failed" | "refund.succeeded";

export interface PaymentEvent {
  /** Provider-unique event id; webhook processing is idempotent on (provider, eventId). */
  eventId: string;
  type: PaymentEventType;
  /** OUR Payment.id (round-tripped through the provider as the merchant reference). */
  paymentId: string;
  amountKurus: number;
}

export interface InitiateInput {
  paymentId: string;
  orderNumber: string;
  amountKurus: number;
  currency: string;
  email: string;
}
export interface InitiateResult {
  /** awaiting_payment: no collection channel yet (provider "none"). redirect: send the buyer to redirectUrl. */
  status: "awaiting_payment" | "redirect";
  redirectUrl?: string;
  providerPaymentId?: string;
  message: string;
}

export interface PaymentProvider {
  readonly name: string;
  initiate(input: InitiateInput): Promise<InitiateResult>;
  /** Constant-time signature check over the RAW request body. */
  verifyWebhook(signature: string | null, rawBody: string): boolean;
  parseEvent(rawBody: string): PaymentEvent;
  refund(input: { paymentId: string; providerPaymentId: string | null; amountKurus: number }): Promise<{ ok: boolean; providerRefundId?: string }>;
}

const notConfigured = (n: string) => new AppError("PAYMENT_FAILED", `${n} ödeme altyapısı henüz yapılandırılmadı.`);

class NoneProvider implements PaymentProvider {
  readonly name = "none";
  async initiate(i: InitiateInput): Promise<InitiateResult> {
    void i;
    return { status: "awaiting_payment", message: "Siparişiniz oluşturuldu — ödeme altyapısı henüz aktif değil, ödeme bekleniyor." };
  }
  verifyWebhook() {
    return false; // nothing can ever be verified => nothing can be marked paid
  }
  parseEvent(): PaymentEvent {
    throw notConfigured("Ödeme");
  }
  async refund() {
    return { ok: true }; // no money was ever collected through this provider
  }
}

/** No fallback: env validation fails fast when simulation is enabled without PAYMENT_SIMULATION_SECRET. */
export const simulationSecret = () => getEnv().PAYMENT_SIMULATION_SECRET;

function assertSimulation() {
  if (!isPaymentSimulationAllowed()) throw new AppError("NOT_FOUND");
}

/** Development-only provider: HMAC-signed JSON events produced by /api/dev/payments/simulate. */
class SimulatedProvider implements PaymentProvider {
  readonly name = "simulated";
  async initiate(i: InitiateInput): Promise<InitiateResult> {
    assertSimulation();
    void i;
    return { status: "awaiting_payment", message: "Test ödemesi (geliştirme) kullanılabilir." };
  }
  static sign(rawBody: string) {
    return hmacHex(rawBody, simulationSecret());
  }
  verifyWebhook(signature: string | null, rawBody: string) {
    assertSimulation();
    if (!signature) return false;
    return safeEqual(signature, SimulatedProvider.sign(rawBody));
  }
  parseEvent(rawBody: string): PaymentEvent {
    assertSimulation();
    let o: Partial<PaymentEvent>;
    try {
      o = JSON.parse(rawBody);
    } catch {
      throw new AppError("VALIDATION", "Geçersiz olay gövdesi.");
    }
    const types: PaymentEventType[] = ["payment.succeeded", "payment.failed", "refund.succeeded"];
    if (!o.eventId || !o.paymentId || !types.includes(o.type as PaymentEventType) || !Number.isInteger(o.amountKurus)) {
      throw new AppError("VALIDATION", "Geçersiz olay.");
    }
    return { eventId: String(o.eventId), type: o.type as PaymentEventType, paymentId: String(o.paymentId), amountKurus: o.amountKurus as number };
  }
  async refund(i: { paymentId: string }) {
    assertSimulation();
    return { ok: true, providerRefundId: `sim_refund_${i.paymentId}` };
  }
}
export const signSimulatedEvent = (rawBody: string) => SimulatedProvider.sign(rawBody);

class StubProvider implements PaymentProvider {
  constructor(readonly name: string) {}
  async initiate(): Promise<InitiateResult> {
    throw notConfigured(this.name);
  }
  verifyWebhook(): boolean {
    throw notConfigured(this.name);
  }
  parseEvent(): PaymentEvent {
    throw notConfigured(this.name);
  }
  async refund(): Promise<{ ok: boolean }> {
    throw notConfigured(this.name);
  }
}

export function getPaymentProvider(name: string = getEnv().PAYMENT_PROVIDER): PaymentProvider {
  switch (name) {
    case "none":
      return new NoneProvider();
    case "simulated":
      assertSimulation();
      return new SimulatedProvider();
    case "iyzico":
    case "paytr":
      return new StubProvider(name);
    default:
      throw new AppError("NOT_FOUND");
  }
}
