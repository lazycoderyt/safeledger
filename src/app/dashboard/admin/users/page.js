"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users, ChevronRight, ShieldCheck } from "lucide-react";
import { useAdminUserDirectory } from "@/utils/useAdminUserDirectory";
import { formatAccountNumberDisplay } from "@/utils/Cryptogenacc";

/**
 * app/dashboard/admin/users/page.js
 * All Users — searchable directory of every registered user. Tapping a
 * row opens /dashboard/admin/users/[id] to edit their name, account
 * number, or role.
 */

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isAdmin
          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
          : "bg-slate-100 text-slate-600 border border-slate-200"
      }`}
    >
      {isAdmin && <ShieldCheck className="h-3 w-3" aria-hidden="true" />}
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

function UserRow({ user }) {
  return (
    <Link
      href={`/dashboard/admin/users/${user.id}`}
      className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
    >
      <div className="flex min-w-0 items-center gap-3">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 border border-indigo-200">
            {getInitials(user.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {user.name}
          </p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          {user.accountNumber && (
            <p className="truncate font-mono text-[11px] text-slate-400">
              {formatAccountNumberDisplay(user.accountNumber)}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <RoleBadge role={user.role} />
        <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
      </div>
    </Link>
  );
}

export default function AdminUsersPage() {
  const { users, loading, error } = useAdminUserDirectory();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter((user) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.accountNumber.includes(term)
    );
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          All Users
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          View and manage every registered SafeLedger user.
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, or account number"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            Loading users…
          </p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-rose-600">
            Couldn&rsquo;t load users right now. Please try again shortly.
          </p>
        ) : filteredUsers.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Users
              className="mx-auto h-8 w-8 text-slate-300"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-slate-600">
              {searchTerm ? "No users match your search" : "No users yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
