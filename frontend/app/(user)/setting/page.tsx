"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import BottomNavbar from "@/app/(user)/components/BottomNavbar";
import { API_URL } from "@/lib/api";

// ─── FIREBASE ──────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ─── ICONS ───────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconStore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);
const IconGlobe = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);
const IconLogout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconInfo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconWarning = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface SettingItem {
  label: string;
  value?: string;
  action?: () => void;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
  isSpecial?: boolean;
}

interface SettingSection {
  title: string;
  icon: React.ReactNode;
  items: SettingItem[];
}

interface StaffMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function SettingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    provider?: string;
    role?: string;
    gender?: string;
    contact?: string;
    business_id?: string;
  }>({ name: "", email: "", provider: "local", role: "user", gender: "", contact: "", business_id: "" });
  const [business, setBusiness] = useState<{
    name: string;
    description: string;
    type: string;
    business_id?: string;
  } | null>(null);
  const [currency, setCurrency] = useState("RM");
  const [language, setLanguage] = useState("Bahasa Melayu");
  const [notifications, setNotifications] = useState(true);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false,
  });

  // Logout Modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState<"user" | "business">("user");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editBusinessDesc, setEditBusinessDesc] = useState("");
  const [editBusinessType, setEditBusinessType] = useState<"home" | "stall">("home");
  const [saving, setSaving] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  // Change Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Invite Link
  const [generatingLink, setGeneratingLink] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  // Staff List
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ─── TOAST HELPER ──────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  // ─── FETCH PROFILE ──────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const userRes = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const data = await userRes.json();
        if (data.user) {
          setUser({
            name: data.user.name || "Peniaga",
            email: data.user.email || "",
            provider: data.user.provider || "local",
            role: data.user.role || "user",
            gender: data.user.gender || "",
            contact: data.user.contact || "",
            business_id: data.user.business_id || "",
          });
        }
      }
      const bizRes = await fetch(`${API_URL}/business`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bizRes.ok) {
        const data = await bizRes.json();
        if (data.business) {
          setBusiness(data.business);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [token]);

  // ─── FETCH EXISTING INVITE LINK ──────────────────────────────────────
  const fetchInviteLink = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/business/invite-link`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.inviteLink) {
        setInviteLink(data.inviteLink);
      } else {
        setInviteLink(""); // ensure no stale link
      }
    } catch (err) {
      console.error("Fetch invite link error:", err);
    }
  }, [token]);

  // ─── FETCH STAFF LIST ──────────────────────────────────────────────────
  const fetchStaffList = useCallback(async () => {
    if (!token) return;
    setLoadingStaff(true);
    try {
      const res = await fetch(`${API_URL}/business/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStaffList(data.staff || []);
      } else {
        console.error("Failed to fetch staff:", data.message);
      }
    } catch (err) {
      console.error("Fetch staff error:", err);
    } finally {
      setLoadingStaff(false);
    }
  }, [token]);

  // ─── EFFECTS ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fetch invite link + staff list after profile is loaded (only for business owners)
  useEffect(() => {
    if (user.role === "business_owner" || user.role === "admin") {
      fetchInviteLink();
      fetchStaffList();
    }
  }, [user.role, fetchInviteLink, fetchStaffList]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      localStorage.removeItem("token");
      router.push("/login");
    } catch (err) {
      console.error(err);
      showToast("Ralat semasa log keluar.", "error");
    } finally {
      setLoading(false);
      setShowLogoutModal(false);
    }
  };

  const openEditModal = (type: "user" | "business") => {
    setEditType(type);
    if (type === "user") {
      setEditName(user.name);
      setEditEmail(user.email);
      setEditContact(user.contact || "");
      setEditGender(user.gender || "");
    } else {
      setEditBusinessName(business?.name || "");
      setEditBusinessDesc(business?.description || "");
      setEditBusinessType((business?.type as "home" | "stall") || "home");
    }
    setShowEditModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editType === "user") {
        const res = await fetch(`${API_URL}/me`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editName,
            email: editEmail,
            contact: editContact,
            gender: editGender,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setUser((prev) => ({
            ...prev,
            name: data.user.name,
            email: data.user.email,
            contact: data.user.contact || "",
            gender: data.user.gender || "",
          }));
          showToast("Profil berjaya dikemaskini.", "success");
        } else {
          showToast(data.message || "Gagal mengemaskini profil.", "error");
        }
      } else {
        const res = await fetch(`${API_URL}/business`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editBusinessName,
            description: editBusinessDesc,
            type: editBusinessType,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setBusiness(data.business);
          showToast("Perniagaan berjaya dikemaskini.", "success");
        } else {
          showToast(data.message || "Gagal mengemaskini perniagaan.", "error");
        }
      }
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      showToast("Ralat rangkaian. Sila cuba lagi.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── CHANGE PASSWORD ────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast("Kata laluan baru tidak sepadan.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Kata laluan mesti sekurang-kurangnya 6 aksara.", "error");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Kata laluan berjaya ditukar.", "success");
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast(data.message || "Gagal menukar kata laluan.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Ralat rangkaian. Sila cuba lagi.", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // ── GENERATE STAFF INVITE LINK ────────────────────────────────────────
  const handleGenerateInviteLink = async () => {
    if (inviteLink) {
      copyInviteLink();
      showToast("Pautan sedia ada. Disalin ke papan keratan.", "info");
      return;
    }

    setGeneratingLink(true);
    try {
      const res = await fetch(`${API_URL}/business/generate-invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setInviteLink(data.inviteLink);
        showToast("Pautan jemputan berjaya dihasilkan.", "success");
      } else {
        showToast(data.message || "Gagal menjana pautan.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Ralat rangkaian. Sila cuba lagi.", "error");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      showToast("Pautan disalin ke papan keratan.", "success");
    }
  };

  // ─── LINK GOOGLE ──────────────────────────────────────────────────────
  const handleLinkGoogle = async () => {
    if (!token) {
      showToast("Sila log masuk terlebih dahulu.", "error");
      return;
    }
    try {
      setIsLinkingGoogle(true);
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetch(`${API_URL}/auth/link-google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: idToken }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "Gagal memautkan akaun.";
        try {
          const data = JSON.parse(text);
          if (data.message) errorMsg = data.message;
        } catch {
          // If not JSON, keep default message
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      showToast("Akaun Google berjaya dipautkan!", "success");
      fetchProfile();
    } catch (err: unknown) {
      console.error(err);
      if (err && typeof err === 'object' && 'code' in err && err.code === 'auth/popup-closed-by-user') {
        showToast("Popup Google ditutup. Sila cuba lagi.", "error");
      } else {
        const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : "Ralat tidak diketahui.";
        showToast("Ralat: " + message, "error");
      }
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  // ─── SETTINGS SECTIONS ──────────────────────────────────────────────────
  const isBusinessOwner = user.role === "business_owner" || user.role === "admin";

  const settingsSections: SettingSection[] = [
    {
      title: "Profil Pengguna",
      icon: <IconUser />,
      items: [
        {
          label: "Nama",
          value: user.name,
          action: () => openEditModal("user"),
        },
        {
          label: "Emel",
          value: user.email,
          action: () => openEditModal("user"),
        },
        {
          label: "No. Telefon",
          value: user.contact || "-",
          action: () => openEditModal("user"),
        },
        {
          label: "Jantina",
          value: user.gender || "-",
          action: () => openEditModal("user"),
        },
        {
          label: "Peranan",
          value: user.role === "business_owner" ? "Pemilik Perniagaan" : user.role === "admin" ? "Pentadbir" : "Pengguna",
          // no action – read-only
        },
        {
          label: "Kata Laluan",
          value: "••••••••",
          action: () => setShowPasswordModal(true),
        },
        {
          label: "Pautan Google",
          value: user.provider === "both" || user.provider === "google" ? "Dipautkan" : "Belum dipautkan",
          action: user.provider !== "both" && user.provider !== "google" ? handleLinkGoogle : undefined,
          isSpecial: true,
        },
      ],
    },
    {
      title: "Profil Perniagaan",
      icon: <IconStore />,
      items: [
        {
          label: "Nama Perniagaan",
          value: business?.name || "Tiada perniagaan",
          action: () => openEditModal("business"),
        },
        {
          label: "Jenis Perniagaan",
          value: business?.type === "home" ? "Rumah" : business?.type === "stall" ? "Gerai" : "-",
          action: () => openEditModal("business"),
        },
        {
          label: "Penerangan",
          value: business?.description || "-",
          action: () => openEditModal("business"),
        },
      ],
    },
    ...(isBusinessOwner ? [
      {
        title: "Urusan Staff",
        icon: <IconUsers />,
        items: [
          {
            label: "Jana Pautan Jemputan",
            value: inviteLink ? "Pautan sedia" : "Klik untuk jana",
            action: handleGenerateInviteLink,
          },
          ...(inviteLink ? [
            {
              label: "Salin Pautan",
              value: "",
              action: copyInviteLink,
            }
          ] : []),
          // ── NEW: Staff List item (will be displayed as a sub-section) ──
        ],
      }
    ] : []),
    {
      title: "Keutamaan",
      icon: <IconGlobe />,
      items: [
        {
          label: "Mata Wang",
          value: currency,
          action: () => showToast("Fungsi tukar mata wang akan datang.", "info"),
        },
        {
          label: "Bahasa",
          value: language,
          action: () => showToast("Fungsi tukar bahasa akan datang.", "info"),
        },
      ],
    },
    {
      title: "Pemberitahuan",
      icon: <IconBell />,
      items: [
        {
          label: "Pemberitahuan Push",
          value: notifications ? "Dihidupkan" : "Dimatikan",
          isToggle: true,
          toggleValue: notifications,
          onToggle: () => setNotifications(!notifications),
        },
      ],
    },
    {
      title: "Lain-Lain",
      icon: <IconInfo />,
      items: [
        {
          label: "Versi Aplikasi",
          value: "1.0.0",
          action: () => {},
        },
        {
          label: "Dasar Privasi",
          value: "",
          action: () => showToast("Dasar privasi akan datang.", "info"),
        },
        {
          label: "Terma Penggunaan",
          value: "",
          action: () => showToast("Terma penggunaan akan datang.", "info"),
        },
      ],
    },
  ];

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .st-root { min-height: 100vh; background: #f5f7fa; font-family: 'Plus Jakarta Sans', sans-serif; padding-bottom: 110px; -webkit-font-smoothing: antialiased; }

        .st-header { background: linear-gradient(145deg, #1a56db 0%, #2563eb 60%, #3b82f6 100%); padding: 52px 20px 72px; position: relative; overflow: hidden; }
        .st-header::before { content:''; position:absolute; top:-60px; right:-40px; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,0.06); }
        .st-header::after  { content:''; position:absolute; bottom:-50px; left:-30px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.04); }
        .st-back-btn { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,0.16); border:1.5px solid rgba(255,255,255,0.24); backdrop-filter:blur(8px); color:#fff; font-size:13px; font-weight:600; padding:8px 14px; border-radius:99px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:background 0.2s; }
        .st-back-btn:hover { background:rgba(255,255,255,0.24); }
        .st-header-title { font-size:24px; font-weight:800; color:#fff; letter-spacing:-0.03em; }
        .st-header-sub { font-size:13px; color:rgba(255,255,255,0.65); margin-top:2px; font-weight:500; }

        .st-body { margin-top:-36px; padding:0 16px; position:relative; z-index:10; }

        .st-card { background:#fff; border-radius:20px; border:1px solid #f1f5f9; box-shadow:0 2px 8px rgba(0,0,0,0.04); padding:14px 16px; margin-bottom:14px; animation:fadeUp 0.35s ease both; }
        .st-card-title { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .st-card-title-icon { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:#eff6ff; color:#2563eb; }
        .st-card-title-text { font-size:13px; font-weight:700; color:#1e293b; }

        .st-item { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f8fafc; cursor:pointer; transition:background 0.15s; }
        .st-item:last-child { border-bottom:none; }
        .st-item:hover { background:#fafbfc; margin:0 -4px; padding:10px 4px; border-radius:8px; }
        .st-item-left { display:flex; flex-direction:column; gap:2px; flex:1; }
        .st-item-label { font-size:13px; font-weight:600; color:#1e293b; }
        .st-item-value { font-size:12px; color:#94a3b8; font-weight:500; }
        .st-item-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .st-item-chevron { color:#cbd5e1; }

        .st-toggle { width:44px; height:24px; border-radius:99px; background:#e2e8f0; border:none; cursor:pointer; position:relative; transition:background 0.3s; }
        .st-toggle.active { background:#2563eb; }
        .st-toggle-dot { width:18px; height:18px; border-radius:50%; background:#fff; position:absolute; top:3px; left:3px; transition:transform 0.3s; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
        .st-toggle.active .st-toggle-dot { transform:translateX(20px); }

        .st-logout-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:14px; background:#fef2f2; border:1.5px solid #fecaca; border-radius:14px; color:#ef4444; font-size:14px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:background 0.2s; margin-top:4px; }
        .st-logout-btn:hover { background:#fee2e2; }
        .st-logout-btn:disabled { opacity:0.6; cursor:not-allowed; }

        .st-spinner { width:16px; height:16px; border-radius:50%; border:2px solid rgba(239,68,68,0.3); border-top-color:#ef4444; animation:spin 0.65s linear infinite; display:inline-block; }

        /* Modal */
        .st-modal-backdrop { position:fixed; inset:0; z-index:60; background:rgba(15,23,42,0.45); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(2px); animation:backdropIn 0.2s ease; }
        @keyframes backdropIn { from{opacity:0} to{opacity:1} }
        .st-modal { width:90%; max-width:420px; background:#fff; border-radius:24px; padding:24px; animation:modalUp 0.3s cubic-bezier(0.32,0.72,0,1) both; max-height:90vh; overflow-y:auto; }
        @keyframes modalUp { from{transform:scale(0.95);opacity:0} to{transform:scale(1);opacity:1} }
        .st-modal-title-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .st-modal-title { font-size:18px; font-weight:800; color:#1e293b; }
        .st-modal-close { width:32px; height:32px; border-radius:50%; background:#f1f5f9; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; }
        .st-modal-field { background:#f8fafc; border:1.5px solid #f1f5f9; border-radius:14px; padding:12px 14px; margin-bottom:12px; transition:border-color 0.2s; }
        .st-modal-field:focus-within { border-color:#93c5fd; background:#fff; }
        .st-modal-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px; display:block; }
        .st-modal-input { width:100%; font-size:14px; font-weight:600; color:#1e293b; background:transparent; border:none; outline:none; font-family:'Plus Jakarta Sans',sans-serif; }
        .st-modal-input::placeholder { color:#c4cdd6; font-weight:400; }
        .st-modal-save-btn { width:100%; padding:14px; background:linear-gradient(135deg,#1a56db,#3b82f6); border:none; border-radius:14px; color:#fff; font-size:14px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; box-shadow:0 3px 10px rgba(37,99,235,0.3); transition:opacity 0.15s; }
        .st-modal-save-btn:disabled { opacity:0.55; pointer-events:none; }
        .st-pill-group { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
        .st-pill { padding:6px 12px; border-radius:99px; font-size:11px; font-weight:700; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.15s; }
        .st-pill.active { background:#1a56db; color:#fff; border-color:transparent; }

        /* Special: Google link with icon */
        .st-google-linked { color: #22c55e; }
        .st-google-unlinked { color: #ef4444; }

        /* Toast */
        .st-toast-container { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); z-index:9999; width:90%; max-width:400px; }
        .st-toast { padding:14px 18px; border-radius:14px; box-shadow:0 8px 30px rgba(0,0,0,0.15); display:flex; align-items:center; gap:12px; backdrop-filter:blur(8px); animation:slideUp 0.3s ease, fadeOut 0.3s ease 3.7s forwards; }
        .st-toast-success { background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; }
        .st-toast-error { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }
        .st-toast-info { background:#eff6ff; border:1px solid #bfdbfe; color:#1d4ed8; }
        .st-toast-icon { flex-shrink:0; width:20px; height:20px; }
        .st-toast-message { flex:1; font-size:13px; font-weight:500; line-height:1.4; }
        .st-toast-close { background:none; border:none; color:currentColor; opacity:0.6; cursor:pointer; padding:4px; }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeOut { from{opacity:1} to{opacity:0} }

        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }

        /* Staff list styles */
        .st-staff-item { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f8fafc; }
        .st-staff-item:last-child { border-bottom:none; }
        .st-staff-name { font-size:13px; font-weight:600; color:#1e293b; }
        .st-staff-email { font-size:12px; color:#94a3b8; }
        .st-staff-role { font-size:10px; font-weight:600; color:#3b82f6; background:#eff6ff; padding:2px 8px; border-radius:99px; }
      `}</style>

      <div className="st-root">
        {/* HEADER */}
        <div className="st-header">
          <div className="st-header-inner">
            <div className="st-header-title">Tetapan</div>
            <div className="st-header-sub">Urus profil dan keutamaan aplikasi anda</div>
          </div>
        </div>

        <div className="st-body">
          {/* PROFILE CARD */}
          <div className="st-card" style={{ animationDelay: "0.05s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "2px solid #bfdbfe",
                }}
              >
                <IconUser />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                  {user.name || "Peniaga"}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                  {user.email}
                </div>
                {business && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#3b82f6",
                      fontWeight: 600,
                      marginTop: 2,
                    }}
                  >
                    {business.name}
                  </div>
                )}
              </div>
              <button
                style={{
                  padding: "6px 14px",
                  borderRadius: 99,
                  border: "1.5px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#2563eb",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={() => openEditModal("user")}
              >
                <IconEdit /> Edit
              </button>
            </div>
          </div>

          {/* SETTINGS SECTIONS */}
          {settingsSections.map((section, idx) => (
            <div
              key={section.title}
              className="st-card"
              style={{ animationDelay: `${0.05 + (idx + 1) * 0.04}s` }}
            >
              <div className="st-card-title">
                <div className="st-card-title-icon">{section.icon}</div>
                <span className="st-card-title-text">{section.title}</span>
              </div>
              {section.items.map((item, i) => {
                const isToggle = item.isToggle || false;
                const isSpecial = item.isSpecial || false;

                // Special handling for Google Link
                if (isSpecial) {
                  const isLinked = user.provider === "both" || user.provider === "google";
                  return (
                    <div
                      key={i}
                      className="st-item"
                      onClick={isLinked ? undefined : item.action}
                      style={isLinked ? { cursor: "default" } : {}}
                    >
                      <div className="st-item-left">
                        <span className="st-item-label">{item.label}</span>
                        <span className="st-item-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {isLinked ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                          {isLinked ? "Dipautkan" : "Belum dipautkan"}
                        </span>
                      </div>
                      <div className="st-item-right">
                        {!isLinked && <span className="st-item-chevron"><IconChevronRight /></span>}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className="st-item"
                    onClick={isToggle ? undefined : item.action}
                    style={isToggle ? { cursor: "default" } : {}}
                  >
                    <div className="st-item-left">
                      <span className="st-item-label">{item.label}</span>
                      {!isToggle && item.value && (
                        <span className="st-item-value">{item.value}</span>
                      )}
                    </div>
                    <div className="st-item-right">
                      {isToggle ? (
                        <button
                          className={`st-toggle ${item.toggleValue ? "active" : ""}`}
                          onClick={item.onToggle}
                        >
                          <div className="st-toggle-dot" />
                        </button>
                      ) : (
                        <>
                          {item.value && (
                            <span
                              style={{
                                fontSize: 12,
                                color: "#94a3b8",
                                fontWeight: 500,
                              }}
                            >
                              {item.value}
                            </span>
                          )}
                          {item.action && (
                            <span className="st-item-chevron">
                              <IconChevronRight />
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ── Staff List (only for "Urusan Staff" section) ── */}
              {section.title === "Urusan Staff" && isBusinessOwner && (
                <div style={{ marginTop: 12, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    Senarai Staff
                  </div>
                  {loadingStaff ? (
                    <div style={{ textAlign: "center", padding: "12px 0", color: "#94a3b8", fontSize: 13 }}>
                      <span className="st-spinner" style={{ display: "inline-block", marginRight: 8 }} />
                      Memuatkan staff...
                    </div>
                  ) : staffList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "12px 0", color: "#94a3b8", fontSize: 13 }}>
                      Tiada staff didaftarkan.
                    </div>
                  ) : (
                    staffList.map((staff) => (
                      <div key={staff.user_id} className="st-staff-item">
                        <div>
                          <div className="st-staff-name">{staff.name}</div>
                          <div className="st-staff-email">{staff.email}</div>
                        </div>
                        <span className="st-staff-role">Staff</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {/* LOGOUT BUTTON */}
          <button
            className="st-logout-btn"
            onClick={() => setShowLogoutModal(true)}
            disabled={loading}
            style={{ animationDelay: "0.3s" }}
          >
            {loading ? <span className="st-spinner" /> : <IconLogout />}
            {loading ? "Logging out..." : "Log Keluar"}
          </button>

          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "#cbd5e1",
              padding: "20px 0 10px",
              fontWeight: 500,
            }}
          >
            Smart Cost AI v1.0.0
          </div>
        </div>

        {/* ── EDIT MODAL ── */}
        {showEditModal && (
          <div
            className="st-modal-backdrop"
            onClick={() => setShowEditModal(false)}
          >
            <div className="st-modal" onClick={(e) => e.stopPropagation()}>
              <div className="st-modal-title-row">
                <span className="st-modal-title">
                  {editType === "user" ? "Edit Profil" : "Edit Perniagaan"}
                </span>
                <button
                  className="st-modal-close"
                  onClick={() => setShowEditModal(false)}
                >
                  <IconClose />
                </button>
              </div>

              {editType === "user" ? (
                <>
                  <div className="st-modal-field">
                    <label className="st-modal-label">Nama</label>
                    <input
                      className="st-modal-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nama penuh"
                    />
                  </div>
                  <div className="st-modal-field">
                    <label className="st-modal-label">Emel</label>
                    <input
                      className="st-modal-input"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@contoh.com"
                      type="email"
                    />
                  </div>
                  <div className="st-modal-field">
                    <label className="st-modal-label">No. Telefon</label>
                    <input
                      className="st-modal-input"
                      value={editContact}
                      onChange={(e) => setEditContact(e.target.value)}
                      placeholder="012-3456789"
                    />
                  </div>
                  <div className="st-modal-field">
                    <label className="st-modal-label">Jantina</label>
                    <div className="st-pill-group">
                      {["Lelaki", "Perempuan", "Lain-lain"].map((gender) => (
                        <button
                          key={gender}
                          className={`st-pill ${editGender === gender ? "active" : ""}`}
                          onClick={() => setEditGender(gender)}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="st-modal-field">
                    <label className="st-modal-label">Nama Perniagaan</label>
                    <input
                      className="st-modal-input"
                      value={editBusinessName}
                      onChange={(e) => setEditBusinessName(e.target.value)}
                      placeholder="Nama perniagaan"
                    />
                  </div>
                  <div className="st-modal-field">
                    <label className="st-modal-label">Penerangan</label>
                    <input
                      className="st-modal-input"
                      value={editBusinessDesc}
                      onChange={(e) => setEditBusinessDesc(e.target.value)}
                      placeholder="Penerangan ringkas"
                    />
                  </div>
                  <div className="st-modal-field">
                    <label className="st-modal-label">Jenis Perniagaan</label>
                    <div className="st-pill-group">
                      {["home", "stall"].map((type) => (
                        <button
                          key={type}
                          className={`st-pill ${editBusinessType === type ? "active" : ""}`}
                          onClick={() => setEditBusinessType(type as "home" | "stall")}
                        >
                          {type === "home" ? "🏠 Rumah" : "🛒 Gerai"}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                className="st-modal-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <span className="st-spinner" /> : "Simpan"}
              </button>
            </div>
          </div>
        )}

        {/* ── CHANGE PASSWORD MODAL ── */}
        {showPasswordModal && (
          <div className="st-modal-backdrop" onClick={() => setShowPasswordModal(false)}>
            <div className="st-modal" onClick={(e) => e.stopPropagation()}>
              <div className="st-modal-title-row">
                <span className="st-modal-title">Tukar Kata Laluan</span>
                <button className="st-modal-close" onClick={() => setShowPasswordModal(false)}>
                  <IconClose />
                </button>
              </div>
              <div className="st-modal-field">
                <label className="st-modal-label">Kata Laluan Semasa</label>
                <input
                  className="st-modal-input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata laluan semasa"
                />
              </div>
              <div className="st-modal-field">
                <label className="st-modal-label">Kata Laluan Baru</label>
                <input
                  className="st-modal-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 aksara"
                />
              </div>
              <div className="st-modal-field">
                <label className="st-modal-label">Sahkan Kata Laluan Baru</label>
                <input
                  className="st-modal-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Taip semula kata laluan baru"
                />
              </div>
              <button
                className="st-modal-save-btn"
                onClick={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? <span className="st-spinner" /> : "Tukar Kata Laluan"}
              </button>
            </div>
          </div>
        )}

        {/* ── LOGOUT CONFIRM MODAL ── */}
        {showLogoutModal && (
          <div className="st-modal-backdrop" onClick={() => setShowLogoutModal(false)}>
            <div className="st-modal" onClick={(e) => e.stopPropagation()}>
              <div className="st-modal-title-row">
                <span className="st-modal-title" style={{ color: "#dc2626" }}>Log Keluar</span>
                <button className="st-modal-close" onClick={() => setShowLogoutModal(false)}>
                  <IconClose />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0 16px" }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#fef2f2",
                  border: "2px solid #fecaca",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <IconWarning />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
                    Anda pasti mahu log keluar?
                  </p>
                  <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                    Anda perlu log masuk semula untuk mengakses akaun anda.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  className="st-modal-save-btn"
                  style={{
                    background: "#e2e8f0",
                    color: "#475569",
                    boxShadow: "none",
                    flex: 1,
                  }}
                  onClick={() => setShowLogoutModal(false)}
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  className="st-modal-save-btn"
                  style={{
                    background: "#ef4444",
                    boxShadow: "0 3px 10px rgba(239,68,68,0.3)",
                    flex: 1,
                  }}
                  onClick={handleLogout}
                  disabled={loading}
                >
                  {loading ? <span className="st-spinner" style={{ borderTopColor: "#fff" }} /> : "Log Keluar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOAST NOTIFICATION ── */}
        {toast.visible && (
          <div className="st-toast-container">
            <div className={`st-toast st-toast-${toast.type}`}>
              <span className="st-toast-icon">
                {toast.type === "success" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {toast.type === "error" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
                {toast.type === "info" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </span>
              <span className="st-toast-message">{toast.message}</span>
              <button className="st-toast-close" onClick={() => setToast((prev) => ({ ...prev, visible: false }))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <BottomNavbar />
      </div>
    </>
  );
}