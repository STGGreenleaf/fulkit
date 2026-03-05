import { useState, useMemo } from "react";

// ─── Input Component ───
const N = ({ label, value, onChange, prefix, suffix, small, tooltip }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }} title={tooltip}>
    <span style={{ fontSize: 11, color: "#8A8884", fontWeight: 500, width: small ? 60 : 100, flexShrink: 0 }}>{label}</span>
    <div style={{
      display: "flex", alignItems: "center", gap: 2,
      background: "#fff", border: "1px solid #D4D2CE", borderRadius: 6,
      padding: "4px 8px", width: small ? 70 : 90,
    }}>
      {prefix && <span style={{ fontSize: 12, color: "#A3A19C" }}>{prefix}</span>}
      <input
        type="number" value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        style={{
          border: "none", outline: "none", background: "transparent",
          width: "100%", fontSize: 13, fontWeight: 700, fontFamily: "monospace",
          color: "#2A2A28", textAlign: "right",
        }}
      />
      {suffix && <span style={{ fontSize: 11, color: "#A3A19C" }}>{suffix}</span>}
    </div>
  </div>
);

export default function OwnerPortal() {
  const [tab, setTab] = useState("pyramid");

  // Pyramid inputs
  const [founders, setFounders] = useState(5);
  const [g1Inv, setG1Inv] = useState(5);
  const [g2Inv, setG2Inv] = useState(3);
  const [g3Inv, setG3Inv] = useState(3);
  const [g4Inv, setG4Inv] = useState(2);
  const [g1Price, setG1Price] = useState(3);
  const [g2Price, setG2Price] = useState(5);
  const [g3Price, setG3Price] = useState(7);
  const [g4Price, setG4Price] = useState(9);
  const [cap, setCap] = useState(500);
  const [costPerMsg, setCostPerMsg] = useState(3); // cents
  const [avgMsgsDay, setAvgMsgsDay] = useState(15);
  const [referralCut, setReferralCut] = useState(25); // % Fülkit keeps
  const [referralReward, setReferralReward] = useState(1); // $ credit per invite signup

  const calc = useMemo(() => {
    const gens = [];
    let prev = founders;

    // Gen 0
    gens.push({ gen: 0, label: "Founder's Circle", users: founders, price: 0, invEach: g1Inv });

    // Gen 1-4
    const invites = [g1Inv, g2Inv, g3Inv, g4Inv];
    const prices = [g1Price, g2Price, g3Price, g4Price];
    const labels = ["Inner Ring", "Second Wave", "Third Wave", "Open Market"];

    let total = founders;
    for (let i = 0; i < 4; i++) {
      const raw = prev * invites[i];
      const capped = Math.max(0, Math.min(raw, cap - total));
      gens.push({
        gen: i + 1,
        label: labels[i],
        users: capped,
        usersRaw: raw,
        price: prices[i],
        invEach: invites[i + 1] || 0,
      });
      total += capped;
      prev = capped;
    }

    const totalUsers = total;
    const paidUsers = totalUsers - founders;
    const monthlyRev = gens.reduce((s, g) => s + g.users * g.price, 0);

    // Costs
    const costPerUser = (costPerMsg / 100) * avgMsgsDay * 30;
    const totalCost = totalUsers * costPerUser;
    const supabaseCost = totalUsers < 100 ? 25 : totalUsers < 1000 ? 75 : 200;

    // Referral economics
    const totalReferrals = paidUsers; // every paid user was referred by someone
    const totalRewardsPaid = totalReferrals * referralReward;
    const fulkitCutFromRewards = totalRewardsPaid * (referralCut / 100);
    const userRewards = totalRewardsPaid - fulkitCutFromRewards;

    const netRev = monthlyRev - totalCost - supabaseCost;
    const netWithRewards = netRev - userRewards;

    return {
      gens, totalUsers, paidUsers, monthlyRev,
      costPerUser: Math.round(costPerUser * 100) / 100,
      totalCost: Math.round(totalCost),
      supabaseCost,
      totalRewardsPaid: Math.round(totalRewardsPaid),
      fulkitCutFromRewards: Math.round(fulkitCutFromRewards),
      userRewards: Math.round(userRewards),
      netRev: Math.round(netRev),
      netWithRewards: Math.round(netWithRewards),
      waitlist: gens.reduce((s, g) => s + ((g.usersRaw || 0) - g.users), 0),
    };
  }, [founders, g1Inv, g2Inv, g3Inv, g4Inv, g1Price, g2Price, g3Price, g4Price, cap, costPerMsg, avgMsgsDay, referralCut, referralReward]);

  const maxUsers = Math.max(...calc.gens.map(g => g.users), 1);

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "#F0EEEB",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#2A2A28",
    }}>
      <style>{`
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 1; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #D4D2CE; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "14px 24px", borderBottom: "1px solid #E5E3DF",
        display: "flex", alignItems: "center", gap: 10, background: "#F7F5F2",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, background: "#2A2A28",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#F0EEEB", fontSize: 10, fontWeight: 800,
        }}>F</div>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>Fülkit</span>
        <span style={{ color: "#D4D2CE", margin: "0 4px" }}>|</span>
        <span style={{ fontSize: 12, color: "#8A8884", fontWeight: 600 }}>Owner Portal</span>

        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          {["pyramid", "users", "settings"].map(t => (
            <div key={t} onClick={() => setTab(t)} style={{
              padding: "5px 12px", borderRadius: 6, cursor: "pointer",
              background: tab === t ? "#2A2A28" : "transparent",
              color: tab === t ? "#F0EEEB" : "#8A8884",
              fontSize: 12, fontWeight: 600, textTransform: "capitalize",
            }}>{t}</div>
          ))}
        </div>
      </div>

      {tab === "pyramid" && (
        <div style={{ display: "flex", height: "calc(100vh - 49px)" }}>

          {/* LEFT: Compact inputs */}
          <div style={{
            width: 300, minWidth: 300, borderRight: "1px solid #E5E3DF",
            padding: "16px", overflowY: "auto", background: "#F7F5F2",
          }}>

            <div style={{ fontSize: 11, fontWeight: 700, color: "#2A2A28", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              Generations
            </div>
            <div style={{ fontSize: 10, color: "#A3A19C", marginBottom: 12, lineHeight: 1.4 }}>
              Each gen = one step from you. Gen 0 is your people (free). Each gen's users invite the next wave.
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: "12px", border: "1px solid #E5E3DF", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2A2A28", marginBottom: 8 }}>Gen 0 — Founder's Circle</div>
              <N label="Free seats" value={founders} onChange={setFounders} tooltip="People you invite personally. Free forever." />
              <N label="Each invites" value={g1Inv} onChange={setG1Inv} tooltip="How many people each founder seat can invite" />
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: "12px", border: "1px solid #E5E3DF", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2A2A28", marginBottom: 8 }}>Gen 1 — Inner Ring</div>
              <N label="Price" value={g1Price} onChange={setG1Price} prefix="$" suffix="/mo" tooltip="Monthly price for users invited by your circle" />
              <N label="Each invites" value={g2Inv} onChange={setG2Inv} tooltip="How many people each Gen 1 user can invite" />
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: "12px", border: "1px solid #E5E3DF", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2A2A28", marginBottom: 8 }}>Gen 2 — Second Wave</div>
              <N label="Price" value={g2Price} onChange={setG2Price} prefix="$" suffix="/mo" tooltip="Monthly price for Gen 2" />
              <N label="Each invites" value={g3Inv} onChange={setG3Inv} tooltip="How many people each Gen 2 user can invite" />
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: "12px", border: "1px solid #E5E3DF", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2A2A28", marginBottom: 8 }}>Gen 3 — Third Wave</div>
              <N label="Price" value={g3Price} onChange={setG3Price} prefix="$" suffix="/mo" tooltip="Monthly price for Gen 3" />
              <N label="Each invites" value={g4Inv} onChange={setG4Inv} tooltip="How many people each Gen 3 user can invite" />
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: "12px", border: "1px solid #E5E3DF", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2A2A28", marginBottom: 8 }}>Gen 4 — Open Market</div>
              <N label="Price" value={g4Price} onChange={setG4Price} prefix="$" suffix="/mo" tooltip="Full price for the widest wave" />
            </div>

            <div style={{ height: 1, background: "#E5E3DF", margin: "12px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "#2A2A28", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              Economics
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: "12px", border: "1px solid #E5E3DF", marginBottom: 10 }}>
              <N label="User cap" value={cap} onChange={setCap} tooltip="Max total users across all generations" />
              <N label="Cost/msg" value={costPerMsg} onChange={setCostPerMsg} suffix="¢" tooltip="Average AI API cost per message in cents" />
              <N label="Avg msgs/day" value={avgMsgsDay} onChange={setAvgMsgsDay} tooltip="Average messages per user per day" />
            </div>

            <div style={{ height: 1, background: "#E5E3DF", margin: "12px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "#2A2A28", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
              Referral Engine
            </div>
            <div style={{ fontSize: 10, color: "#A3A19C", marginBottom: 10, lineHeight: 1.4 }}>
              When someone's invite signs up, the inviter earns a reward. Fülkit takes a cut to fund growth.
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: "12px", border: "1px solid #E5E3DF" }}>
              <N label="Reward" value={referralReward} onChange={setReferralReward} prefix="$" tooltip="Credit earned per successful referral signup" />
              <N label="Fülkit cut" value={referralCut} onChange={setReferralCut} suffix="%" tooltip="Percentage of referral reward Fülkit retains to fund operations" />
              <div style={{ fontSize: 10, color: "#A3A19C", marginTop: 6, lineHeight: 1.4 }}>
                Inviter gets ${(referralReward * (1 - referralCut / 100)).toFixed(2)} credit per signup.
                Fülkit keeps ${(referralReward * referralCut / 100).toFixed(2)} per signup.
              </div>
            </div>
          </div>

          {/* RIGHT: Visualization */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

            {/* KPI Strip */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 20,
            }}>
              {[
                { label: "Users", value: calc.totalUsers, color: "#2A2A28" },
                { label: "Paid", value: calc.paidUsers, color: "#2A2A28" },
                { label: "Revenue", value: `$${calc.monthlyRev}`, color: "#22C55E" },
                { label: "AI Cost", value: `$${calc.totalCost}`, color: "#DC2626" },
                { label: "Rewards Out", value: `$${calc.userRewards}`, color: "#F59E0B" },
                { label: "Net", value: `${calc.netWithRewards >= 0 ? "+" : ""}$${calc.netWithRewards}`, color: calc.netWithRewards >= 0 ? "#22C55E" : "#DC2626" },
              ].map((kpi, i) => (
                <div key={i} style={{
                  background: "#fff", borderRadius: 10, padding: "10px 12px",
                  border: "1px solid #E5E3DF", textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, color: "#A3A19C", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{kpi.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: "#A3A19C", marginTop: 2 }}>/mo</div>
                </div>
              ))}
            </div>

            {/* Pyramid Bars */}
            <div style={{
              background: "#fff", borderRadius: 12, padding: "18px 20px",
              border: "1px solid #E5E3DF", marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Generation Breakdown</div>
              {calc.gens.map((g, i) => {
                const pct = maxUsers > 0 ? (g.users / maxUsers) * 100 : 0;
                const rev = g.users * g.price;
                const cost = Math.round(g.users * calc.costPerUser);
                const profit = rev - cost;
                const shade = Math.min(40 + i * 18, 90);
                return (
                  <div key={i} style={{ marginBottom: i < calc.gens.length - 1 ? 10 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#A3A19C", fontFamily: "monospace", width: 14 }}>G{g.gen}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: `hsl(30, 5%, ${shade}%)` }}>{g.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 11, fontFamily: "monospace" }}>
                        <span style={{ color: "#5A5854" }}>{g.users} users</span>
                        <span style={{ color: g.price === 0 ? "#22C55E" : "#2A2A28", fontWeight: 700 }}>
                          {g.price === 0 ? "FREE" : `$${g.price}/mo`}
                        </span>
                        <span style={{ color: "#22C55E", fontWeight: 600, width: 60, textAlign: "right" }}>${rev}</span>
                        <span style={{ color: "#DC2626", fontWeight: 600, width: 55, textAlign: "right" }}>-${cost}</span>
                        <span style={{
                          color: profit >= 0 ? "#22C55E" : "#DC2626",
                          fontWeight: 700, width: 60, textAlign: "right",
                        }}>
                          {profit >= 0 ? "+" : ""}${profit}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 20, borderRadius: 4, background: "#F5F3F0", overflow: "hidden", position: "relative" }}>
                      <div style={{
                        width: `${Math.max(pct, 2)}%`, height: "100%", borderRadius: 4,
                        background: `hsl(30, 5%, ${shade}%)`,
                        transition: "width 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                      }} />
                    </div>
                  </div>
                );
              })}
              {calc.waitlist > 0 && (
                <div style={{
                  marginTop: 10, padding: "6px 10px", borderRadius: 6,
                  background: "#FEF3C7", fontSize: 11, color: "#92400E",
                }}>
                  {calc.waitlist} potential users exceed cap → waitlist
                </div>
              )}
            </div>

            {/* Flow narrative */}
            <div style={{
              background: "#fff", borderRadius: 12, padding: "18px 20px",
              border: "1px solid #E5E3DF", marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>The Flow</div>
              <div style={{ fontSize: 12, color: "#5A5854", lineHeight: 1.8, fontFamily: "monospace" }}>
                {calc.gens.map((g, i) => {
                  if (i === 0) return (
                    <div key={i}>
                      <span style={{ color: "#2A2A28", fontWeight: 700 }}>You</span> → {g.users} free seats (Founder's Circle)
                    </div>
                  );
                  const prev = calc.gens[i - 1];
                  return (
                    <div key={i} style={{ paddingLeft: i * 16 }}>
                      <span style={{ color: "#A3A19C" }}>└</span> {prev.users} × {prev.invEach} invites = <span style={{ fontWeight: 700 }}>{g.users}</span> @ <span style={{ color: "#22C55E", fontWeight: 700 }}>${g.price}/mo</span> = <span style={{ fontWeight: 700 }}>${g.users * g.price}/mo</span>
                    </div>
                  );
                })}
                <div style={{ borderTop: "1px solid #E5E3DF", marginTop: 10, paddingTop: 10 }}>
                  <span style={{ fontWeight: 700 }}>Total: {calc.totalUsers} users → ${calc.monthlyRev}/mo revenue</span>
                </div>
              </div>
            </div>

            {/* Referral Economics */}
            <div style={{
              background: "#fff", borderRadius: 12, padding: "18px 20px",
              border: "1px solid #E5E3DF", marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Referral Engine</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ padding: "10px", borderRadius: 8, background: "#F5F3F0", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#A3A19C", fontWeight: 600, marginBottom: 4 }}>Referrals</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{calc.paidUsers}</div>
                  <div style={{ fontSize: 10, color: "#A3A19C" }}>signups via invite</div>
                </div>
                <div style={{ padding: "10px", borderRadius: 8, background: "#F5F3F0", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#A3A19C", fontWeight: 600, marginBottom: 4 }}>Rewards Paid</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace", color: "#F59E0B" }}>${calc.userRewards}</div>
                  <div style={{ fontSize: 10, color: "#A3A19C" }}>{100 - referralCut}% to evangelists</div>
                </div>
                <div style={{ padding: "10px", borderRadius: 8, background: "#F5F3F0", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#A3A19C", fontWeight: 600, marginBottom: 4 }}>Fülkit Keeps</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace", color: "#22C55E" }}>${calc.fulkitCutFromRewards}</div>
                  <div style={{ fontSize: 10, color: "#A3A19C" }}>{referralCut}% to fund growth</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: "#8A8884", lineHeight: 1.5 }}>
                Every referral signup: inviter earns <strong>${(referralReward * (1 - referralCut / 100)).toFixed(2)}</strong> in credits (offsets their subscription).
                Fülkit retains <strong>${(referralReward * referralCut / 100).toFixed(2)}</strong> per signup to cover ops.
                Evangelists who refer {Math.ceil(g1Price / (referralReward * (1 - referralCut / 100)))}+ users earn back their full subscription.
              </div>
            </div>

            {/* P&L Summary */}
            <div style={{
              background: "#2A2A28", borderRadius: 12, padding: "18px 20px", color: "#F0EEEB",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Monthly P&L</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "monospace", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#A3A19C" }}>Subscription revenue</span>
                  <span style={{ color: "#22C55E", fontWeight: 700 }}>+${calc.monthlyRev}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#A3A19C" }}>AI API costs ({calc.totalUsers} users × ${calc.costPerUser}/mo)</span>
                  <span style={{ color: "#DC2626" }}>-${calc.totalCost}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#A3A19C" }}>Supabase hosting</span>
                  <span style={{ color: "#DC2626" }}>-${calc.supabaseCost}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#A3A19C" }}>Referral rewards out ({100 - referralCut}%)</span>
                  <span style={{ color: "#F59E0B" }}>-${calc.userRewards}</span>
                </div>
                <div style={{ height: 1, background: "#3A3A38", margin: "4px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>Net profit</span>
                  <span style={{
                    fontWeight: 800, fontSize: 16,
                    color: calc.netWithRewards >= 0 ? "#22C55E" : "#DC2626",
                  }}>
                    {calc.netWithRewards >= 0 ? "+" : ""}${calc.netWithRewards}/mo
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#5A5854", marginTop: 4 }}>
                  {calc.netWithRewards >= 0
                    ? `Profitable. You clear $${calc.netWithRewards}/mo after all costs.`
                    : `You float $${Math.abs(calc.netWithRewards)}/mo. ${Math.ceil(Math.abs(calc.netWithRewards) / (g3Price || 7))} more paid users to break even.`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div style={{ padding: 32, textAlign: "center", color: "#A3A19C" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#5A5854" }}>User Management</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Invite tree, generation tags, usage per user — coming soon</div>
        </div>
      )}

      {tab === "settings" && (
        <div style={{ padding: 32, textAlign: "center", color: "#A3A19C" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚙</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#5A5854" }}>Portal Settings</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>API keys, billing alerts, feature flags — coming soon</div>
        </div>
      )}
    </div>
  );
}
