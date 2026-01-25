"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import StarsBackground from "@/components/StarsBackground";

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  phone: string | null;
  role: "Admin" | "Developer" | "Editor" | "Student";
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFormData({
          name: data.user.name || "",
          email: data.user.email || "",
          username: data.user.username || "",
          phone: data.user.phone || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setError("Not authenticated");
        setSaving(false);
        return;
      }

      const updateData: any = {
        name: formData.name,
        email: formData.email,
        username: formData.username,
        phone: formData.phone || null,
      };

      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Profile updated successfully!");
        setUser(data.user);
        setEditing(false);
        // Refresh the page after a short delay to show success message
        setTimeout(() => {
          fetchUser();
        }, 1000);
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setError("Not authenticated");
        setSaving(false);
        return;
      }

      // Validate password fields
      if (!formData.currentPassword) {
        setError("Current password is required");
        setSaving(false);
        return;
      }
      if (!formData.newPassword) {
        setError("New password is required");
        setSaving(false);
        return;
      }
      if (formData.newPassword.length < 6) {
        setError("New password must be at least 6 characters");
        setSaving(false);
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError("New passwords do not match");
        setSaving(false);
        return;
      }
      if (formData.currentPassword === formData.newPassword) {
        setError("New password must be different from current password");
        setSaving(false);
        return;
      }

      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user?.name,
          email: user?.email,
          username: user?.username,
          phone: user?.phone,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Password changed successfully!");
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
        setChangingPassword(false);
        setTimeout(() => {
          setSuccess("");
        }, 3000);
      } else {
        setError(data.error || "Failed to change password");
      }
    } catch (err) {
      console.error("Error changing password:", err);
      setError("Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "from-red-500 to-pink-500";
      case "Developer":
        return "from-purple-500 to-indigo-500";
      case "Editor":
        return "from-blue-500 to-cyan-500";
      case "Student":
        return "from-green-500 to-emerald-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
          <Header />
          <StarsBackground />
          <div className="relative z-10 min-h-screen flex items-center justify-center pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
            <div className="text-white text-xl">Loading profile...</div>
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />

        <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
          <div className="max-w-3xl mx-auto w-full">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
                My Profile
              </h1>
              <p className="text-gray-400">Manage your account information and settings</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300">
                {success}
              </div>
            )}

            {/* Profile Card */}
            <div className="bg-[#1e3a5f]/90 backdrop-blur-lg border border-blue-500/30 rounded-2xl shadow-2xl p-6 md:p-8">
              {!editing && !changingPassword ? (
                /* View Mode */
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getRoleColor(user?.role || "Student")} flex items-center justify-center text-white text-2xl font-bold`}>
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getRoleColor(user?.role || "Student")} text-white`}>
                          {user?.role === "Student" ? "RE Ninja 🥷" : user?.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setChangingPassword(true);
                          setEditing(false);
                          setError("");
                          setSuccess("");
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all"
                      >
                        Change Password
                      </button>
                      <button
                        onClick={() => {
                          setEditing(true);
                          setChangingPassword(false);
                          setError("");
                          setSuccess("");
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#0a1a2e]/50 rounded-lg border border-blue-500/20">
                        <label className="text-gray-400 text-sm mb-1 block">Email</label>
                        <p className="text-white font-medium">{user?.email}</p>
                      </div>
                      <div className="p-4 bg-[#0a1a2e]/50 rounded-lg border border-blue-500/20">
                        <label className="text-gray-400 text-sm mb-1 block">Username</label>
                        <p className="text-white font-medium">{user?.username}</p>
                      </div>
                      <div className="p-4 bg-[#0a1a2e]/50 rounded-lg border border-blue-500/20">
                        <label className="text-gray-400 text-sm mb-1 block">Phone</label>
                        <p className="text-white font-medium">{user?.phone || "Not provided"}</p>
                      </div>
                      <div className="p-4 bg-[#0a1a2e]/50 rounded-lg border border-blue-500/20">
                        <label className="text-gray-400 text-sm mb-1 block">Member Since</label>
                        <p className="text-white font-medium">Active User</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : changingPassword ? (
                /* Change Password Mode */
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white">Change Password</h3>
                      <p className="text-gray-400 text-sm mt-1">Update your password to keep your account secure</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChangingPassword(false);
                        setEditing(false);
                        setError("");
                        setSuccess("");
                        setFormData((prev) => ({
                          ...prev,
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        }));
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Current Password *
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 bg-[#0a1a2e]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        placeholder="Enter your current password"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        New Password *
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        required
                        minLength={6}
                        className="w-full px-4 py-2.5 bg-[#0a1a2e]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        placeholder="Enter new password (minimum 6 characters)"
                      />
                      <p className="text-gray-500 text-xs mt-1">Password must be at least 6 characters long</p>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 bg-[#0a1a2e]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        placeholder="Confirm your new password"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-blue-500/20">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                    >
                      {saving ? "Changing Password..." : "Change Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChangingPassword(false);
                        setEditing(false);
                        setError("");
                        setSuccess("");
                        setFormData((prev) => ({
                          ...prev,
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        }));
                      }}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Edit Mode */
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Edit Profile</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setChangingPassword(false);
                        setError("");
                        setSuccess("");
                        fetchUser(); // Reset form
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 bg-[#0a1a2e]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Username *
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        minLength={3}
                        className="w-full px-4 py-2.5 bg-[#0a1a2e]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        placeholder="Enter username"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 bg-[#0a1a2e]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        placeholder="Enter email address"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-[#0a1a2e]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>


                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setChangingPassword(false);
                        setError("");
                        setSuccess("");
                        fetchUser();
                      }}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

