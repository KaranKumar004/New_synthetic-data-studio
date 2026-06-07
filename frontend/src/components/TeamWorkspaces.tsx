"use client";

import { useState } from "react";
import { Users, PlusCircle, Mail, UserPlus, ShieldAlert, Sparkles, Building, Layers } from "lucide-react";

export default function TeamWorkspaces() {
  const [workspaces, setWorkspaces] = useState([
    { id: "ws_1", name: "Personal Workspace", owner: "You", type: "Personal" },
    { id: "ws_2", name: "AI Training Dataset Team", owner: "You", type: "Shared" },
    { id: "ws_3", name: "E-Commerce Analytics Unit", owner: "Sarah Connor", type: "Shared" }
  ]);
  const [selectedWs, setSelectedWs] = useState("ws_1");
  const [newWsName, setNewWsName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Collaborator");

  const [members, setMembers] = useState<Record<string, any[]>>({
    ws_1: [
      { email: "you@example.com", role: "Owner", status: "Active" }
    ],
    ws_2: [
      { email: "you@example.com", role: "Owner", status: "Active" },
      { email: "sarah.connor@sky.net", role: "Admin", status: "Active" },
      { email: "john.doe@gmail.com", role: "Collaborator", status: "Active" },
      { email: "bobby@analytics.org", role: "Viewer", status: "Pending" }
    ],
    ws_3: [
      { email: "sarah.connor@sky.net", role: "Owner", status: "Active" },
      { email: "you@example.com", role: "Collaborator", status: "Active" },
      { email: "kyle.reese@resistance.net", role: "Collaborator", status: "Active" }
    ]
  });

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    const wsId = `ws_${Date.now()}`;
    const newWs = {
      id: wsId,
      name: newWsName,
      owner: "You",
      type: "Shared"
    };
    setWorkspaces([...workspaces, newWs]);
    setMembers({
      ...members,
      [wsId]: [{ email: "you@example.com", role: "Owner", status: "Active" }]
    });
    setSelectedWs(wsId);
    setNewWsName("");
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const newMember = {
      email: inviteEmail,
      role: inviteRole,
      status: "Pending"
    };
    const wsMembers = members[selectedWs] || [];
    setMembers({
      ...members,
      [selectedWs]: [...wsMembers, newMember]
    });
    setInviteEmail("");
  };

  const currentMembers = members[selectedWs] || [];
  const activeWorkspace = workspaces.find((w) => w.id === selectedWs);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-6 pb-20 md:pb-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Team Workspaces</h1>
        <p className="text-muted text-sm mt-1 font-medium">
          Collaborate on shared schemas, templates, and quotas with team workspaces.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Workspace select sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel border border-card-border p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
              <Building className="h-4 w-4 text-primary" />
              Your Workspaces
            </h2>

            <div className="space-y-2">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setSelectedWs(ws.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border font-semibold flex items-center justify-between cursor-pointer ${
                    selectedWs === ws.id
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/10"
                      : "bg-muted-bg hover:bg-muted-bg/85 border-border text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate">{ws.name}</span>
                  </div>
                  <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                    selectedWs === ws.id ? "bg-white/20 text-white" : "bg-card text-muted"
                  }`}>
                    {ws.type}
                  </span>
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateWorkspace} className="pt-3 border-t border-border space-y-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-muted block mb-1">
                New Workspace
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Frontend Team"
                  className="flex-1 px-3 py-2 bg-muted-bg border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/25 outline-hidden text-xs transition-all"
                  required
                />
                <button
                  type="submit"
                  className="p-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Workspace details and members */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel border border-card-border p-6 rounded-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  Active Workspace
                </span>
                <h2 className="text-xl font-bold text-foreground mt-2">{activeWorkspace?.name}</h2>
                <p className="text-xs text-muted mt-0.5 font-medium">Owned by: {activeWorkspace?.owner}</p>
              </div>
            </div>

            {/* Invite form */}
            {activeWorkspace?.type === "Shared" && (
              <form onSubmit={handleInviteMember} className="space-y-3 p-4 bg-muted-bg rounded-xl border border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-secondary" />
                  Invite Collaborator
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="team-member@company.com"
                      className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/25 outline-hidden text-xs transition-all"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="px-3 py-2 bg-card border border-border rounded-xl text-xs font-bold outline-hidden cursor-pointer"
                    >
                      <option>Collaborator</option>
                      <option>Admin</option>
                      <option>Viewer</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/15 cursor-pointer shrink-0"
                    >
                      Send Invitation
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Members Registry */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                Workspace Members Registry ({currentMembers.length})
              </h3>

              <div className="divide-y divide-border text-xs font-medium">
                {currentMembers.map((m) => (
                  <div key={m.email} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      {/* Fake avatar using initials */}
                      <div className="h-8 w-8 rounded-full bg-linear-to-tr from-primary to-secondary text-white font-bold flex items-center justify-center text-[10px]">
                        {m.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{m.email}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          m.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {m.status}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-muted-bg text-foreground border border-border rounded-lg font-bold">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info note */}
          {activeWorkspace?.type === "Personal" && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs flex items-start gap-2.5 leading-relaxed font-semibold">
              <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <p>
                Personal workspaces do not support team invitations. To invite developers and share generated schemas, create or select a <span className="underline">Shared Workspace</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
