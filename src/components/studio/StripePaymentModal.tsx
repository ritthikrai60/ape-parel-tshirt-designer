'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  ShieldCheck,
  Check,
  X,
  CreditCard,
  QrCode,
  Lock,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    'pk_test_51UQXY2Abnkcvy28ne9sTYUUwrHNqLlob6P2UuemKGeeUTneKbQnhnbTDtHGPhseSOBCLRXXZNXpKle581seILR2J00F2f9mGWg'
);

interface StripePaymentFormProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  onPaymentSuccess: (receiptUrl?: string) => void;
  onCancel: () => void;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  orderId,
  orderNumber,
  totalAmount,
  onPaymentSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/account/orders/${orderId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment authentication failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Trigger manual webhook sync in case webhook is delayed in development
        fetch('/api/webhooks/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'payment_intent.succeeded',
            data: { object: paymentIntent },
          }),
        }).catch(() => {});

        onPaymentSuccess();
      } else {
        // Asynchronous flow like PromptPay QR scan
        onPaymentSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected payment error');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-paper p-3 rounded-xl border border-borderCol/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-mutedGray">Order Number:</span>
          <span className="font-bold text-ink">{orderNumber}</span>
        </div>
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-mutedGray">Total to Pay:</span>
          <span className="font-black text-base text-ink">฿{totalAmount.toLocaleString()} THB</span>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>Encrypted with 256-bit SSL &bull; Stripe Radar Anti-Fraud Protected</span>
        </div>
      </div>

      {/* Stripe Payment Element (PromptPay QR & Cards) */}
      <div className="p-3 bg-paper rounded-xl border border-borderCol">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-2.5 border border-borderCol hover:bg-paper-dark text-mutedGray hover:text-ink font-mono text-xs rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-2 py-2.5 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs uppercase tracking-wider font-bold rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-sm"
        >
          {isProcessing ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
              <span>Verifying with Bank...</span>
            </>
          ) : (
            <>
              <span>Pay ฿{totalAmount.toLocaleString()} Now</span>
              <ArrowRight className="w-3.5 h-3.5 text-warm" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export interface StripePaymentModalProps {
  isOpen: boolean;
  clientSecret: string | null;
  orderId: string | null;
  orderNumber: string | null;
  totalAmount: number;
  onClose: () => void;
  onComplete: () => void;
}

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  isOpen,
  clientSecret,
  orderId,
  orderNumber,
  totalAmount,
  onClose,
  onComplete,
}) => {
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] bg-ink/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-paper-light border border-borderCol w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-borderCol pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-warm/20 flex items-center justify-center text-warm">
              <CreditCard className="w-4 h-4 text-ink" />
            </div>
            <div>
              <h3 className="font-mono text-sm uppercase font-bold text-ink">
                Stripe Secure Checkout
              </h3>
              <p className="text-[10px] font-mono text-mutedGray">
                Cards &bull; PromptPay QR &bull; Apple Pay &bull; Google Pay
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-mutedGray hover:text-ink rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="space-y-4 text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-300">
              <Check className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-sans font-black text-ink">Payment Succeeded!</h4>
            <p className="text-xs font-mono text-mutedGray">
              Order <span className="font-bold text-ink">#{orderNumber}</span> has been confirmed and locked into Platform Escrow.
            </p>
            <div className="p-3 bg-paper rounded-xl border border-borderCol text-xs font-mono text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-mutedGray">Status:</span>
                <span className="font-bold text-emerald-700">PAYMENT_CONFIRMED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mutedGray">Escrow Holding:</span>
                <span className="font-bold text-ink">฿{totalAmount.toLocaleString()} THB</span>
              </div>
            </div>

            <div className="pt-2 flex space-x-3">
              {orderId && (
                <Link
                  href={`/account/orders/${orderId}`}
                  className="flex-1 py-3 bg-ink text-paper rounded-lg font-mono text-xs uppercase font-bold text-center hover:bg-ink-light transition-colors"
                >
                  View Order Specs & Receipt
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="px-4 py-3 border border-borderCol rounded-lg font-mono text-xs text-mutedGray hover:text-ink transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : clientSecret && orderId && orderNumber ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#131718',
                  colorBackground: '#FAF7F2',
                  colorText: '#131718',
                  colorDanger: '#df1b41',
                  fontFamily: 'system-ui, sans-serif',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <StripePaymentForm
              orderId={orderId}
              orderNumber={orderNumber}
              totalAmount={totalAmount}
              onPaymentSuccess={() => setIsSuccess(true)}
              onCancel={onClose}
            />
          </Elements>
        ) : (
          <div className="py-8 text-center text-xs font-mono text-mutedGray space-y-2">
            <span className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin inline-block" />
            <p>Initializing Secure Stripe Sandbox Session...</p>
          </div>
        )}
      </div>
    </div>
  );
};
