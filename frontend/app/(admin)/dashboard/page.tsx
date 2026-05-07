"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(storedUser);

    // block non-admin users
    if (parsed.role !== "admin") {
      router.push("/home");
      return;
    }

    setUser(parsed);
  }, []);

  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Admin Dashboard</h1>

      <p>Welcome, <b>{user.name || user.email}</b></p>

      <div style={{ marginTop: 20 }}>
        <h3>Quick Actions</h3>

        <ul>
          <li>Manage Users</li>
          <li>View Analytics</li>
          <li>System Settings</li>
        </ul>
      </div>

      <button
        onClick={() => {
          localStorage.clear();
          router.push("/login");
        }}
        style={{
          marginTop: 20,
          padding: 10,
          background: "red",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}