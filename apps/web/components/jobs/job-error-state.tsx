"use client";

import { AlertCircle, Lock, RefreshCw, ShieldAlert, WifiOff } from "lucide-react";
import Link from "next/link";
import React from "react";

export interface JobErrorStateProps {
  status: number;
  message?: string;
  onRetry?: () => void;
}

export function JobErrorState({
  status,
  message,
  onRetry,
}: JobErrorStateProps) {
  if (status === 401) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-red-200 bg-white shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <Lock size={28} />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Authentication Required
        </h3>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          {message ?? "Your session could not be verified or has expired. Please sign in to access Job Radar."}
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold text-xs transition-colors shadow-xs"
        >
          Sign in again
        </Link>
      </div>
    );
  }

  if (status === 403) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-amber-200 bg-white shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <ShieldAlert size={28} />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Access Forbidden
        </h3>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          {message ?? "You do not have permission to view jobs in this workspace."}
        </p>
      </div>
    );
  }

  const isNetwork = status === 0;

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-red-200 bg-white shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
        {isNetwork ? <WifiOff size={28} /> : <AlertCircle size={28} />}
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {isNetwork ? "Network Connection Error" : "Unable to Load Job Opportunities"}
      </h3>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        {message ?? "An unexpected error occurred while communicating with the server."}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
        >
          <RefreshCw size={16} />
          Retry Request
        </button>
      )}
    </div>
  );
}
