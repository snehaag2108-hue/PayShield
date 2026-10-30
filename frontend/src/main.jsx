
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  CircleDollarSign,
  RefreshCw,
  Zap,
  SlidersHorizontal,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import './style.css';

// Backend API URL
const API = 'http://127.0.0.1:8000';

function App() {
  const [health, setHealth] = useState({
    mode: 'connecting'
  });

  const [budget, setBudget] = useState(2);
  const [amount, setAmount] = useState(1200);
  const [hour, setHour] = useState(2);
  const [deviceNew, setDeviceNew] = useState(true);
  const [velocity, setVelocity] = useState(4);
  const [geo, setGeo] = useState(0.55);
  const [avg, setAvg] = useState(500);

  const [result, setResult] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Check backend status
  async function getHealth() {
    try {
      const response = await fetch(`${API}/health`);

      if (!response.ok) {
        throw new Error(`Health API returned ${response.status}`);
      }

      const data = await response.json();
      setHealth(data);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealth({ mode: 'backend offline' });
    }
  }

  // Fetch dashboard metrics
  async function refresh() {
    try {
      const response = await fetch(`${API}/metrics`);

      if (!response.ok) {
        throw new Error(`Metrics API returned ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Metrics request failed:', err);
    }
  }

  useEffect(() => {
    getHealth();
    refresh();
  }, []);

  // Update friction budget
  async function saveBudget(value) {
    setBudget(value);
    setError('');

    try {
      const response = await fetch(`${API}/policy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          friction_budget: value,
          step_up_cost: 8,
          false_block_cost: 40,
          verification_success_rate: 0.85
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          `Policy API Error ${response.status}: ${message}`
        );
      }

      await refresh();
    } catch (err) {
      console.error('Policy update failed:', err);
      setError(err.message || 'Could not update policy.');
    }
  }

  // Score a transaction
  async function score() {
    setBusy(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Number(amount),
          hour: Number(hour),
          device_new: deviceNew,
          velocity_5m: Number(velocity),
          geo_deviation: Number(geo),
          customer_avg_amount: Number(avg)
        })
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `API Error ${response.status}: ${responseText}`
        );
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          'Backend returned an invalid JSON response.'
        );
      }

      if (
        !data.action ||
        data.risk_score === undefined
      ) {
        throw new Error(
          'Unexpected response from backend. Check the /score API schema.'
        );
      }

      setResult(data);
      await refresh();

    } catch (err) {
      console.error('Transaction scoring failed:', err);

      if (err instanceof TypeError) {
        setError(
          'Backend request failed. Check that the backend is running and CORS is configured.'
        );
      } else {
        setError(err.message || 'Unable to score transaction.');
      }
    } finally {
      setBusy(false);
    }
  }

  // Simulate 300 transactions
  async function stress() {
    setBusy(true);
    setError('');

    try {
      const response = await fetch(
        `${API}/simulate?count=300`,
        { method: 'POST' }
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `Simulation API Error ${response.status}: ${responseText}`
        );
      }

      const data = JSON.parse(responseText);

      setMetrics({
        actions: data.actions,
        logged_transactions: data.count,
        recent_transactions: data.transactions,
        mode: data.mode,
        notice: data.notice,
        estimated_blocked_amount: data.estimated_blocked_amount,
        average_risk: data.average_risk
      });

    } catch (err) {
      console.error('Stress test failed:', err);
      setError(err.message || 'Unable to run stress test.');
    } finally {
      setBusy(false);
    }
  }

  const actions = metrics?.actions || {
    ALLOW: 0,
    'STEP-UP': 0,
    BLOCK: 0
  };

  const pie = [
    {
      name: 'ALLOW',
      value: actions.ALLOW || 0,
      color: '#20b486'
    },
    {
      name: 'STEP-UP',
      value: actions['STEP-UP'] || 0,
      color: '#e5a23d'
    },
    {
      name: 'BLOCK',
      value: actions.BLOCK || 0,
      color: '#ef6471'
    }
  ];

  const isOffline = health.mode === 'backend offline';

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="logo">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h1>PayShield</h1>
            <p>Adaptive Fraud Defense &amp; Decision Optimization</p>
          </div>
        </div>

        <div className="status">
          <span className={`dot ${isOffline ? 'bad' : ''}`} />

          {health.mode === 'trained-model'
            ? 'Trained model'
            : health.mode === 'demo-heuristic'
              ? 'Demo mode'
              : isOffline
                ? 'Backend offline'
                : 'Connecting...'}

          <span className="tag">PROTOTYPE</span>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">
              <Zap size={14} />
              REAL-TIME RISK INTELLIGENCE
            </div>

            <h2>
              Detect the risk.
              <br />
              <em>Optimize the response.</em>
            </h2>

            <p>
              Every transaction deserves the right response
              — not just a yes or no.
            </p>
          </div>

          <div className="hero-mark">
            <ShieldCheck size={74} />
            <span>PAYMENT DEFENSE SYSTEM</span>
          </div>
        </section>

        <div className="notice">
          <Activity size={17} />
          <span>
            <b>
              {health.mode === 'trained-model'
                ? 'Trained dataset model active'
                : 'Demo heuristic active.'}
            </b>{' '}
            {health.mode === 'trained-model'
              ? 'Validate metrics on held-out data before reporting performance.'
              : 'Demo scores are illustrative, not trained fraud predictions. No real payment or OTP is processed.'}
          </span>
        </div>

        <section className="kpis">
          <Kpi
            icon={<Activity />}
            label="Transactions logged"
            value={metrics?.logged_transactions ?? 0}
            sub="Recent session"
          />

          <Kpi
            icon={<ShieldAlert />}
            label="Blocked amount"
            value={
              metrics?.estimated_blocked_amount != null
                ? `₹${Number(
                    metrics.estimated_blocked_amount
                  ).toLocaleString('en-IN')}`
                : '—'
            }
            sub="Stress-test estimate"
          />

          <Kpi
            icon={<CircleDollarSign />}
            label="Average risk"
            value={
              metrics?.average_risk != null
                ? `${metrics.average_risk}%`
                : '—'
            }
            sub="Simulated transactions"
          />

          <Kpi
            icon={<SlidersHorizontal />}
            label="Friction budget"
            value={`${budget}%`}
            sub="Configurable policy"
          />
        </section>

        <div className="columns">
          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">
                  01 / WHAT-IF SIMULATOR
                </span>
                <h3>Score a transaction</h3>
              </div>

              <span className="pill">Manual input</span>
            </div>

            <div className="form-grid">
              <Field label="Transaction amount (₹)">
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>

              <Field label="Customer average (₹)">
                <input
                  type="number"
                  min="0"
                  value={avg}
                  onChange={(e) => setAvg(e.target.value)}
                />
              </Field>

              <Field label="Transaction hour (0–23)">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                />
              </Field>

              <Field label="Transactions in last 5 min">
                <input
                  type="number"
                  min="0"
                  value={velocity}
                  onChange={(e) => setVelocity(e.target.value)}
                />
              </Field>
            </div>

            <div className="toggle-row">
              <div>
                <b>New / unfamiliar device</b>
                <small>Device not seen in normal behaviour</small>
              </div>

              <button
                type="button"
                className={`toggle ${deviceNew ? 'on' : ''}`}
                onClick={() => setDeviceNew(!deviceNew)}
                aria-label="Toggle new device"
              >
                <span />
              </button>
            </div>

            <div className="range-row">
              <div>
                <b>Geographic deviation</b>
                <strong>{Number(geo).toFixed(2)}</strong>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={geo}
                onChange={(e) => setGeo(Number(e.target.value))}
              />

              <div className="range-labels">
                <span>Usual location</span>
                <span>Highly unusual</span>
              </div>
            </div>

            <button
              type="button"
              className="primary"
              onClick={score}
              disabled={busy || isOffline}
            >
              <ShieldCheck size={18} />
              {busy ? 'Processing...' : 'Analyze transaction'}
              <ArrowUpRight size={17} />
            </button>

            {error && (
              <p className="error">
                {error}
              </p>
            )}

            {result && (
              <div className="result">
                <div className="result-head">
                  <div>
                    <small>DECISION</small>
                    <h2
                      className={String(result.action)
                        .toLowerCase()
                        .replace('-', '')}
                    >
                      {result.action}
                    </h2>
                  </div>

                  <div className="risk">
                    <b>{result.risk_score}%</b>
                    <small>Fraud risk score</small>
                  </div>
                </div>

                <div className="meter">
                  <span
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, Number(result.risk_score))
                      )}%`
                    }}
                  />
                </div>

                <p className="result-note">
                  {result.action === 'ALLOW'
                    ? 'Low-risk pattern: proceed in this prototype.'
                    : result.action === 'STEP-UP'
                      ? 'Uncertain risk: simulated extra verification is recommended.'
                      : 'High-risk pattern: transaction blocked by prototype policy.'}
                </p>

                <b>Risk factors</b>

                <ul>
                  {(result.risk_factors || []).map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                </ul>

                <div className="costs">
                  {Object.entries(result.expected_costs || {}).map(
                    ([key, value]) => (
                      <div key={key}>
                        <small>{key} expected cost</small>
                        <b>₹{value}</b>
                      </div>
                    )
                  )}
                </div>

                <small className="muted">
                  {result.transaction_id || 'Transaction'} ·{' '}
                  {result.mode || 'Demo'}
                </small>
              </div>
            )}
          </section>

          <section className="panel policy-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">
                  02 / POLICY CONTROL
                </span>
                <h3>Customer friction budget</h3>
              </div>

              <SlidersHorizontal size={21} />
            </div>

            <p className="muted">
              Set the maximum target for additional verification
              of legitimate customers. The prototype updates its
              policy when the budget changes.
            </p>

            <div className="budget-options">
              {[1, 2, 3].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={budget === value ? 'selected' : ''}
                  onClick={() => saveBudget(value)}
                  disabled={busy}
                >
                  <b>{value}%</b>
                  <small>
                    {value === 1
                      ? 'Strict'
                      : value === 2
                        ? 'Balanced'
                        : 'Flexible'}
                  </small>
                </button>
              ))}
            </div>

            <div className="policy-callout">
              <div className="callout-icon">
                <RefreshCw size={19} />
              </div>

              <div>
                <b>Adaptive policy</b>
                <p>
                  Changing the budget updates policy settings.
                  The actual effect depends on the backend implementation.
                </p>
              </div>
            </div>

            <div className="panel-title stress-title">
              <div>
                <span className="eyebrow">03 / JUDGE MODE</span>
                <h3>Stress-test simulation</h3>
              </div>
            </div>

            <p className="muted">
              Replay 300 synthetic transactions and inspect the
              distribution of ALLOW, STEP-UP and BLOCK actions.
            </p>

            <button
              type="button"
              className="secondary"
              onClick={stress}
              disabled={busy || isOffline}
            >
              <Activity size={17} />
              {busy
                ? 'Running...'
                : 'Run 300-transaction stress test'}
            </button>

            <div className="chart-wrap">
              <div className="chart-head">
                <b>Decision distribution</b>
                <small>
                  {metrics?.logged_transactions ?? 0} records
                </small>
              </div>

              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {pie.map((item) => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="legend">
                {pie.map((item) => (
                  <span key={item.name}>
                    <i style={{ background: item.color }} />
                    {item.name}
                    <b>{item.value}</b>
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="panel feed">
          <div className="panel-title">
            <div>
              <span className="eyebrow">04 / AUDIT VIEW</span>
              <h3>Recent decisions</h3>
            </div>

            <button
              type="button"
              className="refresh"
              onClick={refresh}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Amount</th>
                  <th>Risk</th>
                  <th>Decision</th>
                  <th>Reason</th>
                </tr>
              </thead>

              <tbody>
                {(metrics?.recent_transactions || [])
                  .slice(0, 8)
                  .map((transaction, index) => (
                    <tr
                      key={transaction.transaction_id || index}
                    >
                      <td>
                        {transaction.transaction_id || '—'}
                      </td>

                      <td>
                        ₹
                        {Number(
                          transaction.amount || 0
                        ).toLocaleString('en-IN')}
                      </td>

                      <td>
                        <span className="risk-number">
                          {(
                            Number(
                              transaction.fraud_probability || 0
                            ) * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </td>

                      <td>
                        <span
                          className={`decision ${String(
                            transaction.action || ''
                          )
                            .toLowerCase()
                            .replace('-', '')}`}
                        >
                          {transaction.action || '—'}
                        </span>
                      </td>

                      <td>
                        {(transaction.risk_factors || [])
                          .slice(0, 2)
                          .join(', ') || '—'}
                      </td>
                    </tr>
                  ))}

                {!(metrics?.recent_transactions || []).length && (
                  <tr>
                    <td colSpan="5" className="empty">
                      Score a transaction or run the stress test
                      to populate this table.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer>
          <div className="brand mini">
            <div className="logo">
              <ShieldCheck size={18} />
            </div>
            <b>PayShield</b>
          </div>

          <span>
            Hackathon prototype · Simulated data only ·
            Not connected to a payment processor
          </span>
        </footer>
      </main>
    </div>
  );
}

function Kpi({ icon, label, value, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-icon">{icon}</div>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{sub}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

createRoot(document.getElementById('root')).render(<App />);
