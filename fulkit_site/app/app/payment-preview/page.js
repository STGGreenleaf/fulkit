"use client";

import { useState } from "react";
import {
  CreditCard,
  Zap,
  ArrowRight,
  RotateCcw,
  Users,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";

const GATEWAY_STEPS = [
  { id: "plans", label: "Choose Plan" },
  { id: "checkout", label: "Stripe Checkout" },
  { id: "webhook", label: "Webhook Received" },
  { id: "active", label: "Subscription Active" },
  { id: "portal", label: "Customer Portal" },
  { id: "cancelled", label: "Cancelled" },
];

const MOCK_PLANS = [
  { id: "standard", name: "Standard", price: "$7", period: "/mo", msgs: 450, features: ["450 messages/mo", "Sonnet 2K context", "All integrations", "Priority support"] },
  { id: "pro", name: "Pro", price: "$15", period: "/mo", msgs: 800, features: ["800 messages/mo", "Sonnet 4K context", "All integrations", "Priority support", "Early features"] },
];

export default function PaymentPreview() {
  const [gwStep, setGwStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [mockProfile, setMockProfile] = useState({
    seat_type: "free",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    messages_this_month: 23,
  });

  function advanceGateway(plan) {
    if (gwStep === 0) {
      setSelectedPlan(plan);
      setGwStep(1);
    } else if (gwStep === 1) {
      setWebhookEvents((prev) => [
        ...prev,
        {
          type: "checkout.session.completed",
          time: new Date().toLocaleTimeString(),
          data: {
            plan: plan || selectedPlan,
            customer: "cus_mock_" + Math.random().toString(36).slice(2, 8),
            subscription: "sub_mock_" + Math.random().toString(36).slice(2, 8),
          },
        },
      ]);
      setGwStep(2);
    } else if (gwStep === 2) {
      const p = selectedPlan || "standard";
      setMockProfile((prev) => ({
        ...prev,
        seat_type: p,
        stripe_customer_id:
          webhookEvents[webhookEvents.length - 1]?.data?.customer || "cus_mock",
        stripe_subscription_id:
          webhookEvents[webhookEvents.length - 1]?.data?.subscription ||
          "sub_mock",
      }));
      setGwStep(3);
    } else if (gwStep === 3) {
      setGwStep(4);
    } else if (gwStep === 4) {
      setWebhookEvents((prev) => [
        ...prev,
        {
          type: "customer.subscription.deleted",
          time: new Date().toLocaleTimeString(),
          data: {
            plan: selectedPlan,
            customer: mockProfile.stripe_customer_id,
          },
        },
      ]);
      setMockProfile((prev) => ({
        ...prev,
        seat_type: "free",
        stripe_subscription_id: null,
      }));
      setGwStep(5);
    }
  }

  function resetGateway() {
    setGwStep(0);
    setSelectedPlan(null);
    setWebhookEvents([]);
    setMockProfile({
      seat_type: "free",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      messages_this_month: 23,
    });
  }

  const stepStyle = (i) => ({
    fontSize: "var(--font-size-2xs)",
    fontFamily: "var(--font-mono)",
    fontWeight:
      i === gwStep
        ? "var(--font-weight-bold)"
        : "var(--font-weight-normal)",
    color:
      i < gwStep
        ? "var(--color-success)"
        : i === gwStep
        ? "var(--color-text)"
        : "var(--color-text-dim)",
    letterSpacing: "var(--letter-spacing-wide)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  });

  const btnStyle = (variant) => ({
    display: "block",
    width: "100%",
    textAlign: "center",
    padding: "var(--space-3) var(--space-4)",
    background:
      variant === "primary" ? "var(--color-text)" : "transparent",
    color:
      variant === "primary"
        ? "var(--color-bg)"
        : "var(--color-text-secondary)",
    border:
      variant === "primary"
        ? "none"
        : "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--font-size-sm)",
    fontWeight: "var(--font-weight-medium)",
    fontFamily: "var(--font-primary)",
    cursor: "pointer",
  });

  const seatLimit =
    { free: 100, standard: 450, pro: 800 }[mockProfile.seat_type] || 100;
  const remaining = seatLimit - mockProfile.messages_this_month;

  return (
    <AuthGuard>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "var(--space-6) var(--space-4)",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-5)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <CreditCard
                size={20}
                strokeWidth={1.5}
                style={{ color: "var(--color-text-muted)" }}
              />
              <h1
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text)",
                  margin: 0,
                  fontFamily: "var(--font-primary)",
                }}
              >
                Payment Gateway
              </h1>
            </div>
            {gwStep > 0 && (
              <button
                onClick={resetGateway}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  padding: "var(--space-1) var(--space-2)",
                  fontSize: "var(--font-size-2xs)",
                  color: "var(--color-text-dim)",
                  background: "transparent",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontFamily: "var(--font-primary)",
                }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

      {/* Step indicator */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          padding: "var(--space-3) var(--space-4)",
          background: "var(--color-bg-elevated)",
          borderRadius: "var(--radius-sm)",
          overflowX: "auto",
          marginBottom: "var(--space-4)",
        }}
      >
        {GATEWAY_STEPS.map((s, i) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
            }}
          >
            <span style={stepStyle(i)}>
              {i < gwStep ? "\u2713" : i + 1} {s.label}
            </span>
            {i < GATEWAY_STEPS.length - 1 && (
              <ArrowRight
                size={10}
                style={{ color: "var(--color-text-dim)", flexShrink: 0 }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        {/* Step 0: Choose Plan */}
        {gwStep === 0 && (
          <div style={{ padding: "var(--space-4)" }}>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-dim)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-widest)",
                marginBottom: "var(--space-3)",
              }}
            >
              Select a plan
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              {MOCK_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => advanceGateway(plan.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-3) var(--space-4)",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--color-border-light)",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                    fontFamily: "var(--font-primary)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text)",
                      }}
                    >
                      {plan.name}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {plan.features.join(" \u00b7 ")}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 2,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--font-size-lg)",
                        fontWeight: "var(--font-weight-bold)",
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-text)",
                      }}
                    >
                      {plan.price}
                    </span>
                    <span
                      style={{
                        fontSize: "var(--font-size-2xs)",
                        color: "var(--color-text-dim)",
                      }}
                    >
                      {plan.period}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => advanceGateway("credits")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-3) var(--space-4)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                fontFamily: "var(--font-primary)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <Zap
                  size={14}
                  strokeWidth={1.8}
                  style={{ color: "var(--color-warning)" }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-text)",
                    }}
                  >
                    F\u00fcl up
                  </div>
                  <div
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    100 messages on demand
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: "var(--font-weight-bold)",
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-text)",
                  }}
                >
                  $2
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-2xs)",
                    color: "var(--color-text-dim)",
                  }}
                >
                  once
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Step 1: Stripe Checkout (mock) */}
        {gwStep === 1 && (
          <div style={{ padding: "var(--space-6)", textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0 auto var(--space-3)",
                background: "var(--color-bg-elevated)",
                borderRadius: "var(--radius-full)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard
                size={22}
                strokeWidth={1.5}
                style={{ color: "var(--color-text-muted)" }}
              />
            </div>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-dim)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-widest)",
                marginBottom: "var(--space-1)",
              }}
            >
              Stripe Checkout
            </div>
            <div
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-bold)",
                marginBottom: "var(--space-1)",
              }}
            >
              F\u00fclkit{" "}
              {selectedPlan === "credits"
                ? "Credits"
                : selectedPlan === "pro"
                ? "Pro"
                : "Standard"}
            </div>
            <div
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-4)",
              }}
            >
              {selectedPlan === "credits"
                ? "$2.00 one-time"
                : selectedPlan === "pro"
                ? "$15.00/month"
                : "$7.00/month"}
            </div>
            <div
              style={{
                padding: "var(--space-3) var(--space-4)",
                background: "var(--color-bg)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "var(--space-4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                <span>Card</span>
                <span>\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 4242</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                <span>Email</span>
                <span>collin@fulkit.app</span>
              </div>
            </div>
            <button onClick={() => advanceGateway()} style={btnStyle("primary")}>
              Complete Payment \u2192
            </button>
            <div
              style={{
                fontSize: "var(--font-size-2xs)",
                color: "var(--color-text-dim)",
                marginTop: "var(--space-2)",
              }}
            >
              Mock \u2014 no real charge
            </div>
          </div>
        )}

        {/* Step 2: Webhook Received */}
        {gwStep === 2 && (
          <div style={{ padding: "var(--space-4)" }}>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-dim)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-widest)",
                marginBottom: "var(--space-3)",
              }}
            >
              Webhook Event Log
            </div>
            {webhookEvents.map((evt, i) => (
              <div
                key={i}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--color-bg)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "var(--space-2)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  <span
                    style={{
                      color: "var(--color-success)",
                      fontWeight: "var(--font-weight-bold)",
                    }}
                  >
                    \u25cf {evt.type}
                  </span>
                  <span style={{ color: "var(--color-text-dim)" }}>
                    {evt.time}
                  </span>
                </div>
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "var(--font-size-2xs)",
                    wordBreak: "break-all",
                  }}
                >
                  {JSON.stringify(evt.data)}
                </div>
              </div>
            ))}
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-3)",
              }}
            >
              Webhook verified. Updating seat type to{" "}
              <strong>{selectedPlan === "credits" ? "free" : selectedPlan}</strong>
              {selectedPlan === "credits" && " and adding 100 messages to allowance"}
              .
            </div>
            <button
              onClick={() => advanceGateway()}
              style={btnStyle("primary")}
            >
              Process Webhook \u2192
            </button>
          </div>
        )}

        {/* Step 3: Subscription Active */}
        {gwStep === 3 && (
          <div style={{ padding: "var(--space-4)" }}>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-dim)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-widest)",
                marginBottom: "var(--space-3)",
              }}
            >
              Profile Updated
            </div>
            <div
              style={{
                padding: "var(--space-4)",
                background: "var(--color-bg)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "var(--space-4)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
              }}
            >
              {Object.entries(mockProfile).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "var(--space-1) 0",
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
                  <span style={{ color: "var(--color-text-muted)" }}>{k}</span>
                  <span
                    style={{
                      color:
                        k === "seat_type"
                          ? "var(--color-success)"
                          : "var(--color-text)",
                      fontWeight:
                        k === "seat_type"
                          ? "var(--font-weight-bold)"
                          : "var(--font-weight-normal)",
                    }}
                  >
                    {v === null ? "null" : String(v)}
                  </span>
                </div>
              ))}
            </div>

            {/* Mini Fül gauge */}
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "var(--space-1)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  F\u00fcl remaining
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--font-weight-bold)",
                  }}
                >
                  {remaining} / {seatLimit}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: "var(--radius-full)",
                  background: "var(--color-border-light)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(0, (remaining / seatLimit) * 100)}%`,
                    borderRadius: "var(--radius-full)",
                    background: "var(--color-accent)",
                    transition:
                      "width var(--duration-slow) var(--ease-default)",
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => advanceGateway()}
              style={btnStyle("primary")}
            >
              Open Customer Portal \u2192
            </button>
          </div>
        )}

        {/* Step 4: Customer Portal */}
        {gwStep === 4 && (
          <div style={{ padding: "var(--space-6)", textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0 auto var(--space-3)",
                background: "var(--color-bg-elevated)",
                borderRadius: "var(--radius-full)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users
                size={22}
                strokeWidth={1.5}
                style={{ color: "var(--color-text-muted)" }}
              />
            </div>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-dim)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-widest)",
                marginBottom: "var(--space-1)",
              }}
            >
              Stripe Customer Portal
            </div>
            <div
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-bold)",
                marginBottom: "var(--space-1)",
              }}
            >
              Manage Subscription
            </div>
            <div
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-4)",
              }}
            >
              {mockProfile.stripe_customer_id} \u00b7 F\u00fclkit{" "}
              {selectedPlan === "pro" ? "Pro" : "Standard"}
            </div>
            <div
              style={{
                padding: "var(--space-3) var(--space-4)",
                background: "var(--color-bg)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "var(--space-4)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                Actions available:
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--line-height-relaxed)",
                }}
              >
                &bull; Update payment method
                <br />
                &bull; Change plan (Standard \u2194 Pro)
                <br />
                &bull; View billing history
                <br />
                &bull; Cancel subscription
              </div>
            </div>
            <button
              onClick={() => advanceGateway()}
              style={{
                ...btnStyle("ghost"),
                color: "var(--color-error)",
              }}
            >
              Cancel Subscription \u2192
            </button>
          </div>
        )}

        {/* Step 5: Cancelled */}
        {gwStep === 5 && (
          <div style={{ padding: "var(--space-4)" }}>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-dim)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-widest)",
                marginBottom: "var(--space-3)",
              }}
            >
              Subscription Cancelled
            </div>
            {webhookEvents.map((evt, i) => (
              <div
                key={i}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--color-bg)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "var(--space-2)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  <span
                    style={{
                      color: evt.type.includes("deleted")
                        ? "var(--color-error)"
                        : "var(--color-success)",
                      fontWeight: "var(--font-weight-bold)",
                    }}
                  >
                    \u25cf {evt.type}
                  </span>
                  <span style={{ color: "var(--color-text-dim)" }}>
                    {evt.time}
                  </span>
                </div>
              </div>
            ))}
            <div
              style={{
                padding: "var(--space-3) var(--space-4)",
                background: "var(--color-bg)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "var(--space-4)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "var(--space-1) 0",
                }}
              >
                <span style={{ color: "var(--color-text-muted)" }}>
                  seat_type
                </span>
                <span
                  style={{
                    color: "var(--color-text)",
                    fontWeight: "var(--font-weight-bold)",
                  }}
                >
                  free
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "var(--space-1) 0",
                }}
              >
                <span style={{ color: "var(--color-text-muted)" }}>
                  stripe_subscription_id
                </span>
                <span style={{ color: "var(--color-text-dim)" }}>null</span>
              </div>
            </div>
            <button onClick={resetGateway} style={btnStyle("primary")}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-2)",
                }}
              >
                <RotateCcw size={14} /> Start Over
              </span>
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
