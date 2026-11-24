import { useEffect, useMemo, useState } from "react";

const API = "/api";
const CATEGORIES = ["Food", "Rent", "Transport", "Bills", "Shopping", "Health", "Education", "Entertainment", "Other"];
const SESSION_KEY = "budgetPlannerUser";

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
  catch { return null; }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Cannot reach the backend. Start it with `npm run backend` and try again.");
  }
  let body = {};
  try {
    body = await response.json();
  } catch {
    // Proxies can return an HTML error page instead of the API's JSON response.
  }
  if (!response.ok) {
    if (body.message) throw new Error(body.message);
    if ([502, 503, 504].includes(response.status)) {
      throw new Error("Cannot reach the backend. Start it with `npm run backend` and try again.");
    }
    throw new Error(`Request failed (HTTP ${response.status}). Please try again.`);
  }
  return body;
}

export default function App() {
  const [user, setUser] = useState(readSession);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadUserData(id) {
    const data = await request(`/user/${encodeURIComponent(id)}`);
    setIncome(Number(data.income) || 0);
    setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
  }

  useEffect(() => {
    if (!user?.id) return;
    loadUserData(user.id).catch((error) => {
      setMessage(error.message);
      if (error.message.includes("User not found")) logout();
    });
  // Session identity changes only on sign-in or sign-out.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date?.slice(0, 7) === month),
    [expenses, month],
  );
  const spent = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const remaining = income - spent;
  const currency = (value) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(value || 0);

  async function authenticate(event) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const path = authMode === "signup" ? "/register" : "/login";
      const result = await request(path, { method: "POST", body: JSON.stringify(auth) });
      const nextUser = result.user;
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: nextUser.id, name: nextUser.name, email: nextUser.email }));
      setIncome(Number(nextUser.income) || 0);
      setExpenses(Array.isArray(nextUser.expenses) ? nextUser.expenses : []);
      setUser({ id: nextUser.id, name: nextUser.name, email: nextUser.email });
      setAuth({ name: "", email: "", password: "" });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setIncome(0);
    setExpenses([]);
    setMessage("");
  }

  async function saveData(nextIncome, nextExpenses) {
    if (!user?.id) return;
    setMessage("");
    try {
      const result = await request(`/user/${encodeURIComponent(user.id)}`, {
        method: "PUT",
        body: JSON.stringify({ income: nextIncome, expenses: nextExpenses }),
      });
      setIncome(Number(result.user.income) || 0);
      setExpenses(Array.isArray(result.user.expenses) ? result.user.expenses : []);
    } catch (error) {
      setMessage(error.message);
      await loadUserData(user.id).catch(() => {});
    }
  }

  function saveIncome(event) {
    event.preventDefault();
    const value = Number(event.currentTarget.elements.income.value);
    if (Number.isFinite(value) && value >= 0) saveData(value, expenses);
  }

  function addExpense(event) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || !description.trim()) return;
    const next = [{
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      amount: value, category, description: description.trim(),
      date: new Date().toISOString().slice(0, 10),
    }, ...expenses];
    setAmount("");
    setDescription("");
    saveData(income, next);
  }

  function removeExpense(id) {
    saveData(income, expenses.filter((expense) => expense.id !== id));
  }

  if (!user) return (
    <main className="react-auth-wrap">
      <section className="react-auth-card">
        <p className="react-eyebrow">YOUR MONEY, IN FOCUS</p>
        <h1>{authMode === "login" ? "Welcome to BudgetPlanner" : "Create your account"}</h1>
        <p className="react-auth-intro">Sign in to manage your budget securely across sessions.</p>
        {message && <p className="react-message" role="alert">{message}</p>}
        <form className="react-auth-form" onSubmit={authenticate}>
          {authMode === "signup" && <label>Name<input autoComplete="name" value={auth.name} onChange={(e) => setAuth({ ...auth, name: e.target.value })} required /></label>}
          <label>Email<input type="email" autoComplete="email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} required /></label>
          <label>Password
            <span className="react-password-field">
              <input type={showPassword ? "text" : "password"} autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength="6" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} required />
              <button type="button" className="react-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button>
            </span>
          </label>
          <button type="submit" disabled={busy}>{busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="react-auth-switch" type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setMessage(""); }}>
          {authMode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );

  return (
    <main className="react-budget-app">
      <header className="react-budget-header">
        <div><p className="react-eyebrow">YOUR MONEY, IN FOCUS</p><h1>Budget Planner</h1><p>Plan your month and keep spending on track.</p></div>
        <div className="react-header-actions"><span>Hi, {user.name}</span><button type="button" className="react-logout" onClick={logout}>Sign out</button><label className="react-month">Month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></div>
      </header>
      {message && <p className="react-message" role="alert">{message}</p>}
      <form className="react-income-card" onSubmit={saveIncome}>
        <div><p className="react-eyebrow">MONTHLY PLAN</p><h2>Set your monthly income</h2></div>
        <div className="react-inline-form"><label className="react-sr-only" htmlFor="monthly-income">Monthly income in rupees</label><input id="monthly-income" name="income" type="number" min="0" step="1" defaultValue={income || ""} placeholder="e.g. 50000" required key={income} /><button type="submit">Save income</button></div>
      </form>
      <section className="react-summary" aria-label="Monthly financial summary">
        <article><span>Monthly income</span><strong>{currency(income)}</strong></article><article><span>Spent this month</span><strong>{currency(spent)}</strong></article><article><span>Money remaining</span><strong className={remaining < 0 ? "react-negative" : ""}>{currency(remaining)}</strong></article><article><span>Savings rate</span><strong>{income > 0 ? `${Math.round((remaining / income) * 100)}%` : "0%"}</strong></article>
      </section>
      <section className="react-panel">
        <div className="react-section-heading"><div><p className="react-eyebrow">TRANSACTION</p><h2>Add an expense</h2></div></div>
        <form className="react-expense-form" onSubmit={addExpense}>
          <label>Amount (₹)<input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required /></label>
          <label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you spend on?" maxLength={100} required /></label>
          <button type="submit">Add expense</button>
        </form>
      </section>
      <section className="react-panel">
        <div className="react-section-heading"><div><p className="react-eyebrow">ACTIVITY</p><h2>Expenses</h2></div><span className="react-count">{monthExpenses.length} this month</span></div>
        {monthExpenses.length === 0 ? <p className="react-empty">No expenses for this month yet. Add one above to get started.</p> : (
          <ul className="react-expense-list">{monthExpenses.map((expense) => (
            <li key={expense.id}><div className="react-expense-icon" aria-hidden="true">{(expense.category || "?").slice(0, 1)}</div><div className="react-expense-description"><strong>{expense.description}</strong><span>{expense.category} · {new Date(`${expense.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div><strong className="react-expense-amount">−{currency(expense.amount)}</strong><button type="button" className="react-remove" onClick={() => removeExpense(expense.id)} aria-label={`Delete ${expense.description}`}>Delete</button></li>
          ))}</ul>
        )}
      </section>
    </main>
  );
}
