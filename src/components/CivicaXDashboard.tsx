'use client'

import React, { useState } from 'react'
import {
  FileText,
  Clock,
  ClipboardList,
  Network,
  Share2,
  Settings,
  ShieldCheck,
  Check,
  ChevronDown,
  ArrowRight,
  MoreHorizontal,
  ChevronRight,
  ArrowLeft,
  Layers,
  Database,
  Search,
  Menu,
  X,
} from 'lucide-react'

// Philippine Flag component in clean SVG
function PhilippineFlag({ className = 'w-6 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 900 600" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Blue top */}
      <rect width="900" height="300" fill="#0038A8" />
      {/* Red bottom */}
      <rect y="300" width="900" height="300" fill="#CE1126" />
      {/* White equilateral triangle */}
      <polygon points="0,0 519.6,300 0,600" fill="#FFFFFF" />
      {/* Golden Sun */}
      <circle cx="173.2" cy="300" r="54" fill="#FCD116" />
      {/* 8 primary sun rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <g key={i} transform={`rotate(${angle} 173.2 300)`}>
          <polygon points="173.2,210 166,242 180.4,242" fill="#FCD116" />
        </g>
      ))}
      {/* 3 stars */}
      {/* Top star */}
      <polygon points="65,95 70,110 85,110 73,119 77,134 65,124 53,134 57,119 45,110 60,110" fill="#FCD116" />
      {/* Bottom star */}
      <polygon points="65,466 70,481 85,481 73,490 77,505 65,495 53,505 57,490 45,481 60,481" fill="#FCD116" />
      {/* Right star */}
      <polygon points="430,285 435,300 450,300 438,309 442,324 430,314 418,324 422,309 410,300 425,300" fill="#FCD116" />
    </svg>
  )
}

// CivicaX Logo Icon with connected node graph
function CivicaXLogoIcon() {
  return (
    <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 18L24 10L34 16L38 28L28 38L14 34L10 24Z" stroke="#3b82f6" strokeWidth="2.5" strokeOpacity="0.6" strokeDasharray="3 3" />
      <line x1="14" y1="18" x2="28" y2="38" stroke="#0ea5e9" strokeWidth="2.5" />
      <line x1="24" y1="10" x2="14" y2="34" stroke="#22c55e" strokeWidth="2.5" />
      <line x1="34" y1="16" x2="10" y2="24" stroke="#38bdf8" strokeWidth="2.5" />
      {/* Node circles */}
      <circle cx="14" cy="18" r="4.5" fill="#3b82f6" />
      <circle cx="24" cy="10" r="4" fill="#0ea5e9" />
      <circle cx="34" cy="16" r="4.5" fill="#22c55e" />
      <circle cx="38" cy="28" r="4" fill="#10b981" />
      <circle cx="28" cy="38" r="5" fill="#0284c7" />
      <circle cx="14" cy="34" r="4" fill="#3b82f6" />
      <circle cx="10" cy="24" r="3.5" fill="#06b6d4" />
    </svg>
  )
}

export function CivicaXDashboard() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'detail'>('dashboard')
  const [activeTab, setActiveTab] = useState<'projects' | 'nodes'>('projects')
  const [activeSidebar, setActiveSidebar] = useState<'overview' | 'pending' | 'reports' | 'validators' | 'consensus' | 'settings'>('overview')
  const [showLedgerModal, setShowLedgerModal] = useState(false)
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'milestones' | 'budget' | 'validation'>('all')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Sample ledger transactions
  const ledgerBlocks = [
    {
      id: 1642,
      time: '3:02 PM',
      date: 'Today, 2026-01-02',
      title: 'Road Repair Verified',
      dept: 'COA Auditor',
      hash: '2F7DBBHJAKSDIWKA867',
      prevHash: '9A83BCF1004E8821DE',
      status: 'VERIFIED',
      signatures: '8/9 Validators',
      type: 'validation',
    },
    {
      id: 1641,
      time: '11:42 AM',
      date: 'Today, 2026-01-02',
      title: 'Health Center Approved',
      dept: 'LGU Finance Dept.',
      hash: '9A83BCF1004E8821DE',
      prevHash: '7C12EFD34821A89201',
      status: 'APPROVED',
      signatures: '9/9 Validators',
      type: 'budget',
    },
    {
      id: 1640,
      time: '9:15 AM',
      date: 'Yesterday, 2026-01-01',
      title: 'School Building Inspection',
      dept: 'Engineering Officer',
      hash: '7C12EFD34821A89201',
      prevHash: '1B09AC491200E919AA',
      status: 'SUBMITTED',
      signatures: '7/9 Validators',
      type: 'milestones',
    },
    {
      id: 1639,
      time: '4:20 PM',
      date: '2025-12-31',
      title: 'Bridge Rehabilitation Milestone 3 Evidence Logged',
      dept: 'DPWH NCR Oversight',
      hash: '1B09AC491200E919AA',
      prevHash: '5F81DDA982103E48BC',
      status: 'LOGGED',
      signatures: '8/9 Validators',
      type: 'milestones',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#07193b] text-slate-100 font-sans select-none">
      {/* ------------------------------------------------------------- TOP HEADER BAR */}
      <header className="bg-[#041026] border-b border-blue-900/60 text-white sticky top-0 z-30">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3">
          {/* Mobile hamburger menu & Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-blue-900/40 rounded-lg transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
                setCurrentView('dashboard')
                setActiveSidebar('overview')
              }}
            >
              <CivicaXLogoIcon />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-white">CivicaX</span>
                  <span className="hidden lg:inline-block text-[10px] tracking-wider uppercase font-semibold text-sky-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                    BLOCKCHAIN INFRASTRUCTURE MONITORING SYSTEM
                  </span>
                </div>
                <span className="text-[9px] tracking-wider uppercase font-medium text-sky-300 block lg:hidden">
                  BLOCKCHAIN MONITOR
                </span>
              </div>
            </div>
          </div>

          {/* Right Profile & Government Dept */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 bg-blue-950/60 px-2.5 sm:px-3 py-1.5 rounded-lg border border-blue-800/40">
              <PhilippineFlag className="w-4 sm:w-5 h-3 sm:h-3.5 rounded-xs shadow-sm shrink-0" />
              <span className="hidden sm:inline text-xs font-medium text-slate-200">City Oversight dept.</span>
              <span className="sm:hidden text-[11px] font-medium text-slate-200">Oversight</span>
            </div>

            <button
              onClick={() => setCurrentView(currentView === 'dashboard' ? 'detail' : 'dashboard')}
              className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white px-2 py-1 rounded bg-blue-900/40 hover:bg-blue-900/70 border border-blue-700/50 transition-colors"
            >
              <span>Admin</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-6 sm:gap-8 px-4 sm:px-6 pt-1 text-xs sm:text-sm font-medium border-t border-blue-900/40 bg-[#030d20]">
          <button
            onClick={() => {
              setActiveTab('projects')
              setCurrentView('dashboard')
            }}
            className={`pb-2.5 pt-2 transition-all relative ${
              activeTab === 'projects'
                ? 'text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Projects
            {activeTab === 'projects' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('nodes')
              setShowLedgerModal(true)
            }}
            className={`pb-2.5 pt-2 transition-all relative ${
              activeTab === 'nodes'
                ? 'text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nodes Overview
            {activeTab === 'nodes' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- BODY WITH SIDEBAR */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* DESKTOP LEFT NAV SIDEBAR */}
        <aside className="hidden md:flex md:w-56 bg-[#030d20] border-r border-blue-950/80 flex-col shrink-0 py-6 px-3">
          <div className="px-3 mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Dashboard</h2>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveSidebar('overview')
                setCurrentView('dashboard')
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                activeSidebar === 'overview' && currentView === 'dashboard'
                  ? 'bg-blue-900/60 text-white font-semibold border-l-2 border-sky-400'
                  : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => {
                setActiveSidebar('pending')
                setCurrentView('detail')
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                activeSidebar === 'pending'
                  ? 'bg-blue-900/60 text-white font-semibold border-l-2 border-sky-400'
                  : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Pending Actions</span>
              <span className="ml-auto text-[10px] font-bold bg-red-600/90 text-white px-1.5 py-0.5 rounded-full">5</span>
            </button>

            <button
              onClick={() => {
                setActiveSidebar('reports')
                setShowLedgerModal(true)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                activeSidebar === 'reports'
                  ? 'bg-blue-900/60 text-white font-semibold'
                  : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Project Reports</span>
            </button>

            <div className="my-3 border-t border-blue-950/90" />

            <button
              onClick={() => {
                setActiveSidebar('validators')
                setShowLedgerModal(true)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                activeSidebar === 'validators'
                  ? 'bg-blue-900/60 text-white font-semibold'
                  : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
              }`}
            >
              <Network className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Validator Nodes</span>
              <span className="ml-auto text-[10px] font-mono text-slate-400">7/9</span>
            </button>

            <button
              onClick={() => {
                setActiveSidebar('consensus')
                setShowLedgerModal(true)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                activeSidebar === 'consensus'
                  ? 'bg-blue-900/60 text-white font-semibold'
                  : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
              }`}
            >
              <Share2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Consensus Status</span>
            </button>

            <button
              onClick={() => setActiveSidebar('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                activeSidebar === 'settings'
                  ? 'bg-blue-900/60 text-white font-semibold'
                  : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-400 shrink-0" />
              <span>System Settings</span>
            </button>
          </nav>

          <div className="mt-auto px-3 pt-6 border-t border-blue-950/90 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PBFT Consensus Active</span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-slate-500">Block: #1642 (Live)</div>
          </div>
        </aside>

        {/* MOBILE SLIDE-OUT DRAWER OVERLAY */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="w-64 bg-[#030d20] h-full p-4 flex flex-col border-r border-blue-950 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-blue-900/50">
                <div className="flex items-center gap-2">
                  <CivicaXLogoIcon />
                  <div>
                    <div className="font-bold text-white text-base">CivicaX</div>
                    <div className="text-[9px] uppercase font-semibold text-sky-400">Blockchain Monitor</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-blue-900/50"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setActiveSidebar('overview')
                    setCurrentView('dashboard')
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                    activeSidebar === 'overview' && currentView === 'dashboard'
                      ? 'bg-blue-900/60 text-white font-semibold border-l-2 border-sky-400'
                      : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSidebar('pending')
                    setCurrentView('detail')
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                    activeSidebar === 'pending'
                      ? 'bg-blue-900/60 text-white font-semibold border-l-2 border-sky-400'
                      : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Pending Actions</span>
                  <span className="ml-auto text-[10px] font-bold bg-red-600/90 text-white px-1.5 py-0.5 rounded-full">5</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSidebar('reports')
                    setShowLedgerModal(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                    activeSidebar === 'reports'
                      ? 'bg-blue-900/60 text-white font-semibold'
                      : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Project Reports</span>
                </button>

                <div className="my-3 border-t border-blue-950/90" />

                <button
                  onClick={() => {
                    setActiveSidebar('validators')
                    setShowLedgerModal(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                    activeSidebar === 'validators'
                      ? 'bg-blue-900/60 text-white font-semibold'
                      : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
                  }`}
                >
                  <Network className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Validator Nodes</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-400">7/9</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSidebar('consensus')
                    setShowLedgerModal(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                    activeSidebar === 'consensus'
                      ? 'bg-blue-900/60 text-white font-semibold'
                      : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
                  }`}
                >
                  <Share2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Consensus Status</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSidebar('settings')
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                    activeSidebar === 'settings'
                      ? 'bg-blue-900/60 text-white font-semibold'
                      : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>System Settings</span>
                </button>
              </nav>

              <div className="mt-auto pt-6 border-t border-blue-950/90 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>PBFT Consensus Active</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-500">Block: #1642 (Live)</div>
              </div>
            </div>
            {/* Backdrop click to dismiss */}
            <div className="flex-1 bg-black/60 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* MAIN DISPLAY AREA */}
        <main className="flex-1 bg-[#d8e6f7] overflow-y-auto p-3 sm:p-5 pb-20 md:pb-5 text-slate-900">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* ------------------------------------------------------------- 4 METRIC CARDS */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {/* Card 1: Active Projects */}
              <div
                onClick={() => setCurrentView(currentView === 'detail' ? 'dashboard' : 'detail')}
                className={`cursor-pointer rounded-xl p-3 sm:p-4 transition-all duration-200 shadow-sm border ${
                  currentView === 'detail'
                    ? 'bg-[#f5c037] border-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-white border-slate-200/80 hover:border-blue-400 text-slate-800'
                }`}
              >
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-85">Active Projects</div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-center sm:text-left">18</div>
              </div>

              {/* Card 2: Pending Approvals */}
              <div
                onClick={() => setCurrentView('detail')}
                className="cursor-pointer bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200/80 hover:border-blue-400 transition-all"
              >
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 opacity-85">Pending Approvals</div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-center sm:text-left">5</div>
              </div>

              {/* Card 3: Completed Milestones */}
              <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 opacity-85">Completed Milestones</div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-center sm:text-left">42</div>
              </div>

              {/* Card 4: Validating Nodes */}
              <div
                onClick={() => setShowLedgerModal(true)}
                className="cursor-pointer bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200/80 hover:border-blue-400 transition-all"
              >
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 opacity-85">Validating Nodes</div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-center sm:text-left">7/9</div>
              </div>
            </section>

            {/* ------------------------------------------------------------- VIEW 1: DASHBOARD OVERVIEW */}
            {currentView === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* LEFT COLUMN: 6 cols */}
                <div className="lg:col-span-6 space-y-4">
                  {/* WIDGET 1: Project Status */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800">Project Status</h3>
                      <button className="text-slate-400 hover:text-slate-600 p-1">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      {/* Row 1: Bridge Rehabilitation */}
                      <div
                        onClick={() => setCurrentView('detail')}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50/70 cursor-pointer transition-colors border border-transparent hover:border-blue-200"
                      >
                        <div className="pr-2">
                          <div className="text-xs font-bold text-slate-900 hover:text-blue-700">Bridge Rehabilitation</div>
                          <div className="text-[11px] font-mono text-slate-500">[PRJ - 00026]</div>
                        </div>
                        <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#1b7339] text-white shrink-0 shadow-xs">
                          In Progress
                        </span>
                      </div>

                      {/* Row 2: School Building Construction */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="pr-2">
                          <div className="text-xs font-bold text-slate-900">School Building Construction</div>
                          <div className="text-[11px] font-mono text-slate-500">[SBC - 67891]</div>
                        </div>
                        <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#b32626] text-white shrink-0 shadow-xs">
                          Pending Approval
                        </span>
                      </div>

                      {/* Row 3: Water Supply Expansion */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="pr-2">
                          <div className="text-xs font-bold text-slate-900">Water Supply Expansion</div>
                          <div className="text-[11px] font-mono text-slate-500">[WSE - 0987]</div>
                        </div>
                        <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#1b7339] text-white shrink-0 shadow-xs">
                          In Progress
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 text-center border-t border-slate-100">
                      <button
                        onClick={() => setCurrentView('detail')}
                        className="text-xs font-semibold text-[#0047ab] hover:underline inline-flex items-center gap-1"
                      >
                        <span>&gt; View all Projects</span>
                      </button>
                    </div>
                  </div>

                  {/* WIDGET 2: Audit Trail */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800">Audit Trail</h3>
                      <button className="text-slate-400 hover:text-slate-600 p-1">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-3 text-xs">
                      {/* Item 1 */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800">• Milestone Verified :</span>
                          <div className="text-slate-600 pl-3">Road Repair</div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 font-semibold shrink-0">[Blk# - 2541]</span>
                        <div className="text-right text-[11px] text-slate-500 shrink-0">
                          <div>3 mins ago</div>
                          <div className="font-medium text-slate-700">COA Auditor</div>
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800">• Budget Release Approval:</span>
                          <div className="text-slate-600 pl-3">Health Center</div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 font-semibold shrink-0">[Blk# - 3541]</span>
                        <div className="text-right text-[11px] text-slate-500 shrink-0">
                          <div>Today</div>
                          <div className="font-medium text-slate-700">LGU Finance Dept.</div>
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800">• Inspection Report Submitted:</span>
                          <div className="text-slate-600 pl-3">School blg.</div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 font-semibold shrink-0">[Blk# - 1252]</span>
                        <div className="text-right text-[11px] text-slate-500 shrink-0">
                          <div>Yesterday</div>
                          <div className="font-medium text-slate-700">Engineering Officer</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 text-center border-t border-slate-100">
                      <button
                        onClick={() => setShowLedgerModal(true)}
                        className="text-xs font-semibold text-[#0047ab] hover:underline inline-flex items-center gap-1"
                      >
                        <span>&gt; View Full Logs</span>
                      </button>
                    </div>
                  </div>

                  {/* WIDGET 3: Budget Distribution */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
                    <h3 className="text-sm font-bold text-slate-800 pb-2">Budget Distribution</h3>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
                      {/* SVG Pie Chart */}
                      <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          {/* Slice 1: Roads & Bridges (48%) -> cyan-400 */}
                          <circle
                            cx="50"
                            cy="50"
                            r="32"
                            fill="transparent"
                            stroke="#38bdf8"
                            strokeWidth="32"
                            strokeDasharray="144.7 301.6"
                            strokeDashoffset="0"
                          />
                          {/* Slice 2: Public Buildings (26%) -> sky-600 */}
                          <circle
                            cx="50"
                            cy="50"
                            r="32"
                            fill="transparent"
                            stroke="#0284c7"
                            strokeWidth="32"
                            strokeDasharray="78.4 301.6"
                            strokeDashoffset="-144.7"
                          />
                          {/* Slice 3: Water Works (16%) -> teal-400 */}
                          <circle
                            cx="50"
                            cy="50"
                            r="32"
                            fill="transparent"
                            stroke="#2dd4bf"
                            strokeWidth="32"
                            strokeDasharray="48.2 301.6"
                            strokeDashoffset="-223.1"
                          />
                          {/* Slice 4: Health (10%) -> blue-900 */}
                          <circle
                            cx="50"
                            cy="50"
                            r="32"
                            fill="transparent"
                            stroke="#1e3a8a"
                            strokeWidth="32"
                            strokeDasharray="30.2 301.6"
                            strokeDashoffset="-271.3"
                          />
                        </svg>
                      </div>

                      {/* Legend */}
                      <div className="space-y-1.5 text-[11px] w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-xs bg-[#38bdf8] shrink-0" />
                          <span className="font-medium text-slate-700">Roads & Bridges (48%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-xs bg-[#0284c7] shrink-0" />
                          <span className="font-medium text-slate-700">Public Buildings (26%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-xs bg-[#2dd4bf] shrink-0" />
                          <span className="font-medium text-slate-700">Water Works (16%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-xs bg-[#1e3a8a] shrink-0" />
                          <span className="font-medium text-slate-700">Health Facilities (10%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: 6 cols */}
                <div className="lg:col-span-6 space-y-4">
                  {/* WIDGET 4: Consensus Health */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
                    <div className="flex items-center justify-between pb-2">
                      <h3 className="text-sm font-bold text-slate-800">Consensus Health</h3>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0c3975] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                        <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                        <span>Node Agreement: 8/9</span>
                      </div>
                    </div>

                    {/* Consensus Stage Chart */}
                    <div className="mt-3 relative h-32 sm:h-36 w-full">
                      <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible">
                        {/* Grid lines */}
                        <line x1="0" y1="30" x2="400" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="65" x2="400" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="100" x2="400" y2="100" stroke="#f1f5f9" strokeWidth="1" />

                        {/* Yellow wave (Prepare phase) */}
                        <path
                          d="M 10,85 Q 90,65 180,68 T 320,50 T 390,45"
                          fill="none"
                          stroke="#eab308"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Cyan/Blue wave (Pre-prepare & commit phase) */}
                        <path
                          d="M 10,95 Q 110,60 190,30 T 310,65 T 390,40"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Process Stage Arrow Indicators */}
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-700 pt-2 border-t border-slate-100 px-2 sm:px-6">
                        <span>Pre-Prepare</span>
                        <span className="text-slate-400">➔</span>
                        <span>Prepare</span>
                        <span className="text-slate-400">➔</span>
                        <span>Commit</span>
                      </div>
                    </div>
                  </div>

                  {/* ROW WITH 2 CARDS: Latest block & Immutable Ledger */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* WIDGET 5: Latest block */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 pb-2">Latest block</h3>

                        <div className="space-y-1.5 text-xs text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 text-[10px]">▼</span>
                            <span className="text-slate-500 text-[11px]">Block Height:</span>
                            <span className="font-mono font-bold text-slate-900">1642</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 text-[10px]">▼</span>
                            <span className="text-slate-500 text-[11px]">Timestamp:</span>
                            <span className="font-mono text-[10px] text-slate-800 truncate">2026 - 01 - 02 : 10:42 AM</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 text-[10px]">▼</span>
                            <span className="text-slate-500 text-[11px]">Hash:</span>
                            <span className="font-mono text-[10px] text-slate-800 truncate">2F7DBBHJAKSDIWKA867</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100">
                          <div className="text-[11px] font-bold text-slate-700 mb-1.5">Transactions</div>
                          <div className="space-y-1 text-[11px] text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 bg-emerald-600 text-white rounded-xs flex items-center justify-center text-[9px] shrink-0">✓</span>
                              <span className="truncate">Milestone: Road Repair Approved</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 bg-emerald-600 text-white rounded-xs flex items-center justify-center text-[9px] shrink-0">✓</span>
                              <span className="truncate">Inspector Signature: 782C6YH</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 bg-emerald-600 text-white rounded-xs flex items-center justify-center text-[9px] shrink-0">✓</span>
                              <span className="truncate">Budget Approval: Health Center</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 bg-emerald-600 text-white rounded-xs flex items-center justify-center text-[9px] shrink-0">✓</span>
                              <span className="truncate">Signatures: 8/9 Validators</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-right">
                        <button
                          onClick={() => setShowLedgerModal(true)}
                          className="w-full sm:w-auto px-3.5 py-1.5 bg-[#072459] hover:bg-[#051a40] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                        >
                          View Ledger
                        </button>
                      </div>
                    </div>

                    {/* WIDGET 6: Immutable Ledger */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 pb-2">Immutable Ledger</h3>

                        {/* Blockchain timeline spine */}
                        <div className="mt-2 space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-1 before:bg-[#072459]">
                          {/* Block 1642 */}
                          <div className="relative">
                            <div className="absolute -left-6 top-1 w-3 h-3 bg-[#072459] border-2 border-white rounded-xs" />
                            <div className="font-mono text-xs font-bold text-slate-900">Block # 1642</div>
                            <div className="text-[11px] font-semibold text-slate-800">Road Repair Verified</div>
                            <div className="text-[10px] text-slate-500">3:02 PM</div>
                          </div>

                          {/* Block 1641 */}
                          <div className="relative">
                            <div className="absolute -left-6 top-1 w-3 h-3 bg-[#072459] border-2 border-white rounded-xs" />
                            <div className="font-mono text-xs font-bold text-slate-900">Block # 1641</div>
                            <div className="text-[11px] font-semibold text-slate-800">Health Center Approved</div>
                            <div className="text-[10px] text-slate-500">11:42 AM</div>
                          </div>

                          {/* Block 1640 */}
                          <div className="relative">
                            <div className="absolute -left-6 top-1 w-3 h-3 bg-[#072459] border-2 border-white rounded-xs" />
                            <div className="font-mono text-xs font-bold text-slate-900">Block # 1640</div>
                            <div className="text-[11px] font-semibold text-slate-800">School Building Inspection</div>
                            <div className="text-[10px] text-slate-500">9:15 AM</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-right">
                        <button
                          onClick={() => setShowLedgerModal(true)}
                          className="w-full sm:w-auto px-3.5 py-1.5 bg-[#072459] hover:bg-[#051a40] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                        >
                          View Ledger
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- VIEW 2: PROJECT DETAIL (Image 2) */}
            {currentView === 'detail' && (
              <div className="space-y-4">
                {/* Back to Dashboard Button */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0c3975] hover:underline bg-white/80 hover:bg-white px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="hidden sm:inline font-semibold text-slate-700">Status:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      BLOCKED on Validation
                    </span>
                  </div>
                </div>

                {/* Main Hero Card */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-6">
                  {/* Header Title */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Bridge Rehabilitation</h2>
                      <div className="text-sm sm:text-base font-bold text-[#0c3975] mt-0.5">Project ID: CRN - 1467-01</div>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 p-1">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Procurement Details */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#b82222] mb-2">
                      Procurement Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-slate-800">
                      <div>
                        <span className="text-slate-500 font-normal">BUDGET: </span>
                        <span className="font-bold">Php 20, 000, 000.00</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-normal">TIMELINE: </span>
                        <span className="font-bold">18 MONTHS</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-normal">CONTRACTOR: </span>
                        <span className="font-bold uppercase">ABC CORPORATION</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress & Disbursed Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Left: 65% Complete */}
                    <div className="md:col-span-5 bg-slate-50/80 rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center border border-slate-200/60 shadow-inner">
                      <div className="text-5xl sm:text-6xl font-black text-[#0c3975] tracking-tight">65 %</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-600 mt-1 uppercase tracking-wide">Complete</div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-[#0c3975] h-full rounded-full" style={{ width: '65%' }} />
                      </div>
                    </div>

                    {/* Right: Gold Card with Funds Disbursed & Next Milestone */}
                    <div className="md:col-span-7 bg-[#f5c037] text-slate-950 rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-sm border border-amber-400">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-800">Funds Disbursed</div>
                          <div className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">PHP 15,239,000.00</div>
                        </div>

                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-800">Next Milestone</div>
                          <div className="text-base sm:text-lg font-black tracking-tight mt-0.5 uppercase">INSPECTION PHASE</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-amber-600/30 flex items-center justify-between text-xs font-medium">
                        <span>Disbursed via Smart Contract</span>
                        <span className="font-mono text-[11px] font-bold">76.2% of Total Budget</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: PROGRESS REPORT & ACTIVITY LOG */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
                    {/* Left: PROGRESS REPORT */}
                    <div className="md:col-span-7 bg-white rounded-xl p-4 border border-slate-200">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                        PROGRESS REPORT
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                            <span>Phase 1: Mobilization & Procurement</span>
                            <span className="font-bold">100%</span>
                          </div>
                          <div className="h-3.5 w-full bg-slate-100 rounded overflow-hidden">
                            <div className="h-full bg-[#0c3975] rounded" style={{ width: '100%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                            <span>Phase 2: Foundation & Girder Retrofitting</span>
                            <span className="font-bold">95%</span>
                          </div>
                          <div className="h-3.5 w-full bg-slate-100 rounded overflow-hidden">
                            <div className="h-full bg-[#0c3975] rounded" style={{ width: '95%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                            <span>Phase 3: Deck Slab & Pavement Rehabilitation</span>
                            <span className="font-bold">65%</span>
                          </div>
                          <div className="h-3.5 w-full bg-slate-100 rounded overflow-hidden">
                            <div className="h-full bg-[#0c3975] rounded" style={{ width: '65%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                            <span>Phase 4: Safety Railings & Lighting</span>
                            <span className="font-bold">35%</span>
                          </div>
                          <div className="h-3.5 w-full bg-slate-100 rounded overflow-hidden">
                            <div className="h-full bg-[#0c3975] rounded" style={{ width: '35%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                            <span>Phase 5: Final Inspection & Turn-over</span>
                            <span className="font-bold">15%</span>
                          </div>
                          <div className="h-3.5 w-full bg-slate-100 rounded overflow-hidden">
                            <div className="h-full bg-[#0c3975] rounded" style={{ width: '15%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: ACTIVITY LOG */}
                    <div className="md:col-span-5 bg-white rounded-xl overflow-hidden border border-slate-200 flex flex-col">
                      <div className="bg-[#0c3975] text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5">
                        ACTIVITY LOG
                      </div>

                      <div className="p-4 space-y-3.5 text-xs font-medium text-slate-800 flex-1">
                        <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">Milestone update</div>
                            <div className="text-[11px] text-slate-500">Deck slab concrete curing verified</div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">10:42 AM</span>
                        </div>

                        <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">Fund Release</div>
                            <div className="text-[11px] text-slate-500">Tranche 3 released after QA Sign-off</div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">Yesterday</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">Site Inspection</div>
                            <div className="text-[11px] text-slate-500">Structural integrity validation pass</div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">3 days ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ------------------------------------------------------------- MOBILE STICKY BOTTOM BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#030d20] border-t border-blue-900/60 px-4 py-2 flex items-center justify-around text-slate-400 text-[10px] font-medium shadow-2xl backdrop-blur-md">
        <button
          onClick={() => {
            setCurrentView('dashboard')
            setActiveSidebar('overview')
          }}
          className={`flex flex-col items-center gap-0.5 p-1 transition-colors ${
            currentView === 'dashboard' ? 'text-sky-400 font-bold' : 'hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentView('detail')}
          className={`flex flex-col items-center gap-0.5 p-1 transition-colors ${
            currentView === 'detail' ? 'text-amber-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Project (65%)</span>
        </button>

        <button
          onClick={() => setShowLedgerModal(true)}
          className="flex flex-col items-center gap-0.5 p-1 hover:text-white transition-colors"
        >
          <Database className="w-4 h-4 text-purple-400" />
          <span>Ledger</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1 hover:text-white transition-colors"
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </nav>

      {/* ------------------------------------------------------------- MODAL: IMMUTABLE LEDGER FULL VIEW */}
      {showLedgerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
            {/* Header */}
            <div className="bg-[#041026] text-white px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold">CivicaX Immutable Blockchain Ledger</h3>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                    Hash Chain • Consensus Height 1642
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Filter Pills */}
            <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5 sm:gap-2 text-xs overflow-x-auto">
              <span className="font-semibold text-slate-600 text-[11px]">Filter:</span>
              {(['all', 'milestones', 'budget', 'validation'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLedgerFilter(filter)}
                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full capitalize font-medium text-[11px] transition-colors shrink-0 ${
                    ledgerFilter === filter
                      ? 'bg-[#0c3975] text-white font-bold'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 text-xs">
              {ledgerBlocks
                .filter((blk) => ledgerFilter === 'all' || blk.type === ledgerFilter)
                .map((blk) => (
                  <div key={blk.id} className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0c3975] bg-blue-100/70 px-2 py-0.5 rounded">
                            Block #{blk.id}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{blk.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">Authorized Department: {blk.dept}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        {blk.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono text-slate-600 bg-white p-2 sm:p-2.5 rounded border border-slate-200/80">
                      <div className="truncate">
                        <span className="text-slate-400">Current Hash: </span>
                        <span className="text-slate-800 font-bold">{blk.hash}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400">Previous Hash: </span>
                        <span className="text-slate-800">{blk.prevHash}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Consensus: </span>
                        <span className="text-emerald-700 font-semibold">{blk.signatures}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Timestamp: </span>
                        <span>{blk.date} • {blk.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px]">PBFT consensus verified</span>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="px-4 py-1.5 bg-[#0c3975] hover:bg-[#072459] text-white font-semibold rounded-lg transition-colors text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
