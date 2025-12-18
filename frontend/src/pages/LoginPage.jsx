import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "student"
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // If already signed in, send to home/dashboard
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", form);
      login({ user: res.data.user, token: res.data.token });

      if (res.data.user.role === "student") navigate("/student");
      if (res.data.user.role === "consultant") navigate("/consultant");
      if (res.data.user.role === "representative") navigate("/representative");
      if (res.data.user.role === "owner") navigate("/owner");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="layout">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="section-title">
          <div>
            <div className="eyebrow">Welcome back</div>
            <h2 style={{ margin: 0 }}>Log in</h2>
          </div>
          <a className="btn btn-secondary" href="/register">
            Create account
          </a>
        </div>
        <form onSubmit={handleSubmit} className="form-grid" style={{ display: "grid", gap: 14 }}>
          <label>
            Email
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type="password"
              required
            />
          </label>
          <label>
            Role
      <select name="role" value={form.role} onChange={handleChange}>
        <option value="student">Student</option>
        <option value="consultant">Consultant</option>
        <option value="representative">Local representative</option>
        <option value="owner">Owner</option>
      </select>
    </label>
          {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
          <button className="btn btn-primary" type="submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
