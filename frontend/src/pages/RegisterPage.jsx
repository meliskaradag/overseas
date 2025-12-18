import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student"
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/register", form);
      login({ user: res.data.user, token: res.data.token });
      if (res.data.user.role === "student") navigate("/student");
      if (res.data.user.role === "consultant") navigate("/consultant");
      if (res.data.user.role === "representative") navigate("/representative");
      if (res.data.user.role === "owner") navigate("/owner");
    } catch (err) {
      setError(err.response?.data?.message || "Sign-up failed");
    }
  };

  return (
    <div className="layout">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="section-title">
          <div>
            <div className="eyebrow">Create account</div>
            <h2 style={{ margin: 0 }}>Join the platform</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="form-grid" style={{ display: "grid", gap: 14 }}>
          <label>
            Full name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
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
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
